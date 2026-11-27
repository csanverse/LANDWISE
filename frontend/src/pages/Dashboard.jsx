
import { useEffect, useMemo, useState } from 'react'
import { getDashboardStatistics } from '../api'
import './Dashboard.css'

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value) || 0)
}

function getLabel(item) {
  if (typeof item === 'string') return item

  const key = Object.keys(item || {}).find((key) =>
    /nama|penggunaan|kategori|label|jenis/i.test(key)
  )

  return key ? item[key] : 'Kategori'
}

function getValue(item) {
  if (typeof item === 'number') return item

  const key = Object.keys(item || {}).find((key) =>
    /jumlah|total|count|persil/i.test(key)
  )

  return key ? Number(item[key]) || 0 : 0
}

function Dashboard() {
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStatistics() {
      try {
        const token = localStorage.getItem('landwise_token')

        if (!token) {
          throw new Error(
            'Sesi login tidak ditemukan. Silakan login kembali.'
          )
        }

        const result = await getDashboardStatistics(token)
        setStatistics(result.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadStatistics()
  }, [])

  const usageData = useMemo(() => {
    const data = statistics?.berdasarkan_penggunaan_tanah

    return Array.isArray(data)
      ? data.map((item) => ({
          label: getLabel(item),
          value: getValue(item),
        }))
      : []
  }, [statistics])

  const totalUsage = usageData.reduce(
    (sum, item) => sum + item.value,
    0
  )

  const missingData = statistics?.data_kosong || {}

  const missingTotal = Object.values(missingData).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  )

  const storedUser = JSON.parse(
    localStorage.getItem('landwise_user') || '{}'
  )

  const user = storedUser.user || storedUser

  const userName =
    user.nama_lengkap ||
    user.nama ||
    user.name ||
    user.username ||
    user.displayName ||
    'Pengguna'

  const userRole =
    user.role || user.nama_peran || user.peran || 'Pengguna'

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard LANDWISE...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Dashboard tidak dapat dimuat</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-symbol">L</div>
          <div>
            <h2>LANDWISE</h2>
            <span>Land Information System</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-heading">MENU UTAMA</span>

          <a href="/LANDWISE/dashboard" className="sidebar-link active">
            <span>▦</span> Dashboard
          </a>

          <a href="/LANDWISE/peta" className="sidebar-link">
            <span>⌖</span> Peta Persil
          </a>

          <a href="/LANDWISE/data-persil" className="sidebar-link">
            <span>▤</span> Data Pertanahan
          </a>

          <a href="/LANDWISE/data-pbb" className="sidebar-link">
            <span>▣</span> Informasi PBB
          </a>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-heading">LAINNYA</span>

          <a href="/LANDWISE/profil" className="sidebar-link">
            <span>♙</span> Profil Pengguna
          </a>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-icon">?</span>
            <div>
              <strong>Butuh Bantuan?</strong>
              <small>Informasi penggunaan sistem</small>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={() => {
              localStorage.removeItem('landwise_token')
              localStorage.removeItem('landwise_user')
              window.location.href = '/LANDWISE/login'
            }}
          >
            ↪ Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <span className="breadcrumb">
              LANDWISE / Dashboard
            </span>

            <h1>Dashboard Overview</h1>

            <p>
              Ringkasan informasi pertanahan dan perpajakan.
            </p>
          </div>

          <div className="header-user">
            <div className="user-avatar">
              {String(userName).charAt(0).toUpperCase()}
            </div>

            <div className="user-information">
              <strong>{userName}</strong>
              <span>{userRole}</span>
            </div>
          </div>
        </header>

        {/* WELCOME BANNER */}
        <section className="welcome-banner">
          <div>
            <span className="welcome-label">
              LAND INFORMATION SYSTEM
            </span>

            <h2>Selamat Datang di LANDWISE</h2>

            <p>
              Pantau informasi bidang tanah, penggunaan lahan, dan
              kelengkapan data pertanahan melalui satu platform.
            </p>
          </div>

          <div className="welcome-decoration">⌖</div>
        </section>

        {/* RINGKASAN DATA */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Ringkasan Data</h2>
              <p>Gambaran umum basis data pertanahan.</p>
            </div>
          </div>

          <div className="stat-grid">

            <div className="stat-card">
              <div className="stat-top">
                <span>Total Persil</span>
                <div className="stat-icon green">▦</div>
              </div>

              <h3>
                {formatNumber(statistics?.total_persil)}
              </h3>

              <p>Bidang tanah terdaftar</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Total Luas Tanah</span>
                <div className="stat-icon blue">⌖</div>
              </div>

              <h3>
                {formatNumber(statistics?.total_luas_tanah)}
              </h3>

              <p>Meter persegi (m²)</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Data Kosong</span>
                <div className="stat-icon orange">!</div>
              </div>

              <h3>{formatNumber(missingTotal)}</h3>

              <p>Temuan pada atribut yang diperiksa</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Kategori Penggunaan</span>
                <div className="stat-icon purple">▤</div>
              </div>

              <h3>{formatNumber(usageData.length)}</h3>

              <p>Kategori penggunaan tanah</p>
            </div>

          </div>
        </section>

        {/* GRAFIK DAN KUALITAS DATA */}
        <section className="dashboard-content-grid">

          {/* PENGGUNAAN TANAH */}
          <div className="dashboard-panel usage-panel">
            <div className="panel-heading">
              <div>
                <h2>Penggunaan Tanah</h2>
                <p>
                  Distribusi bidang berdasarkan penggunaan tanah.
                </p>
              </div>

              <span className="panel-tag">Persil</span>
            </div>

            {usageData.length > 0 ? (
              <div className="usage-chart">
                {usageData
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((item, index) => {
                    const percentage =
                      totalUsage > 0
                        ? (item.value / totalUsage) * 100
                        : 0

                    return (
                      <div
                        className="usage-item"
                        key={`${item.label}-${index}`}
                      >
                        <div className="usage-label">
                          <span>{item.label}</span>
                          <strong>
                            {formatNumber(item.value)}
                          </strong>
                        </div>

                        <div className="usage-track">
                          <div
                            className={`usage-fill color-${index % 5}`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <small>
                          {percentage.toFixed(1)}%
                        </small>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="empty-state">
                Belum ada data penggunaan tanah untuk ditampilkan.
              </div>
            )}
          </div>

          {/* KUALITAS DATA */}
          <div className="dashboard-panel quality-panel">
            <div className="panel-heading">
              <div>
                <h2>Kualitas Data</h2>
                <p>Kelengkapan atribut bidang tanah.</p>
              </div>

              <span className="quality-symbol">✓</span>
            </div>

            {Object.entries(missingData).map(([key, value]) => (
              <div className="quality-item" key={key}>
                <div>
                  <span>
                    {key
                      .replaceAll('_', ' ')
                      .replace(/\b\w/g, (letter) =>
                        letter.toUpperCase()
                      )}
                  </span>

                  <strong>{formatNumber(value)}</strong>
                </div>

                <div className="quality-track">
                  <div
                    className="quality-fill"
                    style={{
                      width: `${
                        Number(statistics?.total_persil) > 0
                          ? Math.min(
                              (Number(value) /
                                statistics.total_persil) *
                                100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="quality-note">
              <strong>Catatan</strong>

              <p>
                Angka menunjukkan jumlah nilai kosong pada setiap
                atribut yang diperiksa. Satu persil dapat memiliki
                lebih dari satu atribut kosong.
              </p>
            </div>
          </div>

        </section>

        {/* FOOTER */}
        <footer className="dashboard-footer">
          <span>
            LANDWISE · Land Information and Spatial Web System
          </span>

          <span>
            Informasi Pertanahan Terintegrasi
          </span>
        </footer>

      </main>
    </div>
  )
}

export default Dashboard
