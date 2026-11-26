
from sqlalchemy import text

from database import engine


def get_registered_pbb(page=1, per_page=10, keyword=None):
    """
    Mengambil data PBB untuk pengguna yang sudah terdaftar.
    Data hanya dipanggil melalui endpoint backend yang terlindungi.
    """

    offset = (page - 1) * per_page

    where_clause = ""

    params = {
        "limit": per_page,
        "offset": offset,
    }

    if keyword and keyword.strip():
        where_clause = """
            WHERE
                COALESCE(CAST(nop AS TEXT), '') ILIKE :keyword
                OR COALESCE(letak_objek, '') ILIKE :keyword
                OR COALESCE(nama_wajib_pajak, '') ILIKE :keyword
        """
        params["keyword"] = f"%{keyword.strip()}%"

    count_query = text(f"""
        SELECT COUNT(*)
        FROM perpajakan.v_data_pbb_pemerintah
        {where_clause};
    """)

    data_query = text(f"""
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
        {where_clause}
        ORDER BY id
        LIMIT :limit
        OFFSET :offset;
    """)

    with engine.connect() as connection:
        total = connection.execute(
            count_query,
            params
        ).scalar() or 0

        rows = connection.execute(
            data_query,
            params
        ).mappings().all()

        return {
            "total_data": total,
            "data": [dict(row) for row in rows]
        }
