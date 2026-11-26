
import './App.css'
import { Routes, Route } from 'react-router-dom'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PetaPersil from './pages/PetaPersil'
import DataPBB from './pages/DataPBB'
import DataPersil from "./pages/DataPersil";

const features = [
  {
    number: '01',
    icon: '⌖',
    title: 'Informasi Pertanahan',
    description:
      'Menyajikan informasi bidang tanah, luas, penggunaan, dan karakteristik persil dalam satu sistem.',
  },
  {
    number: '02',
    icon: '▤',
    title: 'Informasi Perpajakan',
    description:
      'Mengintegrasikan informasi objek Pajak Bumi dan Bangunan untuk mendukung akses informasi perpajakan.',
  },
  {
    number: '03',
    icon: '▦',
    title: 'Peta Interaktif',
    description:
      'Memvisualisasikan persebaran bidang tanah melalui peta digital berbasis informasi geospasial.',
  },
  {
    number: '04',
    icon: '◈',
    title: 'Analisis Spasial',
    description:
      'Menyediakan ringkasan dan informasi keruangan untuk mendukung pemahaman kondisi pertanahan.',
  },
]

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <a className="landing-brand" href="#beranda">
          <span className="landing-brand-icon">L</span>
          <span>
            <strong>LANDWISE</strong>
            <small>Land Information System</small>
          </span>
        </a>

        <nav className="landing-nav">
          <a href="#beranda" className="nav-active">Beranda</a>
          <a href="#tentang">Tentang</a>
          <a href="#fitur">Fitur</a>
          <a href="#peta">Peta Persil</a>
        </nav>

        <a href="/login" className="login-button">Masuk Akun ↗</a>
      </header>

      <main>
        <section className="hero-section" id="beranda">
          <div className="hero-content">
            <span className="hero-eyebrow">
              LAND INFORMATION & SPATIAL WEB SYSTEM
            </span>

            <h1>
              Informasi Pertanahan
              <br />
              Terintegrasi dalam
              <br />
              <span>Satu Platform.</span>
            </h1>

            <p>
              Mengenal dan mengakses informasi pertanahan serta perpajakan
              bumi dan bangunan melalui platform digital berbasis
              Sistem Informasi Geografis.
            </p>

            <div className="hero-actions">
              <a href="#peta" className="primary-button">
                Jelajahi Informasi <span>→</span>
              </a>
              <a href="#tentang" className="secondary-button">
                Pelajari LANDWISE
              </a>
            </div>

            <div className="hero-note">
              <span className="hero-note-dot"></span>
              Platform informasi pertanahan berbasis spasial
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-top">
                <div>
                  <span>LANDWISE SPATIAL VIEW</span>
                  <strong>Visualisasi Bidang Tanah</strong>
                </div>
                <span className="visual-indicator">GIS</span>
              </div>

              <div className="parcel-illustration">
                <div className="parcel parcel-one"></div>
                <div className="parcel parcel-two"></div>
                <div className="parcel parcel-three"></div>
                <div className="parcel parcel-four"></div>
                <div className="parcel parcel-five"></div>
                <div className="parcel parcel-six"></div>
                <div className="parcel-label label-one">001</div>
                <div className="parcel-label label-two">002</div>
                <div className="parcel-label label-three">003</div>
                <div className="parcel-label label-four">004</div>
                <div className="map-road road-one"></div>
                <div className="map-road road-two"></div>
              </div>

              <div className="visual-bottom">
                <span>◈ Informasi Geospasial</span>
                <span>Land Parcel Mapping</span>
              </div>
            </div>

            <div className="floating-note">
              <span className="floating-icon">⌖</span>
              <span>
                <strong>Data Spasial</strong>
                <small>Informasi berbasis lokasi</small>
              </span>
            </div>
          </div>
        </section>

        <section className="about-section" id="tentang">
          <div className="section-intro">
            <span className="section-eyebrow">TENTANG LANDWISE</span>
            <h2>Mengenal LANDWISE</h2>
          </div>

          <div className="about-content">
            <h3>
              Satu platform untuk memahami informasi pertanahan secara
              lebih terintegrasi.
            </h3>
            <p>
              LANDWISE (Land Information and Spatial Web System) merupakan
              sistem informasi berbasis web yang dirancang untuk
              mengintegrasikan data pertanahan dan informasi perpajakan
              bumi dan bangunan dengan dukungan visualisasi geospasial.
              Platform ini membantu pengguna memperoleh gambaran informasi
              bidang tanah secara lebih terstruktur, informatif, dan mudah
              dipahami.
            </p>
          </div>
        </section>

        <section className="features-section" id="fitur">
          <div className="section-heading">
            <span className="section-eyebrow">FITUR DAN LAYANAN</span>
            <h2>Jelajahi Fitur LANDWISE</h2>
            <p>
              Berbagai modul informasi yang mendukung pemanfaatan data
              pertanahan secara terpadu.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className="feature-card-top">
                  <span className="feature-icon">{feature.icon}</span>
                  <span className="feature-number">{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-link">
                  Pelajari fitur <span>→</span>
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="map-section" id="peta">
          <div className="map-section-content">
            <span className="section-eyebrow">INFORMASI GEOSPASIAL</span>
            <h2>Kenali Informasi Pertanahan melalui Peta Digital</h2>
            <p>
              Visualisasi spasial membantu pengguna memahami persebaran
              bidang tanah dan informasi terkait berdasarkan lokasi.
            </p>
            <a href="/peta" className="primary-button">
              Buka Peta Persil <span>→</span>
            </a>
          </div>

          <div className="map-preview">
            <div className="map-preview-inner">
              <span>LANDWISE GIS</span>
              <strong>Spatial Map Preview</strong>
              <small>Peta interaktif akan ditampilkan di sini</small>
              <div className="map-preview-grid"></div>
            </div>
          </div>
        </section>

        <section className="closing-section">
          <span className="section-eyebrow">LANDWISE PLATFORM</span>
          <h2>Informasi Pertanahan dalam Genggaman.</h2>
          <p>
            Mulai jelajahi informasi pertanahan melalui LANDWISE.
          </p>
          <a href="/login" className="closing-button">
            Masuk ke LANDWISE ↗
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand footer-brand" href="#beranda">
          <span className="landing-brand-icon">L</span>
          <span>
            <strong>LANDWISE</strong>
            <small>Land Information System</small>
          </span>
        </a>
        <p>
          Land Information and Spatial Web System
          <br />
          © 2026 LANDWISE. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/peta" element={<PetaPersil />} />
      <Route path="/data-pbb" element={<DataPBB />} />
      <Route path="/data-persil" element={<DataPersil />} />
    </Routes>
  )
}

export default App
