
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
} from 'firebase/auth'

import { auth } from '../firebase'
import './Login.css'

function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()

    setMessage('')
    setError('')

    if (!name.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sesuai.')
      return
    }

    setLoading(true)

    try {
      // 1. Membuat akun Firebase
      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )

      // 2. Menyimpan nama lengkap pada profil Firebase
      await updateProfile(result.user, {
        displayName: name.trim(),
      })

      // 3. Mengirim email verifikasi
      await sendEmailVerification(result.user)

      // 4. Keluar dari akun setelah registrasi
      await signOut(auth)

      setMessage(
        'Pendaftaran berhasil! Silakan periksa email dan klik tautan verifikasi sebelum login.'
      )

      // 5. Mengarahkan pengguna ke halaman Login
      setTimeout(() => {
        navigate('/login')
      }, 4000)

    } catch (err) {
      console.error('Register error:', err)

      const errors = {
        'auth/email-already-in-use': 'Email sudah terdaftar.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/weak-password': 'Password terlalu lemah.',
        'auth/network-request-failed':
          'Koneksi internet bermasalah.',
      }

      setError(
        errors[err.code] ||
        'Pendaftaran gagal. Silakan coba kembali.'
      )

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <section className="login-brand-panel">
        <Link to="/" className="login-brand">
          <span className="brand-icon">L</span>
          <span>
            <strong>LANDWISE</strong>
            <small>Land Information and Spatial Web System</small>
          </span>
        </Link>

        <div className="login-brand-content">
          <span className="brand-eyebrow">JOIN LANDWISE</span>

          <h1>Start Your Journey With LANDWISE.</h1>

          <p>
            Buat akun untuk mulai mengakses informasi pertanahan
            melalui sistem informasi spasial yang terintegrasi.
          </p>
        </div>

        <div className="login-brand-footer">
          Land Information and Spatial Web System
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">

          <Link to="/" className="back-home">
            ← Kembali ke Beranda
          </Link>

          <div className="login-heading">
            <span className="brand-eyebrow">CREATE ACCOUNT</span>

            <h2>Buat Akun</h2>

            <p>
              Lengkapi informasi berikut untuk mendaftar.
            </p>
          </div>

          <form className="login-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="name">Nama Lengkap</label>

              <input
                id="name"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

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
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Konfirmasi Password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  {showConfirmPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            {message && (
              <p className="success-message">
                {message}
              </p>
            )}

            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading}
            >
              {loading ? 'Mendaftarkan...' : 'Daftar Akun'}
            </button>
          </form>

          <p className="register-prompt">
            Sudah memiliki akun?{' '}
            <Link to="/login">Login</Link>
          </p>

          <div className="login-security-note">
            <span>🔒</span>
            <p>
              Informasi akun digunakan untuk mengakses layanan LANDWISE.
            </p>
          </div>

        </div>
      </section>
    </div>
  )
}

export default Register
