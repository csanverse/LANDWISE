
import { useEffect, useState } from 'react'
import './DataPersil.css'
import DashboardLayout from '../components/DashboardLayout'

const API_URL = 'http://127.0.0.1:8000'

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-'

  const number = Number(value)
  if (Number.isNaN(number)) return value

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(number)
}

function DataPersil() {
  const [totalPersil, setTotalPersil] = useState(0)
  const [persil, setPersil] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedPersil, setSelectedPersil] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadTotalPersil()
  }, [])

  useEffect(() => {
    loadPersil()
  }, [currentPage, keyword])

  async function loadTotalPersil() {
    try {
      const response = await fetch(`${API_URL}/persil/count`)
      if (!response.ok) throw new Error('Gagal mengambil jumlah persil')

      const result = await response.json()
      setTotalPersil(result.total_persil ?? 0)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadPersil() {
    setLoading(true)
    setError('')

    try {
      const endpoint = keyword
        ? `${API_URL}/persil/search?keyword=${encodeURIComponent(keyword)}&limit=10`
        : `${API_URL}/persil/page?page=${currentPage}&per_page=10`

      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Gagal mengambil data persil')

      const result = await response.json()

      if (keyword) {
        const data = Array.isArray(result.data) ? result.data : []
        setPersil(data)
        setTotalPages(1)
      } else {
        setPersil(result.data ?? [])
        setTotalPages(result.total_pages ?? 1)
      }
    } catch (err) {
      console.error(err)
      setPersil([])
      setError('Data persil gagal dimuat. Pastikan backend LANDWISE aktif.')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(event) {
    event.preventDefault()
    setCurrentPage(1)
    setKeyword(searchInput.trim())
  }

  function handleReset() {
    setSearchInput('')
    setKeyword('')
    setCurrentPage(1)
  }

  async function openDetail(persilId) {
    setDetailLoading(true)
    setSelectedPersil(null)

    try {
      const response = await fetch(`${API_URL}/persil/${persilId}`)
      if (!response.ok) throw new Error('Gagal mengambil detail persil')

      const result = await response.json()
      setSelectedPersil(result.data ?? result)
    } catch (err) {
      console.error(err)
      alert('Detail persil gagal dimuat.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedPersil(null)
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') closeDetail()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <DashboardLayout
      title="Data Persil"
      description="Informasi dan pengelolaan data bidang tanah LANDWISE."
    >
      <div className="persil-page">
        <section className="persil-summary">
          <div className="persil-summary-card">
            <div>
              <span className="summary-label">Total Bidang Tanah</span>
              <h2>{formatNumber(totalPersil)}</h2>
              <span className="summary-caption">Data persil terdaftar</span>
            </div>
            <div className="summary-icon">▦</div>
          </div>
        </section>

        <section className="persil-content">
          <div className="persil-content-header">
            <div>
              <h2>Daftar Data Persil</h2>
              <p>Informasi bidang tanah yang tersimpan dalam basis data LANDWISE.</p>
            </div>
          </div>

          <form className="persil-search" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <span className="search-icon">⌕</span>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari berdasarkan ID, luas tanah, atau informasi persil..."
              />
            </div>

            <button type="submit" className="btn-search">
              Cari
            </button>

            <button
              type="button"
              className="btn-reset"
              onClick={handleReset}
            >
              Reset
            </button>
          </form>

          {keyword && (
            <div className="search-result-info">
              Hasil pencarian untuk: <strong>{keyword}</strong>
            </div>
          )}

          <div className="persil-table-wrapper">
            <table className="persil-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID Persil</th>
                  <th>Luas Tanah</th>
                  <th>Kode Zona</th>
                  <th>Penggunaan Tanah</th>
                  <th>Penggunaan Bangunan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="table-message">
                      Memuat data persil...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="table-message error-message">
                      {error}
                    </td>
                  </tr>
                ) : persil.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-message">
                      Tidak ada data persil yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  persil.map((item, index) => (
                    <tr
                      key={item.id}
                      onClick={() => openDetail(item.id)}
                      className="persil-row"
                    >
                      <td>{keyword ? index + 1 : (currentPage - 1) * 10 + index + 1}</td>
                      <td className="persil-id">{item.id}</td>
                      <td>{formatNumber(item.luas_tanah)} m²</td>
                      <td>{item.kode_zona || '-'}</td>
                      <td>{item.penggunaan_tanah || '-'}</td>
                      <td>{item.penggunaan_bangunan || '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-detail"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDetail(item.id)
                          }}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!keyword && (
            <div className="persil-pagination">
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  Sebelumnya
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </section>

        {(selectedPersil || detailLoading) && (
          <div className="persil-modal-overlay" onClick={closeDetail}>
            <div
              className="persil-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="persil-modal-header">
                <div>
                  <span className="modal-eyebrow">LANDWISE</span>
                  <h2>Detail Bidang Tanah</h2>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeDetail}
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="modal-loading">Memuat detail persil...</div>
              ) : (
                <div className="persil-detail-grid">
                  <div className="detail-item">
                    <span>ID Persil</span>
                    <strong>{selectedPersil?.id ?? '-'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Luas Tanah</span>
                    <strong>{formatNumber(selectedPersil?.luas_tanah)} m²</strong>
                  </div>
                  <div className="detail-item">
                    <span>Kode Zona</span>
                    <strong>{selectedPersil?.kode_zona || '-'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Penggunaan Tanah</span>
                    <strong>{selectedPersil?.penggunaan_tanah || '-'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Penggunaan Bangunan</span>
                    <strong>{selectedPersil?.penggunaan_bangunan || '-'}</strong>
                  </div>
                </div>
              )}

              <div className="persil-modal-footer">
                <button type="button" onClick={closeDetail}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DataPersil
