import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-neutral-700 p-8 bg-neutral-900 space-y-6">
            <span className="font-heading font-black text-xs uppercase tracking-widest text-neutral-400">
              WENZY Application Error
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Something went wrong
            </h1>
            <p className="text-xs text-neutral-300">
              An unexpected error occurred while rendering the page.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-black p-4 border border-neutral-800 text-red-400 overflow-x-auto whitespace-pre-wrap max-h-60 font-mono">
                {this.state.error.stack || this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="pt-2 flex gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary bg-white text-black hover:bg-neutral-200"
              >
                Clear Cache & Reload
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="btn-secondary border-neutral-700 text-white hover:bg-neutral-800"
              >
                Back to Storefront
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
