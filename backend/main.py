
import json
import math
import os

from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from pbb_data import get_registered_pbb


from fastapi import (
    FastAPI,
    Query,
    Depends,
    HTTPException,
    status
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.exc import IntegrityError

from database import (
    test_connection,
    get_total_persil,
    get_public_persil,
    get_public_persil_by_id,
    get_government_persil_by_id,
    search_public_persil,
    get_public_persil_paginated,
    get_public_data_quality,
    get_dashboard_statistics,
    get_user_by_email,
    get_user_by_firebase_uid,
    create_firebase_user,
    update_last_login,
    create_activity_log
)

from firebase_auth import verify_firebase_token


# ==================================================
# KONFIGURASI FASTAPI
# ==================================================

app = FastAPI(
    title="LANDWISE API",
    description="Land Information and Spatial Web System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "https://landwise-76583.web.app",
        "https://landwise-76583.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

bearer_scheme = HTTPBearer(auto_error=False)


# ==================================================
# AUTENTIKASI FIREBASE
# ==================================================

def get_firebase_claims(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    """
    Memverifikasi Firebase ID Token dari request.
    """

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token autentikasi diperlukan",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Skema autentikasi tidak valid"
        )

    return verify_firebase_token(credentials.credentials)


def get_current_user(
    claims=Depends(get_firebase_claims)
):
    """
    Memverifikasi Firebase ID Token dan mengambil profil
    pengguna berdasarkan Firebase UID.

    Akun Guest menggunakan Firebase Anonymous Authentication
    sehingga tidak membutuhkan profil di PostgreSQL.
    """

    firebase_uid = claims.get("uid")

    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase UID tidak ditemukan"
        )

    firebase_info = claims.get("firebase") or {}
    sign_in_provider = firebase_info.get("sign_in_provider")

    # ----------------------------------------------
    # AKUN GUEST
    # ----------------------------------------------

    if sign_in_provider == "anonymous":
        return {
            "is_guest": True,
            "firebase_uid": firebase_uid,
            "kode_peran": "GUEST",
            "nama_peran": "Pengunjung",
            "nama_lengkap": "Guest",
            "email": None,
            "id_akun": None,
            "status_akun": "AKTIF"
        }

    # ----------------------------------------------
    # AKUN TERDAFTAR
    # ----------------------------------------------

    user = get_user_by_firebase_uid(firebase_uid)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Profil pengguna belum tersinkronisasi. "
                "Silakan sinkronisasi akun terlebih dahulu."
            )
        )

    if user.get("status_akun") != "AKTIF":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun tidak aktif"
        )

    return user


# ==================================================
# PEMERIKSAAN HAK AKSES BERDASARKAN ROLE
# ==================================================

def require_roles(*allowed_roles):
    """
    Memeriksa hak akses berdasarkan role pengguna.

    Guest dipetakan sebagai role GUEST dan hanya dapat
    mengakses endpoint yang secara eksplisit mengizinkan GUEST.
    """

    def role_checker(
        current_user=Depends(get_current_user)
    ):
        if current_user.get("is_guest"):
            user_role = "GUEST"
        else:
            user_role = current_user.get("kode_peran")

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki hak akses ke fitur ini"
            )

        return current_user

    return role_checker


# ==================================================
# BERANDA DAN PEMERIKSAAN SISTEM
# ==================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to LANDWISE API!",
        "status": "Backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/database")
def database_check():
    try:
        version = test_connection()

        return {
            "status": "connected",
            "database": "landwise_db",
            "postgresql_version": version
        }

    except Exception as error:
        print(f"Database connection error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Koneksi database gagal"
        )


# ==================================================
# SINKRONISASI AKUN FIREBASE
# ==================================================

@app.post("/auth/sync")
def sync_firebase_user(
    claims=Depends(get_firebase_claims)
):
    """
    Menyinkronkan akun Firebase yang sudah terverifikasi
    dengan profil pengguna di PostgreSQL.

    Pengguna baru otomatis mendapatkan peran MASYARAKAT.
    Akun Guest tidak membutuhkan sinkronisasi.
    """

    firebase_uid = claims.get("uid")
    email = claims.get("email")
    email_verified = claims.get("email_verified", False)

    firebase_info = claims.get("firebase") or {}
    sign_in_provider = firebase_info.get("sign_in_provider")

    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase UID tidak ditemukan"
        )

    if sign_in_provider == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun Guest tidak memerlukan sinkronisasi profil"
        )

    if not email or not email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email harus diverifikasi terlebih dahulu"
        )

    email = email.strip().lower()

    # Periksa profil berdasarkan Firebase UID.
    user = get_user_by_firebase_uid(firebase_uid)

    if user is not None:

        if user.get("status_akun") != "AKTIF":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun tidak aktif"
            )

        update_last_login(user["id_akun"])

        return {
            "status": "success",
            "message": "Profil pengguna sudah tersinkronisasi",
            "user": {
                "id_akun": user["id_akun"],
                "nama_lengkap": user["nama_lengkap"],
                "username": user["username"],
                "email": user["email"],
                "role": user["kode_peran"],
                "nama_peran": user["nama_peran"]
            }
        }

    # Tidak menghubungkan email secara otomatis
    # dengan akun lama untuk mencegah pengambilalihan role.
    existing_user = get_user_by_email(email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email sudah terdaftar pada profil LANDWISE lain. "
                "Hubungi administrator untuk menghubungkan akun Firebase."
            )
        )

    nama_lengkap = (
        claims.get("name")
        or email.split("@")[0]
    ).strip()

    username = f"firebase_{firebase_uid[:40]}"

    try:
        new_user_id = create_firebase_user(
            firebase_uid=firebase_uid,
            nama_lengkap=nama_lengkap,
            username=username,
            email=email
        )

    except IntegrityError:
        # Periksa ulang jika terjadi sinkronisasi bersamaan.
        user = get_user_by_firebase_uid(firebase_uid)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Gagal membuat profil. "
                    "Periksa kemungkinan konflik akun."
                )
            )

        new_user_id = user["id_akun"]

    if new_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Role MASYARAKAT tidak ditemukan"
        )

    user = get_user_by_firebase_uid(firebase_uid)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profil berhasil dibuat tetapi gagal dibaca kembali"
        )

    if user.get("status_akun") != "AKTIF":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun tidak aktif"
        )

    update_last_login(user["id_akun"])

    create_activity_log(
        id_akun=user["id_akun"],
        aktivitas="REGISTRASI",
        modul="AUTENTIKASI",
        keterangan=(
            "Registrasi dan sinkronisasi akun melalui Firebase"
        )
    )

    return {
        "status": "success",
        "message": "Profil Firebase berhasil disinkronisasikan",
        "user": {
            "id_akun": user["id_akun"],
            "nama_lengkap": user["nama_lengkap"],
            "username": user["username"],
            "email": user["email"],
            "role": user["kode_peran"],
            "nama_peran": user["nama_peran"]
        }
    }


# ==================================================
# PROFIL PENGGUNA LOGIN
# ==================================================

@app.get("/auth/me")
def get_my_profile(
    current_user=Depends(get_current_user)
):
    if current_user.get("is_guest"):
        return {
            "status": "success",
            "user": {
                "nama_lengkap": "Guest",
                "email": None,
                "role": "GUEST",
                "nama_peran": "Pengunjung",
                "status_akun": "AKTIF"
            }
        }

    return {
        "status": "success",
        "user": {
            "id_akun": current_user["id_akun"],
            "nama_lengkap": current_user["nama_lengkap"],
            "username": current_user["username"],
            "email": current_user["email"],
            "role": current_user["kode_peran"],
            "nama_peran": current_user["nama_peran"],
            "status_akun": current_user["status_akun"]
        }
    }


# ==================================================
# TES HAK AKSES ADMIN
# ==================================================

@app.get("/auth/admin")
def admin_access(
    current_user=Depends(
        require_roles("ADMIN")
    )
):
    return {
        "status": "success",
        "message": "Akses administrator berhasil",
        "role": current_user["kode_peran"]
    }


# ==================================================
# TES HAK AKSES PEMERINTAH
# ==================================================

@app.get("/auth/government")
def government_access(
    current_user=Depends(
        require_roles("ADMIN", "PEMERINTAH")
    )
):
    return {
        "status": "success",
        "message": "Akses pemerintah berhasil",
        "role": current_user["kode_peran"]
    }


# ==================================================
# TES HAK AKSES MASYARAKAT DAN GUEST
# ==================================================

@app.get("/auth/public")
def public_access(
    current_user=Depends(
        require_roles(
            "ADMIN",
            "PEMERINTAH",
            "MASYARAKAT",
            "GUEST"
        )
    )
):
    user_role = (
        "GUEST"
        if current_user.get("is_guest")
        else current_user["kode_peran"]
    )

    return {
        "status": "success",
        "message": "Akses pengguna berhasil",
        "role": user_role
    }


# ==================================================
# STATISTIK DASHBOARD
# ADMIN, PEMERINTAH, MASYARAKAT, DAN GUEST
# ==================================================

@app.get("/dashboard/statistics")
def dashboard_statistics(
    current_user=Depends(
        require_roles(
            "ADMIN",
            "PEMERINTAH",
            "MASYARAKAT",
            "GUEST"
        )
    )
):
    try:
        statistics = get_dashboard_statistics()

        return {
            "status": "success",
            "data": statistics
        }

    except Exception as error:
        print(f"Dashboard statistics error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil statistik dashboard"
        )


# ==================================================
# DATA PBB
# KHUSUS PENGGUNA TERDAFTAR, BUKAN GUEST
# ==================================================

@app.get("/pbb")
def registered_pbb(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    keyword: str = Query(default="", max_length=100),
    current_user=Depends(get_current_user)
):
    # Guest tidak diperbolehkan mengakses data PBB.
    if current_user.get("is_guest"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data PBB hanya dapat diakses oleh pengguna terdaftar"
        )

    try:
        result = get_registered_pbb(
            page=page,
            per_page=per_page,
            keyword=keyword
        )

        total_data = result["total_data"]

        return {
            "status": "success",
            "current_page": page,
            "per_page": per_page,
            "total_data": total_data,
            "total_pages": (
                math.ceil(total_data / per_page)
                if total_data > 0 else 0
            ),
            "data": result["data"]
        }

    except Exception as error:
        print(f"Registered PBB error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil data PBB"
        )


# ==================================================
# DATA PERSIL PUBLIK
# ==================================================

@app.get("/persil/count")
def persil_count():
    try:
        total = get_total_persil()

        return {
            "status": "success",
            "total_persil": total
        }

    except Exception as error:
        print(f"Persil count error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil jumlah persil"
        )


@app.get("/persil/quality")
def persil_data_quality():
    try:
        quality = get_public_data_quality()

        return {
            "status": "success",
            "data_quality": quality
        }

    except Exception as error:
        print(f"Persil data quality error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal memeriksa kualitas data"
        )


@app.get("/persil")
def public_persil(
    limit: int = Query(default=10, ge=1, le=100)
):
    try:
        data = get_public_persil(limit)

        return {
            "status": "success",
            "total_data": len(data),
            "data": data
        }

    except Exception as error:
        print(f"Public persil error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil data persil"
        )


@app.get("/persil/search")
def search_persil(
    keyword: str = Query(..., min_length=1),
    limit: int = Query(default=10, ge=1, le=100)
):
    try:
        data = search_public_persil(keyword, limit)

        return {
            "status": "success",
            "keyword": keyword,
            "total_data": len(data),
            "data": data
        }

    except Exception as error:
        print(f"Search persil error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Pencarian persil gagal"
        )


@app.get("/persil/page")
def persil_pagination(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100)
):
    try:
        total = get_total_persil()
        data = get_public_persil_paginated(page, per_page)

        total_pages = (
            math.ceil(total / per_page)
            if total > 0
            else 0
        )

        return {
            "status": "success",
            "current_page": page,
            "per_page": per_page,
            "total_data": total,
            "total_pages": total_pages,
            "has_previous": page > 1,
            "has_next": page < total_pages,
            "data_count": len(data),
            "data": data
        }

    except Exception as error:
        print(f"Persil pagination error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil halaman persil"
        )


# ==================================================
# DETAIL PERSIL PUBLIK
# ==================================================

@app.get("/persil/{persil_id}")
def persil_detail(
    persil_id: int
):
    try:
        data = get_public_persil_by_id(persil_id)

        if data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persil tidak ditemukan"
            )

        return {
            "status": "success",
            "data": data
        }

    except HTTPException:
        raise

    except Exception as error:
        print(f"Public persil detail error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil detail persil"
        )


# ==================================================
# DETAIL PERSIL PEMERINTAH
# HANYA ADMIN DAN PEMERINTAH
# ==================================================

@app.get("/government/persil/{persil_id}")
def government_persil_detail(
    persil_id: int,
    current_user=Depends(
        require_roles("ADMIN", "PEMERINTAH")
    )
):
    try:
        data = get_government_persil_by_id(persil_id)

        if data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persil tidak ditemukan"
            )

        create_activity_log(
            id_akun=current_user["id_akun"],
            aktivitas="LIHAT_DETAIL_PERSIL",
            modul="PERTANAHAN",
            keterangan=f"Mengakses detail persil ID {persil_id}"
        )

        return {
            "status": "success",
            "data": data
        }

    except HTTPException:
        raise

    except Exception as error:
        print(f"Government persil detail error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil detail persil pemerintah"
        )


# ==================================================
# PROXY GETFEATUREINFO GEOSERVER
# HANYA LAYER PUBLIK
# ==================================================

@app.get("/map/feature-info")
def map_feature_info(
    bbox: str = Query(..., min_length=3, max_length=200),
    width: int = Query(..., ge=1, le=10000),
    height: int = Query(..., ge=1, le=10000),
    x: int = Query(..., ge=0),
    y: int = Query(..., ge=0)
):
    """
    Mengambil ID persil dari GetFeatureInfo
    pada layer publik GeoServer.
    """

    if x >= width or y >= height:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Koordinat klik berada di luar ukuran peta"
        )

    try:
        bbox_values = [
            float(value.strip())
            for value in bbox.split(",")
        ]

        if len(bbox_values) != 4:
            raise ValueError

        if not all(
            math.isfinite(value) and abs(value) < 1e9
            for value in bbox_values
        ):
            raise ValueError

        if bbox_values[0] >= bbox_values[2]:
            raise ValueError

        if bbox_values[1] >= bbox_values[3]:
            raise ValueError

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format BBOX tidak valid"
        )

    geoserver_url = os.getenv(
    "GEOSERVER_WMS_URL",
    "http://localhost:8080/geoserver/landwise/wms"
)

    params = {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetFeatureInfo",
        "layers": "landwise:v_persil_publik",
        "query_layers": "landwise:v_persil_publik",
        "styles": "",
        "bbox": ",".join(
            str(value) for value in bbox_values
        ),
        "width": width,
        "height": height,
        "srs": "EPSG:4326",
        "format": "image/png",
        "info_format": "application/json",
        "feature_count": 1,
        "x": x,
        "y": y
    }

    request_url = (
        f"{geoserver_url}?{urlencode(params)}"
    )

    request = Request(
        request_url,
        headers={
            "Accept": "application/json"
        },
        method="GET"
    )

    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(
                response.read().decode("utf-8")
            )

    except HTTPError as error:
        print(f"GeoServer HTTP error: {error.code}")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"GeoServer mengembalikan HTTP {error.code}"
            )
        )

    except (
        URLError,
        TimeoutError,
        json.JSONDecodeError
    ) as error:
        print(f"GeoServer connection error: {error}")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Tidak dapat mengambil informasi dari GeoServer"
            )
        )

    features = (
        result.get("features", [])
        if isinstance(result, dict)
        else []
    )

    if not features:
        return {
            "status": "success",
            "found": False,
            "persil_id": None
        }

    properties = (
        features[0].get("properties", {}) or {}
    )

    raw_id = properties.get("id")

    if raw_id is None:
        raw_id = features[0].get("id")

    try:
        persil_id = int(raw_id)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "GeoServer tidak mengembalikan ID persil yang valid"
            )
        )

    return {
        "status": "success",
        "found": True,
        "persil_id": persil_id
    }
