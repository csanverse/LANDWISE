
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getRegisteredPBB } from '../api'
import DashboardLayout from '../components/DashboardLayout'
import './DataPBB.css'

const numberFormat = new Intl.NumberFormat('id-ID')

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return `Rp ${numberFormat.format(Number(value) || 0)}`
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return numberFormat.format(Number(value) || 0)
}

function DataPBB() {
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  const perPage = 10

  // VERIFIKASI PENGGUNA
  useEffect(() => {
    async function verifyUser() {
      const savedToken = localStorage.getItem('landwise_token')

      if (!savedToken) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const profile = await getCurrentUser(savedToken)
        const user = profile.user || {}

        if (
          user.role === 'GUEST' ||
          user.nama_peran === 'Pengunjung'
        ) {
          navigate('/dashboard', { replace: true })
          return
        }

        setToken(savedToken)
      } catch {
        localStorage.removeItem('landwise_token')
        localStorage.removeItem('landwise_user')
        navigate('/login', { replace: true })
      }
    }

    verifyUser()
  }, [navigate])

  // MENGAMBIL DATA PBB
  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function loadPBB() {
      setLoading(true)
      setError('')

      try {
        const result = await getRegisteredPBB(
          token,
          page,
          perPage,
          search
        )

        if (cancelled) return

        setRows(result.data || [])
        setTotalData(result.total_data || 0)
        setTotalPages(result.total_pages || 0)
      } catch (err) {
        if (cancelled) return

        setRows([])
        setError(err.message)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPBB()

    return () => {
      cancelled = true
    }
  }, [token, page, search, reloadKey])

  // PENCARIAN DATA
  function handleSearch(event) {
    event.preventDefault()
    setPage(1)
    setSearch(keyword.trim())
  }

  // MUAT ULANG DATA
  function handleRetry() {
    setReloadKey((value) => value + 1)
  }

  if (!token) {
    return (
      <div className="pbb-loading">
        Memeriksa akses pengguna...
      </div>
    )
  }

  return (
    <DashboardLayout
      title="Informasi PBB"
      description="Data objek pajak dan informasi perpajakan yang terintegrasi dengan bidang tanah."
    >
      <div className="pbb-page">

        {/* SUMMARY */}
        <section className="pbb-summary">
          <div>
            <span>Total Data PBB</span>
            <strong>{numberFormat.format(totalData)}</strong>
            <small>Data objek pajak tersedia</small>
          </div>

          <div className="pbb-summary-icon">
            ▣
          </div>
        </section>

        {/* DATA TABLE */}
        <section className="pbb-table-panel">
          <div className="pbb-table-heading">
            <div>
              <h2>Daftar Data PBB</h2>
              <p>
                Informasi objek pajak berdasarkan data LANDWISE.
              </p>
            </div>

            <form className="pbb-search" onSubmit={handleSearch}>
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Cari NOP, lokasi, atau wajib pajak..."
              />

              <button type="submit">Cari</button>
            </form>
          </div>

          {/* ERROR */}
          {error ? (
            <div className="pbb-error">
              <strong>Data PBB tidak dapat dimuat</strong>
              <p>{error}</p>
              <button onClick={handleRetry}>Coba lagi</button>
            </div>
          ) : loading ? (
            <div className="pbb-empty">
              Memuat data PBB...
            </div>
          ) : rows.length === 0 ? (
            <div className="pbb-empty">
              Tidak ada data PBB yang sesuai dengan pencarian.
            </div>
          ) : (
            <>
              <div className="pbb-table-wrapper">
                <table className="pbb-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>NOP</th>
                      <th>Letak Objek</th>
                      <th>Nama Wajib Pajak</th>
                      <th>Luas Tanah (m²)</th>
                      <th>Luas Bangunan (m²)</th>
                      <th>NJOP Total</th>
                      <th>PBB Terutang</th>
                      <th>Status Pembayaran</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((item, index) => {
                      const statusPembayaran = (
                        item.status_pembayaran || ''
                      ).toUpperCase()

                      const isUnpaid =
                        statusPembayaran.includes('BELUM') ||
                        statusPembayaran.includes('TUNGGAK')

                      return (
                        <tr key={item.id}>
                          <td>{(page - 1) * perPage + index + 1}</td>
                          <td>{item.nop || '-'}</td>
                          <td>{item.letak_objek || '-'}</td>
                          <td>{item.nama_wajib_pajak || '-'}</td>
                          <td>{formatNumber(item.luas_tanah)}</td>
                          <td>{formatNumber(item.luas_bangunan)}</td>
                          <td>{formatCurrency(item.njop_total)}</td>
                          <td>{formatCurrency(item.pbb_terutang)}</td>
                          <td>
                            <span
                              className={
                                isUnpaid
                                  ? 'pbb-status unpaid'
                                  : 'pbb-status'
                              }
                            >
                              {item.status_pembayaran || 'Belum diketahui'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="pbb-pagination">
                <span>
                  Menampilkan {rows.length} dari{' '}
                  {numberFormat.format(totalData)} data
                </span>

                <div>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Sebelumnya
                  </button>

                  <span>
                    Halaman {page} dari {Math.max(totalPages, 1)}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

export default DataPBB
