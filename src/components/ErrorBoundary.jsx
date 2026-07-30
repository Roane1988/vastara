import { Component } from 'react'
import { FALLBACK_IMAGE } from '../utils/images'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center px-5">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden bg-brand-bg border border-brand-border">
              <img src={FALLBACK_IMAGE} alt="" className="w-full h-full object-cover opacity-50" />
            </div>
            <h1 className="text-xl font-bold text-brand-text">Terjadi Kesalahan</h1>
            <p className="text-sm text-brand-muted mt-2 leading-relaxed">
              Maaf, terjadi kesalahan yang tidak terduga. Silakan muat ulang halaman.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all"
            >
              Muat Ulang
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 text-left overflow-auto max-h-48">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}