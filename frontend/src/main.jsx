import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from '@context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext.jsx'
import './styles/globals.css'
import './i18n/config.js'

const rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const googleClientId = (rawGoogleId && rawGoogleId.includes('.apps.googleusercontent.com'))
  ? rawGoogleId
  : '000000000000-dummy.apps.googleusercontent.com'

// ─── Error Boundary ─────────────────────────────────────────────────────────
// Catches React render/lifecycle errors and shows a recovery screen
// instead of a completely blank white page
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[SKLP] Application Error:', error)
    console.error('[SKLP] Component Stack:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>✦</div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#f59e0b',
            marginBottom: '0.5rem',
            letterSpacing: '0.1em'
          }}>SKLP FASHION</h1>
          <p style={{
            fontSize: '1rem',
            opacity: 0.7,
            marginBottom: '2rem',
            maxWidth: '400px'
          }}>
            Something went wrong loading the app. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(to right, #f59e0b, #eab308)',
              color: '#000',
              border: 'none',
              borderRadius: '1rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              cursor: 'pointer'
            }}
          >
            REFRESH PAGE
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#1a1a1a',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#f87171',
              maxWidth: '600px',
              overflow: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

// ─── App Mount ───────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <ThemeProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
