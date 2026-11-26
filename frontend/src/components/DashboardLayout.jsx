
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './DashboardLayout.css'

function DashboardLayout({ title, description, children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '▦' },
    { label: 'Peta Persil', path: '/peta', icon: '⌖' },
    { label: 'Data Pertanahan', path: '/data-persil', icon: '▤' },
    { label: 'Informasi PBB', path: '/data-pbb', icon: '▣' },
  ]

  function handleLogout() {
    localStorage.removeItem('landwise_token')
    localStorage.removeItem('landwise_user')
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">
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

          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="sidebar-section">
          <span className="sidebar-heading">LAINNYA</span>

          <Link
            to="/profil"
            className={`sidebar-link ${
              location.pathname === '/profil' ? 'active' : ''
            }`}
          >
            <span>♙</span>
            Profil Pengguna
          </Link>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-icon">?</span>
            <div>
              <strong>Butuh Bantuan?</strong>
              <small>Informasi penggunaan sistem</small>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            ↪ Keluar
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="breadcrumb">
              LANDWISE / {title}
            </span>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>

        <div className="dashboard-content">
          {children}
        </div>

        <footer className="dashboard-footer">
          <span>
            LANDWISE · Land Information and Spatial Web System
          </span>
          <span>Informasi Pertanahan Terintegrasi</span>
        </footer>
      </main>
    </div>
  )
}

export default DashboardLayout
