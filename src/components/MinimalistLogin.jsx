import { useState } from 'react'
import { supabase } from '../supabaseClient'

function EyeIcon({ visible }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function MinimalistLogin({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isLogin, setIsLogin] = useState(true)

  function getFirstName(name) {
    return name?.trim() || 'Pengguna'
  }

  async function handleAuth(e) {
    e.preventDefault()
    setError(null)

    if (!isLogin && password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)

    let displayName = ''

    if (isLogin) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      displayName = data?.user?.user_metadata?.full_name || ''
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: firstName, whatsapp } },
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      displayName = firstName || data?.user?.user_metadata?.full_name || ''
    }

    onLoginSuccess?.()
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 pt-4">
          <h1 className="text-5xl font-bold tracking-[0.15em] text-brand-text select-none">
            V<span>ASTARA</span>
          </h1>
          <p className="text-xs tracking-[0.3em] text-brand-muted uppercase mt-2">
            properti tepercaya
          </p>
        </div>

        {isLogin ? (
          <>
            <h2 className="text-xl font-semibold text-brand-text text-center mb-8">
              Masuk ke akun Anda
            </h2>

            <form onSubmit={handleAuth} className="space-y-5">
              {error && (
                <p className="text-xs text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-[#152d4a] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <SpinnerIcon />}
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-brand-border" />
              <span className="text-xs text-brand-muted">atau</span>
              <div className="flex-1 h-px bg-brand-border" />
            </div>

            <button
              type="button"
              className="w-full py-3 flex items-center justify-center gap-2.5 text-sm font-medium text-brand-text bg-brand-surface border border-brand-border rounded-lg hover:bg-brand-bg transition-colors"
            >
              <GoogleIcon />
              Lanjutkan dengan Google
            </button>

            <p className="mt-8 text-center text-xs text-brand-muted">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null) }}
                className="font-semibold text-brand-primary hover:text-brand-secondary transition-colors"
              >
                Daftar
              </button>
            </p>
          </>
        ) : (
          <div className="bg-brand-bg border border-brand-border rounded-2xl p-6 -mx-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white text-lg font-bold shrink-0">
                +
              </div>
              <div>
                <h2 className="text-lg font-semibold text-brand-text">
                  Buat akun baru
                </h2>
                <p className="text-xs text-brand-muted">
                  Isi data diri Anda untuk mendaftar
                </p>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {error && (
                <p className="text-xs text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="firstName" className="text-xs font-medium text-brand-muted mb-1.5 block">
                  Nama Depan
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Masukkan nama depan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="text-xs font-medium text-brand-muted mb-1.5 block">
                  No WhatsApp
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  placeholder="Masukkan no WhatsApp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                  className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="text-xs font-medium text-brand-muted mb-1.5 block">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="text-xs font-medium text-brand-muted mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-xs font-medium text-brand-muted mb-1.5 block">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-[#152d4a] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading && <SpinnerIcon />}
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-brand-muted">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null) }}
                className="font-semibold text-brand-primary hover:text-brand-secondary transition-colors"
              >
                Masuk
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
