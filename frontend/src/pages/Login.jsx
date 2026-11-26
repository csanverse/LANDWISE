
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  sendEmailVerification,
  signOut,
} from 'firebase/auth'

import { auth } from '../firebase'
import './Login.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    setLoading(true)
    setMessage('')
    setError('')

    try {
      // 1. Login melalui Firebase Authentication
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )

      const user = result.user

      // 2. Pastikan email sudah diverifikasi
      if (!user.emailVerified) {
        await sendEmailVerification(user)
        await signOut(auth)

        setMessage(
          'Email belum terverifikasi. Tautan verifikasi telah dikirim ulang. Periksa inbox atau folder spam.'
        )
        return
      }

      // 3. Ambil Firebase ID Token
      const token = await user.getIdToken(true)

      // 4. Sinkronisasi akun Firebase dengan PostgreSQL
      const syncResponse = await fetch(
        `${API_BASE_URL}/auth/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const syncData = await syncResponse.json().catch(() => ({}))

      if (!syncResponse.ok) {
        throw new Error(
          syncData.detail ||
          'Sinkronisasi akun dengan server gagal.'
        )
      }

      // 5. Simpan token dan profil pengguna
      localStorage.setItem('landwise_token', token)

      localStorage.setItem(
        'landwise_user',
        JSON.stringify({
          ...syncData,
          uid: user.uid,
          email: user.email,
          displayName:
            syncData.nama_lengkap ||
            user.displayName ||
            '',
          isAnonymous: false,
        })
      )

      // 6. Arahkan pengguna ke Dashboard
      navigate('/dashboard')

    } catch (err) {
      console.error('Login error:', err)

      // Bersihkan data lokal jika proses login/sinkronisasi gagal
      localStorage.removeItem('landwise_token')
      localStorage.removeItem('landwise_user')

      const errors = {
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/user-not-found': 'Akun tidak ditemukan.',
        'auth/wrong-password': 'Password salah.',
        'auth/invalid-credential': 'Email atau password salah.',
        'auth/too-many-requests':
          'Terlalu banyak percobaan. Coba kembali nanti.',
        'auth/network-request-failed':
          'Koneksi internet bermasalah.',
      }

      setError(
        errors[err.code] ||
        err.message ||
        'Login gagal. Silakan coba kembali.'
      )

      // Jika Firebase sudah login tetapi sinkronisasi gagal,
      // keluarkan pengguna agar tidak berada dalam kondisi setengah login.
      if (auth.currentUser) {
        await signOut(auth).catch((signOutError) => {
          console.error('Sign out error:', signOutError)
        })
      }

    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Login Guest menggunakan Firebase Anonymous Authentication
      const result = await signInAnonymously(auth)
      const user = result.user
      const token = await user.getIdToken()

      localStorage.setItem('landwise_token', token)

      localStorage.setItem(
        'landwise_user',
        JSON.stringify({
          uid: user.uid,
          displayName: 'Guest',
          isAnonymous: true,
        })
      )

      // Guest hanya diarahkan ke peta publik
      navigate('/peta')

    } catch (err) {
      console.error('Guest login error:', err)
      setError('Login Guest gagal. Silakan coba kembali.')

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* LEFT BRAND PANEL */}
      <section className="login-brand-panel">
        <Link to="/" className="login-brand">
          <span className="login-brand-icon">L</span>
          <span>
            <strong>LANDWISE</strong>
            <small>Land Information System</small>
          </span>
        </Link>

        <div className="login-brand-content">
          <span className="login-eyebrow">
            LAND INFORMATION & SPATIAL WEB SYSTEM
          </span>

          <h1>
            Informasi Pertanahan
            <br />
            dalam <span>Satu Platform.</span>
          </h1>

          <p>
            Mengintegrasikan informasi pertanahan dan perpajakan
            bumi dan bangunan melalui sistem informasi berbasis
            geospasial yang informatif dan mudah diakses.
          </p>
        </div>

        <div className="login-brand-footer">
          Land Information and Spatial Web System
        </div>
      </section>

      {/* RIGHT FORM PANEL */}
      <section className="login-form-panel">
        <div className="login-form-container">

          <Link to="/" className="back-home">
            ← Kembali ke Beranda
          </Link>

          <div className="login-heading">
            <span className="section-eyebrow">
              LANDWISE ACCOUNT
            </span>

            <h2>Welcome Back</h2>

            <p>
              Masuk untuk mengakses sistem LANDWISE.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                placeholder="Masukkan alamat email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            {message && (
              <div className="login-error">
                {message}
              </div>
            )}

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Login'}
              <span>→</span>
            </button>
          </form>

          <div className="login-divider">
            <span>atau</span>
          </div>

          <button
            type="button"
            className="login-submit-button"
            onClick={handleGuestLogin}
            disabled={loading}
            style={{
              background: '#ffffff',
              color: '#20543c',
              border: '1px solid #dce5de',
            }}
          >
            {loading ? 'Memproses...' : 'Masuk sebagai Guest'}
          </button>

          <p className="register-prompt">
            Belum memiliki akun?{' '}
            <Link to="/register">Daftar sekarang</Link>
          </p>

          <div className="login-security-note">
            <span>◈</span>
            Akses sistem LANDWISE secara aman dan terintegrasi
          </div>

        </div>
      </section>
    </div>
  )
}

export default Login
