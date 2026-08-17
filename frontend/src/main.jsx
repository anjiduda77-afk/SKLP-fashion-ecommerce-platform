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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

