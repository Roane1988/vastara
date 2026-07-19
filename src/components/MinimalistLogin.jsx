import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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

export default function MinimalistLogin({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            vastara
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {isLoginView ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <h2 className="text-xl font-semibold text-slate-900 text-center mb-8">
                Masuk ke akun Anda
              </h2>

              <form onSubmit={(e) => { e.preventDefault(); onLogin?.() }} className="space-y-5">
                <div>
                  <label htmlFor="email" className="sr-only">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-3 px-4 text-sm text-slate-900 bg-white border border-gray-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
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
                      className="w-full py-3 px-4 pr-10 text-sm text-slate-900 bg-white border border-gray-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLoginView(false)}
                    className="mt-1.5 block ml-auto text-xs text-slate-500 hover:text-orange-500 transition-colors"
                  >
                    Lupa password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 text-sm font-medium text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000] transition-colors"
                >
                  Masuk
                </button>
              </form>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-slate-400">atau</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                className="w-full py-3 flex items-center justify-center gap-2.5 text-sm font-medium text-slate-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <GoogleIcon />
                Lanjutkan dengan Google
              </button>

              <p className="mt-8 text-center text-xs text-slate-500">
                Belum punya akun?{' '}
                <a href="#" className="font-medium text-slate-900 hover:text-[#FF6B00] transition-colors">
                  Daftar
                </a>
              </p>

              {/* TODO: Call supabase.auth.signInWithPassword({ email, password }) */}
            </motion.div>
          ) : (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <h2 className="text-xl font-semibold text-slate-900 text-center mb-2">
                Atur ulang password
              </h2>
              <p className="text-xs text-slate-500 text-center mb-8">
                Masukkan email Anda untuk menerima tautan reset.
              </p>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="sr-only">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="Email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full py-3 px-4 text-sm text-slate-900 bg-white border border-gray-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 text-sm font-medium text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000] transition-colors"
                >
                  Kirim Tautan
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsLoginView(true)}
                className="mt-6 w-full text-center text-xs text-slate-500 hover:text-orange-500 transition-colors"
              >
                Kembali ke Login
              </button>

              {/* TODO: Call supabase.auth.resetPasswordForEmail({ resetEmail }) */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
