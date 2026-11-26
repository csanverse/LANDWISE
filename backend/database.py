import json
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


# ==========================================
# KONFIGURASI DATABASE
# ==========================================

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

if not all([DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD]):
    raise RuntimeError(
        "Konfigurasi database belum lengkap. Periksa file .env"
    )

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ==========================================
# KONEKSI DATABASE
# ==========================================

def test_connection():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))
        return result.scalar()


# ==========================================
# DATA PERTANAHAN
# ==========================================

def get_total_persil():
    query = text("""
        SELECT COUNT(*)
        FROM pertanahan.persil_tanah;
    """)

    with engine.connect() as connection:
        result = connection.execute(query)
        return result.scalar()


def get_public_persil(limit=10):
    query = text("""
        SELECT
            id,
            luas_tanah,
            kode_zona,
            penggunaan_tanah,
            penggunaan_bangunan,
            ST_AsGeoJSON(geom) AS geometry
        FROM pertanahan.v_persil_publik
        LIMIT :limit;
    """)

    with engine.connect() as connection:
        result = connection.execute(query, {"limit": limit})
        rows = []

        for row in result.mappings():
            item = dict(row)

            if item["geometry"]:
                item["geometry"] = json.loads(item["geometry"])

            rows.append(item)

        return rows


def get_public_persil_by_id(persil_id):
    query = text("""
        SELECT
            id,
            luas_tanah,
            kode_zona,
            penggunaan_tanah,
            penggunaan_bangunan,
            ST_AsGeoJSON(geom) AS geometry
        FROM pertanahan.v_persil_publik
        WHERE id = :persil_id;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"persil_id": persil_id}
        )

        row = result.mappings().first()

        if row is None:
            return None

        item = dict(row)

        if item["geometry"]:
            item["geometry"] = json.loads(item["geometry"])

        return item


def get_government_persil_by_id(persil_id):
    query = text("""
        SELECT
            id,
            nop,
            letak_objek,
            nama_wajib_pajak,
            status_subjek,
            pekerjaan,
            alamat_wajib_pajak,
            luas_tanah,
            luas_bangunan,
            penggunaan_tanah,
            penggunaan_bangunan,
            jumlah_objek,
            kode_zona,
            njop_bumi,
            njop_bangunan,
            njop_total,
            pbb_terutang,
            nilai_znt,
            status_pembayaran
        FROM perpajakan.v_data_pbb_pemerintah
        WHERE id = :persil_id;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"persil_id": persil_id}
        )

        row = result.mappings().first()

        if row is None:
            return None

        return dict(row)



def search_public_persil(keyword, limit=10):
    query = text("""
        SELECT
            id,
            luas_tanah,
            kode_zona,
            penggunaan_tanah,
            penggunaan_bangunan,
            ST_AsGeoJSON(geom) AS geometry
        FROM pertanahan.v_persil_publik
        WHERE
            CAST(id AS TEXT) ILIKE :keyword

            OR COALESCE(kode_zona, '') ILIKE :keyword

            OR COALESCE(penggunaan_tanah, '') ILIKE :keyword

            OR COALESCE(penggunaan_bangunan, '') ILIKE :keyword

            OR (
                :numeric_keyword <> ''
                AND REGEXP_REPLACE(
                    COALESCE(luas_tanah::TEXT, ''),
                    '[^0-9]',
                    '',
                    'g'
                ) ILIKE :numeric_keyword
            )

        ORDER BY id
        LIMIT :limit;
    """)

    search_keyword = f"%{keyword}%"

    # Menghilangkan titik, koma, dan karakter nonangka
    # agar pencarian luas tanah lebih fleksibel.
    numeric_keyword = "".join(
        character
        for character in keyword
        if character.isdigit()
    )

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "keyword": search_keyword,
                "numeric_keyword": f"%{numeric_keyword}%",
                "limit": limit
            }
        )

        rows = []

        for row in result.mappings():
            item = dict(row)

            if item["geometry"]:
                item["geometry"] = json.loads(item["geometry"])

            rows.append(item)

        return rows


def get_public_persil_paginated(page=1, per_page=10):
    offset = (page - 1) * per_page

    query = text("""
        SELECT
            id,
            luas_tanah,
            kode_zona,
            penggunaan_tanah,
            penggunaan_bangunan,
            ST_AsGeoJSON(geom) AS geometry
        FROM pertanahan.v_persil_publik
        ORDER BY id
        LIMIT :per_page
        OFFSET :offset;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "per_page": per_page,
                "offset": offset
            }
        )

        rows = []

        for row in result.mappings():
            item = dict(row)

            if item["geometry"]:
                item["geometry"] = json.loads(item["geometry"])

            rows.append(item)

        return rows


# ==========================================
# KUALITAS DATA PERTANAHAN
# ==========================================

def get_public_data_quality():
    query = text("""
        SELECT
            COUNT(*) AS total_persil,

            COUNT(*) FILTER (
                WHERE luas_tanah IS NULL
            ) AS luas_kosong,

            COUNT(*) FILTER (
                WHERE kode_zona IS NULL
            ) AS zona_kosong,

            COUNT(*) FILTER (
                WHERE penggunaan_tanah IS NULL
            ) AS penggunaan_tanah_kosong,

            COUNT(*) FILTER (
                WHERE penggunaan_bangunan IS NULL
            ) AS penggunaan_bangunan_kosong

        FROM pertanahan.v_persil_publik;
    """)

    with engine.connect() as connection:
        result = connection.execute(query)
        return dict(result.mappings().first())


def get_building_usage_distribution():
    query = text("""
        SELECT
            COALESCE(
                NULLIF(TRIM(penggunaan_tanah), ''),
                'TIDAK DIISI'
            ) AS penggunaan_tanah,

            COUNT(*) AS total_persil,

            COUNT(*) FILTER (
                WHERE penggunaan_bangunan IS NULL
                   OR TRIM(penggunaan_bangunan) = ''
            ) AS penggunaan_bangunan_kosong,

            COUNT(*) FILTER (
                WHERE penggunaan_bangunan IS NOT NULL
                  AND TRIM(penggunaan_bangunan) <> ''
            ) AS penggunaan_bangunan_terisi

        FROM pertanahan.v_persil_publik
        GROUP BY 1
        ORDER BY total_persil DESC;
    """)

    with engine.connect() as connection:
        result = connection.execute(query)

        return [
            dict(row)
            for row in result.mappings()
        ]


# ==========================================
# AUTENTIKASI DAN PENGELOLAAN AKUN
# ==========================================

def get_user_by_username(username):
    query = text("""
        SELECT
            a.id_akun,
            a.id_peran,
            a.nama_lengkap,
            a.username,
            a.email,
            a.password_hash,
            a.status_akun,
            a.firebase_uid,
            p.kode_peran,
            p.nama_peran
        FROM pengguna.akun a
        JOIN pengguna.peran p
            ON a.id_peran = p.id_peran
        WHERE
            LOWER(a.username) = LOWER(:username)
            OR LOWER(a.email) = LOWER(:username)
        LIMIT 1;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"username": username}
        )

        row = result.mappings().first()
        return dict(row) if row else None


def get_user_by_firebase_uid(firebase_uid):
    """
    Mencari profil pengguna berdasarkan Firebase UID.
    """

    query = text("""
        SELECT
            a.id_akun,
            a.id_peran,
            a.nama_lengkap,
            a.username,
            a.email,
            a.status_akun,
            a.firebase_uid,
            p.kode_peran,
            p.nama_peran
        FROM pengguna.akun a
        JOIN pengguna.peran p
            ON a.id_peran = p.id_peran
        WHERE a.firebase_uid = :firebase_uid
        LIMIT 1;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"firebase_uid": firebase_uid}
        )

        row = result.mappings().first()
        return dict(row) if row else None


def get_user_by_email(email):
    query = text("""
        SELECT id_akun
        FROM pengguna.akun
        WHERE LOWER(email) = LOWER(:email);
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"email": email}
        )

        return result.first() is not None


def get_user_by_username_only(username):
    query = text("""
        SELECT id_akun
        FROM pengguna.akun
        WHERE LOWER(username) = LOWER(:username);
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"username": username}
        )

        return result.first() is not None


def create_firebase_user(
    firebase_uid,
    nama_lengkap,
    username,
    email
):
    """
    Membuat profil pengguna baru yang telah diautentikasi Firebase.

    Pengguna baru otomatis mendapatkan peran MASYARAKAT.
    Password dikelola Firebase, bukan PostgreSQL.
    """

    query = text("""
        INSERT INTO pengguna.akun (
            id_peran,
            nama_lengkap,
            username,
            email,
            password_hash,
            status_akun,
            firebase_uid
        )
        SELECT
            id_peran,
            :nama_lengkap,
            :username,
            :email,
            NULL,
            'AKTIF',
            :firebase_uid
        FROM pengguna.peran
        WHERE kode_peran = 'MASYARAKAT'
        RETURNING id_akun;
    """)

    with engine.begin() as connection:
        result = connection.execute(
            query,
            {
                "firebase_uid": firebase_uid,
                "nama_lengkap": nama_lengkap,
                "username": username,
                "email": email
            }
        )

        row = result.first()

        return row[0] if row else None


# Fungsi lama dipertahankan untuk kompatibilitas.
# Registrasi baru diarahkan melalui Firebase.

def create_user(
    nama_lengkap,
    username,
    email,
    password_hash
):
    query = text("""
        INSERT INTO pengguna.akun (
            id_peran,
            nama_lengkap,
            username,
            email,
            password_hash,
            status_akun
        )
        SELECT
            id_peran,
            :nama_lengkap,
            :username,
            :email,
            :password_hash,
            'AKTIF'
        FROM pengguna.peran
        WHERE kode_peran = 'MASYARAKAT'
        RETURNING id_akun;
    """)

    with engine.begin() as connection:
        result = connection.execute(
            query,
            {
                "nama_lengkap": nama_lengkap,
                "username": username,
                "email": email,
                "password_hash": password_hash
            }
        )

        row = result.first()
        return row[0] if row else None


def update_last_login(id_akun):
    query = text("""
        UPDATE pengguna.akun
        SET terakhir_login = CURRENT_TIMESTAMP
        WHERE id_akun = :id_akun;
    """)

    with engine.begin() as connection:
        connection.execute(
            query,
            {"id_akun": id_akun}
        )


def create_activity_log(
    id_akun,
    aktivitas,
    modul=None,
    keterangan=None
):
    query = text("""
        INSERT INTO sistem.log_aktivitas (
            id_akun,
            aktivitas,
            modul,
            keterangan
        )
        VALUES (
            :id_akun,
            :aktivitas,
            :modul,
            :keterangan
        );
    """)

    with engine.begin() as connection:
        connection.execute(
            query,
            {
                "id_akun": id_akun,
                "aktivitas": aktivitas,
                "modul": modul,
                "keterangan": keterangan
            }
        )


# ==========================================
# DASHBOARD STATISTIK LANDWISE
# ==========================================

def get_dashboard_statistics():

    query_total = text("""
        SELECT
            COUNT(*) AS total_persil,

            COALESCE(
                SUM(
                    CASE
                        WHEN TRIM(luas_tanah) ~ '^[0-9.]+$'
                        THEN NULLIF(
                            REPLACE(TRIM(luas_tanah), '.', ''),
                            ''
                        )::NUMERIC
                        ELSE NULL
                    END
                ),
                0
            ) AS total_luas_tanah,

            COUNT(*) FILTER (
                WHERE luas_tanah IS NULL
            ) AS luas_kosong,

            COUNT(*) FILTER (
                WHERE kode_zona IS NULL
            ) AS zona_kosong,

            COUNT(*) FILTER (
                WHERE penggunaan_tanah IS NULL
            ) AS penggunaan_tanah_kosong

        FROM pertanahan.v_persil_publik;
    """)

    query_penggunaan = text("""
        SELECT
            COALESCE(
                penggunaan_tanah,
                'Tidak Diketahui'
            ) AS penggunaan_tanah,

            COUNT(*) AS jumlah_persil

        FROM pertanahan.v_persil_publik
        GROUP BY penggunaan_tanah
        ORDER BY jumlah_persil DESC;
    """)

    query_zona = text("""
        SELECT
            COALESCE(
                kode_zona,
                'Tidak Diketahui'
            ) AS kode_zona,

            COUNT(*) AS jumlah_persil

        FROM pertanahan.v_persil_publik
        GROUP BY kode_zona
        ORDER BY jumlah_persil DESC;
    """)

    with engine.connect() as connection:

        total_result = connection.execute(query_total)
        total = dict(total_result.mappings().first())

        penggunaan_result = connection.execute(query_penggunaan)
        penggunaan = [
            dict(row)
            for row in penggunaan_result.mappings().all()
        ]

        zona_result = connection.execute(query_zona)
        zona = [
            dict(row)
            for row in zona_result.mappings().all()
        ]

    return {
        "total_persil": total["total_persil"],

        "total_luas_tanah": float(
            total["total_luas_tanah"]
        ),

        "data_kosong": {
            "luas_tanah": total["luas_kosong"],
            "kode_zona": total["zona_kosong"],
            "penggunaan_tanah": total["penggunaan_tanah_kosong"]
        },

        "berdasarkan_penggunaan_tanah": penggunaan,

        "berdasarkan_zona": zona
    }