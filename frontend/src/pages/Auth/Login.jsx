import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import BrandName from '@components/Common/BrandName'
import { authService } from '@services/apiServices'
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  FIREBASE_CONFIGURED
} from '../../config/firebase'
import { toast } from 'react-toastify'
import {
  FiMail, FiLock, FiEye, FiEyeOff,
  FiLoader, FiArrowRight, FiShield, FiArrowLeft, FiPhone, FiRefreshCw
} from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'

// ── Firebase error → friendly message (unchanged) ──────────────────────────
const getFirebaseGoogleErrorMessage = (error) => {
  if (!error) return 'Google sign-in failed. Please try again.'
  if (error.response?.data?.message) return error.response.data.message
  switch (error.code) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion.'
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Redirecting to Google Sign-In...'
    case 'auth/unauthorized-domain':
      return 'Domain not authorized in Firebase Console. Please add this domain under Firebase Authentication settings.'
    case 'auth/cancelled-popup-request':
      return 'Previous sign-in request was cancelled.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.'
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Console (Authentication > Sign-in method > Google). Please enable it.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.'
    default:
      return error.message || 'Unable to sign in with Google. Please try again.'
  }
}

// ── Ripple effect utility ───────────────────────────────────────────────────
function spawnRipple(e, btnEl) {
  if (!btnEl) return
  const rect = btnEl.getBoundingClientRect()
  const x = (e?.clientX ?? rect.left + rect.width / 2) - rect.left
  const y = (e?.clientY ?? rect.top + rect.height / 2) - rect.top
  const span = document.createElement('span')
  span.className = 'lp-ripple'
  span.style.left = `${x}px`
  span.style.top = `${y}px`
  btnEl.appendChild(span)
  setTimeout(() => span.remove(), 700)
  // Subtle haptic on supported devices
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(22)
  }
}

// ── Fashion scene static data ───────────────────────────────────────────────
const ITEMS = [
  // Far depth — Men's
  { key: 'shirt',     icon: '👕', layer: 'far',  left: '6%',  dur: 9,  dly: -3,  sz: 1.8, r1: -12, r2: 15  },
  { key: 'dresshirt', icon: '👔', layer: 'far',  left: '20%', dur: 11, dly: -8,  sz: 2.0, r1:  8,  r2: -10 },
  { key: 'jeans',     icon: '👖', layer: 'far',  left: '46%', dur: 12, dly: -5,  sz: 1.9, r1: 10,  r2: -8  },
  { key: 'watch',     icon: '⌚', layer: 'far',  left: '72%', dur: 10, dly: -2,  sz: 1.5, r1: 20,  r2: -15 },
  { key: 'handbag',   icon: '👜', layer: 'far',  left: '28%', dur: 8,  dly: -4,  sz: 1.8, r1: -18, r2: 12  },
  { key: 'ring',      icon: '💍', layer: 'far',  left: '56%', dur: 9,  dly: -6,  sz: 1.4, r1: -10, r2: 15  },
  { key: 'hat',       icon: '👒', layer: 'far',  left: '82%', dur: 7,  dly: -10, sz: 1.8, r1: -20, r2:  5  },
  { key: 'gift',      icon: '🎁', layer: 'far',  left: '90%', dur: 9,  dly: -1,  sz: 1.6, r1: -8,  r2: 18  },
  // Near depth — Women's + General
  { key: 'jacket',    icon: '🧥', layer: 'near', left: '34%', dur: 8,  dly: -1,  sz: 2.2, r1: -15, r2: 12  },
  { key: 'sneaker',   icon: '👟', layer: 'near', left: '60%', dur: 7,  dly: -11, sz: 1.7, r1: -8,  r2: 20  },
  { key: 'sunglass',  icon: '🕶️', layer: 'near', left: '87%', dur: 13, dly: -7,  sz: 1.6, r1: -5,  r2:  8  },
  { key: 'dress',     icon: '👗', layer: 'near', left: '14%', dur: 10, dly: -9,  sz: 2.1, r1: 12,  r2: -10 },
  { key: 'heels',     icon: '👠', layer: 'near', left: '42%', dur: 14, dly: -12, sz: 1.7, r1:  5,  r2: -20 },
  { key: 'scarf',     icon: '🧣', layer: 'near', left: '68%', dur: 11, dly: -3,  sz: 1.9, r1: 15,  r2: -8  },
  { key: 'shopbag',   icon: '🛍️', layer: 'near', left: '4%',  dur: 12, dly: -14, sz: 2.0, r1:  8,  r2: -12 },
  { key: 'briefcase', icon: '💼', layer: 'near', left: '52%', dur: 10, dly: -7,  sz: 1.7, r1: 12,  r2: -5  },
]

const CHARS = [
  { id: 'f1', icon: '🏃‍♀️', speed: 13, delay: -1,  size: 2.1, bottom: '4%'  },
  { id: 'm1', icon: '🏃‍♂️', speed: 10, delay: -5,  size: 2.3, bottom: '3%'  },
  { id: 'f2', icon: '🏃‍♀️', speed: 17, delay: -9,  size: 1.9, bottom: '5%'  },
  { id: 'm2', icon: '🏃‍♂️', speed: 8,  delay: -3,  size: 2.0, bottom: '2.5%'},
]

// ── Sub-components (memoised for performance) ───────────────────────────────
const FallingItem = memo(function FallingItem({ item }) {
  const ref = useRef(null)
  return (
    <div
      ref={ref}
      className={`lp-fall-item lp-layer-${item.layer}`}
      style={{
        '--fd':  `${item.dur}s`,
        '--fdy': `${item.dly}s`,
        '--fsz': `${item.sz}rem`,
        '--r1':  `${item.r1}deg`,
        '--r2':  `${item.r2}deg`,
        left: item.left,
      }}
      onMouseEnter={() => ref.current?.classList.add('lp-item-lit')}
      onMouseLeave={() => ref.current?.classList.remove('lp-item-lit')}
      aria-hidden="true"
    >
      {item.icon}
    </div>
  )
})
FallingItem.displayName = 'FallingItem'

const RunningChar = memo(function RunningChar({ char }) {
  return (
    <div
      className="lp-char"
      style={{
        '--cs': `${char.speed}s`,
        '--cd': `${char.delay}s`,
        '--cz': `${char.size}rem`,
        bottom: char.bottom,
      }}
      aria-hidden="true"
    >
      {char.icon}
    </div>
  )
})
RunningChar.displayName = 'RunningChar'

const FashionScene = memo(function FashionScene({ isDarkMode }) {
  return (
  <div className={`lp-scene ${isDarkMode ? 'lp-scene-dark' : 'lp-scene-light'}`} aria-hidden="true">
    {/* Ambient gold particles */}
    {Array.from({ length: 12 }, (_, i) => (
      <div
        key={i}
        className="lp-particle"
        style={{
          left: `${i * 8.3 + 1}%`,
          '--pp': `${3.5 + (i * 0.6) % 4}s`,
          '--ppd': `${-(i * 0.8)}s`,
        }}
      />
    ))}

    {/* Far-depth products */}
    {ITEMS.filter(it => it.layer === 'far').map(item => (
      <FallingItem key={item.key} item={item} />
    ))}

    {/* Running characters */}
    <div className="lp-chars-layer">
      {CHARS.map(char => <RunningChar key={char.id} char={char} />)}
    </div>

    {/* Near-depth products (above characters) */}
    {ITEMS.filter(it => it.layer === 'near').map(item => (
      <FallingItem key={item.key} item={item} />
    ))}
  </div>
  )
})
FashionScene.displayName = 'FashionScene'

// ── Step transition variants ────────────────────────────────────────────────
const stepVar = {
  enter: dir => ({ x: dir > 0 ? 52 : -52, opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit:  dir => ({ x: dir > 0 ? -52 : 52, opacity: 0, scale: 0.96 }),
}
const stepTx = { duration: 0.27, ease: [0.4, 0, 0.2, 1] }

// ── Main Login Component ────────────────────────────────────────────────────
function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { isDarkMode } = useTheme()

  const redirectUrl = new URLSearchParams(location.search).get('redirect') || null

  // ── Auth state (unchanged) ────────────────────────────────────────────
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ── OTP state ─────────────────────────────────────────────────────────
  const [otp, setOtp]               = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const otpRefs                     = useRef([])

  // ── UI state ──────────────────────────────────────────────────────────
  const [step, setStep]         = useState('initial') // 'initial' | 'email' | 'password' | 'otp'
  const [stepDir, setStepDir]   = useState(1)
  const [emailError, setEmailError] = useState('')
  const [loginSuccess, setLoginSuccess] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────
  const sceneRef = useRef(null)
  const panelRef = useRef(null)

  // Lock body scroll while login overlay is active
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Escape key → go back
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && step !== 'initial') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Parallax (desktop only, rAF throttled) ────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    const panel = panelRef.current
    if (!scene || !panel) return
    if (window.matchMedia('(hover: none)').matches) return // skip on touch devices

    let rafId = null
    let tx = 0, ty = 0, cx = 0, cy = 0

    const onMove = (e) => {
      const r = scene.getBoundingClientRect()
      tx = ((e.clientX - (r.left + r.width  / 2)) / r.width)  * 4
      ty = ((e.clientY - (r.top  + r.height / 2)) / r.height) * 3
    }
    const tick = () => {
      cx += (tx - cx) * 0.07
      cy += (ty - cy) * 0.07
      panel.style.setProperty('--px', `${cx.toFixed(2)}px`)
      panel.style.setProperty('--py', `${cy.toFixed(2)}px`)
      rafId = requestAnimationFrame(tick)
    }

    scene.addEventListener('mousemove', onMove, { passive: true })
    rafId = requestAnimationFrame(tick)
    return () => {
      scene.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // ── Step navigation ───────────────────────────────────────────────────
  const goForward = useCallback((next) => {
    setStepDir(1)
    setStep(next)
  }, [])

  const goBack = useCallback(() => {
    setStepDir(-1)
    setStep(prev => {
      if (prev === 'otp')      return 'email'
      if (prev === 'password') return 'email'
      return 'initial'
    })
  }, [])

  // ── Resend OTP countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => setResendTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  // ── Redirect after login (unchanged logic) ────────────────────────────
  const handleRedirectAfterLogin = useCallback((userObj) => {
    const name = userObj?.firstName && userObj.firstName !== 'Customer' ? userObj.firstName : ''
    setLoginSuccess(true)
    setTimeout(() => {
      toast.success(`Welcome back${name ? `, ${name}` : ''}! 🎉`)
      const rawRole = (userObj?.role || '').toLowerCase().replace(/\s+/g, '').trim()
      const role = rawRole === 'deliverypartner' ? 'delivery' : rawRole

      if (redirectUrl) {
        try {
          const decoded = decodeURIComponent(redirectUrl)
          const isAdmin    = decoded.startsWith('/admin')
          const isSeller   = decoded.startsWith('/seller')
          const isDelivery = decoded.startsWith('/delivery')
          const ok =
            (isAdmin    && role === 'admin')   ||
            (isSeller   && role === 'seller')  ||
            (isDelivery && role === 'delivery') ||
            (!isAdmin && !isSeller && !isDelivery)
          if (ok) { navigate(decoded); return }
        } catch (_) { /* invalid URL */ }
      }

      if      (role === 'admin')                            navigate('/admin/dashboard')
      else if (role === 'seller')                           navigate('/seller/dashboard')
      else if (role === 'delivery' || role === 'deliverypartner') navigate('/delivery/dashboard')
      else                                                  navigate('/customer')
    }, 500)
  }, [navigate, redirectUrl])

  // ── Google redirect result (unchanged) ───────────────────────────────
  useEffect(() => {
    if (!auth) return
    let mounted = true
    getRedirectResult(auth)
      .then(async (uc) => {
        if (uc && mounted) {
          setGoogleLoading(true)
          toast.info('Completing Google authentication...')
          const idToken = await uc.user.getIdToken()
          const payload = { idToken, email: uc.user.email, name: uc.user.displayName, picture: uc.user.photoURL, uid: uc.user.uid }
          const res = await authService.firebaseLogin(payload)
          if (res.data?.success && res.data?.token) {
            const { user: u, token: tk, refreshToken: rt } = res.data
            login(u, tk, rt)
            handleRedirectAfterLogin(u)
          }
        }
      })
      .catch((err) => console.warn('[LOGIN] Redirect sign-in note:', err.message))
      .finally(() => { if (mounted) setGoogleLoading(false) })
    return () => { mounted = false }
  }, [login, handleRedirectAfterLogin])

  // ── Email/password submit (unchanged logic) ───────────────────────────
  const handleEmailLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    const tEmail = email.trim().toLowerCase()
    const tPass  = password
    if (!tEmail || !tPass) { toast.error('Please enter both email and password.'); return }
    setLoading(true)
    try {
      const res = await authService.login(tEmail, tPass, rememberMe)
      if (res.data?.success && res.data?.token) {
        const { user: u, token: tk, refreshToken: rt } = res.data
        login(u, tk, rt)
        handleRedirectAfterLogin(u)
      } else {
        throw new Error(res.data?.message || 'Login failed')
      }
    } catch (err) {
      console.error('Email login error:', err)
      let msg = err.response?.data?.message
      if (!msg) {
        if (err.message === 'Network Error' || !err.response) {
          msg = 'Unable to connect to backend server. Please verify backend is running.'
        } else {
          msg = err.message || 'Invalid email or password. Please check your credentials.'
        }
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Google login (unchanged logic) ────────────────────────────────────
  const handleGoogleLogin = async (e) => {
    if (googleLoading || loading) return
    if (!FIREBASE_CONFIGURED || !auth || !googleProvider) {
      toast.error('Google Sign-In is temporarily unavailable. Please use email and password.')
      return
    }
    spawnRipple(e, e?.currentTarget)
    setGoogleLoading(true)
    try {
      const uc = await signInWithPopup(auth, googleProvider)
      const idToken = await uc.user.getIdToken()
      const payload = { idToken, email: uc.user.email, name: uc.user.displayName, picture: uc.user.photoURL, uid: uc.user.uid }
      const res = await authService.firebaseLogin(payload)
      if (res.data?.success && res.data?.token) {
        const { user: u, token: tk, refreshToken: rt } = res.data
        login(u, tk, rt)
        handleRedirectAfterLogin(u)
      } else {
        throw new Error(res.data?.message || 'Google authentication failed on server')
      }
    } catch (error) {
      console.error('Google Sign-In error:', error)
      const msg = getFirebaseGoogleErrorMessage(error)
      if (error.code === 'auth/popup-blocked') {
        toast.info('Popup blocked. Initiating direct redirect sign-in...')
        try { await signInWithRedirect(auth, googleProvider); return } catch (_e) { /* ignore redirect error */ }
      }
      if (error.code === 'auth/popup-closed-by-user') toast.info(msg)
      else toast.error(msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── Email / Phone validation → next step ──────────────────────────────
  const handleEmailContinue = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) { setEmailError('Please enter your email address or mobile number.'); return }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    const digits  = trimmed.replace(/\D/g, '')
    const isPhone = /^[0-9]{10}$/.test(digits.slice(-10)) && digits.length >= 10
    if (!isEmail && !isPhone) {
      setEmailError('Please enter a valid email address or 10-digit mobile number.')
      return
    }
    setEmailError('')

    // ── Phone path: send OTP then go to OTP step ──────────────────────
    if (isPhone) {
      setLoading(true)
      try {
        await authService.sendPhoneLoginOTP(trimmed)
        setOtp(['', '', '', '', '', ''])
        setResendTimer(60)
        goForward('otp')
        toast.success('OTP sent to your mobile number!')
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to send OTP. Check your number and try again.'
        setEmailError(msg)
      } finally {
        setLoading(false)
      }
      return
    }

    // ── Email path: go to password step ───────────────────────────────
    goForward('password')
  }

  // ── OTP digit input handlers ──────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft'  && index > 0) otpRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // ── OTP submit ────────────────────────────────────────────────────────
  const handleOtpVerify = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    const otpStr = otp.join('')
    if (otpStr.length !== 6) { toast.error('Please enter the complete 6-digit OTP.'); return }
    setOtpLoading(true)
    try {
      const res = await authService.verifyPhoneLoginOTP(email.trim(), otpStr)
      if (res.data?.success && res.data?.token) {
        const { user: u, token: tk, refreshToken: rt, isNewUser } = res.data
        login(u, tk, rt)
        if (isNewUser) toast.success('Account created! Welcome to STYLE STREET 🎉')
        handleRedirectAfterLogin(u)
      } else {
        throw new Error(res.data?.message || 'OTP verification failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid OTP. Please try again.'
      toast.error(msg)
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await authService.sendPhoneLoginOTP(email.trim())
      setOtp(['', '', '', '', '', ''])
      setResendTimer(60)
      otpRefs.current[0]?.focus()
      toast.success('New OTP sent!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared input class ────────────────────────────────────────────────
  const inputCls = [
    'lp-input',
    isDarkMode
      ? 'lp-input-dark'
      : 'lp-input-light',
  ].join(' ')

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div ref={sceneRef} className="lp-root" role="main" aria-label="Sign in to STYLE STREET">
      {/* ── 1. Animated fashion scene ─────────────────────────────────── */}
      <FashionScene isDarkMode={isDarkMode} />

      {/* ── 2. Overlay tint for readability ──────────────────────────── */}
      <div
        className={`lp-overlay ${isDarkMode ? 'lp-overlay-dark' : 'lp-overlay-light'}`}
        aria-hidden="true"
      />

      {/* ── 3. Glass login panel ──────────────────────────────────────── */}
      <div className="lp-panel-wrap">
        <div
          ref={panelRef}
          className={`lp-glass ${isDarkMode ? 'lp-glass-dark' : 'lp-glass-light'}`}
          style={{ transform: 'translate(var(--px, 0px), var(--py, 0px))' }}
        >

          {/* Success flash */}
          <AnimatePresence>
            {loginSuccess && (
              <motion.div
                className="lp-success"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                role="status"
                aria-live="polite"
              >
                <div className="lp-success-check" aria-hidden="true">✓</div>
                <p className="text-sm font-semibold mt-2 text-white">Welcome back</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-icon" aria-hidden="true">
              <img
                src="/assets/style-street-logo.png"
                alt=""
                className="lp-brand-img"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <BrandName size="sm" />
          </div>

          {/* Step content */}
          <div className="lp-steps" aria-live="polite" aria-atomic="false">
            <AnimatePresence mode="wait" custom={stepDir}>

              {/* ── INITIAL ── */}
              {step === 'initial' && (
                <motion.div
                  key="initial"
                  custom={stepDir}
                  variants={stepVar}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTx}
                  className="lp-step"
                >
                  <p className={`lp-welcome ${isDarkMode ? 'text-white/75' : 'text-gray-600'}`}>
                    Welcome back
                  </p>

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    className={`lp-btn lp-btn-ghost ${isDarkMode ? 'lp-btn-ghost-dark' : 'lp-btn-ghost-light'}`}
                    aria-label="Continue with Google"
                  >
                    {googleLoading
                      ? <><FiLoader size={18} className="animate-spin text-amber-400" /><span>Connecting...</span></>
                      : <><FcGoogle size={20} aria-hidden="true" /><span>Continue with Google</span></>
                    }
                  </button>

                  {/* Divider */}
                  <div className="lp-divider" aria-hidden="true">
                    <span className="lp-divider-line" />
                    <span className={`lp-divider-text ${isDarkMode ? 'text-white/35' : 'text-gray-400'}`}>or</span>
                    <span className="lp-divider-line" />
                  </div>

                  {/* Email/Mobile entry */}
                  <button
                    type="button"
                    onClick={() => { spawnRipple(null, null); goForward('email') }}
                    className={`lp-btn lp-btn-ghost ${isDarkMode ? 'lp-btn-ghost-dark' : 'lp-btn-ghost-light'}`}
                    aria-label="Enter your email or mobile to sign in"
                  >
                    <FiMail size={17} className="text-amber-400" aria-hidden="true" />
                    <span>Enter email or mobile</span>
                    <FiArrowRight size={15} className="lp-arrow ml-auto" aria-hidden="true" />
                  </button>

                  {/* Create account */}
                  <p className="lp-footer-link">
                    <span className={isDarkMode ? 'text-white/45' : 'text-gray-500'}>
                      New to STYLE STREET?{' '}
                    </span>
                    <Link to="/register" className="lp-create-link">
                      Create an account <FiArrowRight size={11} className="inline" aria-hidden="true" />
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ── EMAIL STEP ── */}
              {step === 'email' && (
                <motion.div
                  key="email"
                  custom={stepDir}
                  variants={stepVar}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTx}
                  className="lp-step"
                >
                  <button
                    type="button"
                    onClick={goBack}
                    className={`lp-back ${isDarkMode ? 'lp-back-dark' : 'lp-back-light'}`}
                    aria-label="Go back"
                  >
                    <FiArrowLeft size={14} aria-hidden="true" /><span>Back</span>
                  </button>

                  <p className={`lp-step-title ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Enter your email or mobile
                  </p>

                  <form onSubmit={handleEmailContinue} className="lp-form" noValidate>
                    <div className="lp-input-wrap">
                      <FiMail size={14} className="lp-input-icon text-amber-400" aria-hidden="true" />
                      <input
                        type="text"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError('') }}
                        placeholder="Email address or 10-digit mobile"
                        className={inputCls}
                        autoFocus
                        autoComplete="username"
                        aria-label="Email address or mobile number"
                        aria-describedby={emailError ? 'lp-email-err' : undefined}
                        aria-invalid={!!emailError}
                      />
                    </div>
                    {emailError && (
                      <motion.p
                        id="lp-email-err"
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className="lp-field-error"
                      >
                        {emailError}
                      </motion.p>
                    )}
                    <button
                      type="submit"
                      className="lp-btn lp-btn-primary"
                      onClick={e => spawnRipple(e, e.currentTarget)}
                    >
                      <span>Continue</span>
                      <FiArrowRight size={15} className="lp-arrow" aria-hidden="true" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── OTP STEP ── */}
              {step === 'otp' && (
                <motion.div
                  key="otp"
                  custom={stepDir}
                  variants={stepVar}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTx}
                  className="lp-step"
                >
                  <button
                    type="button"
                    onClick={goBack}
                    className={`lp-back ${isDarkMode ? 'lp-back-dark' : 'lp-back-light'}`}
                    aria-label="Go back"
                  >
                    <FiArrowLeft size={14} aria-hidden="true" /><span>Back</span>
                  </button>

                  <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 10, boxShadow: '0 4px 16px rgba(251,191,36,0.35)'
                    }}>
                      <FiPhone size={20} color="#000" />
                    </div>
                  </div>

                  <p className={`lp-step-title ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Enter OTP
                  </p>
                  <p className={`lp-step-sub ${isDarkMode ? 'text-white/45' : 'text-gray-500'}`}
                    style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 18 }}>
                    We sent a 6-digit code to<br />
                    <strong style={{ color: isDarkMode ? '#fbbf24' : '#b45309' }}>
                      +91 {email.trim().replace(/\D/g, '').slice(-10)}
                    </strong>
                  </p>

                  <form onSubmit={handleOtpVerify} className="lp-form" noValidate>
                    {/* 6-box OTP input */}
                    <div style={{
                      display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20
                    }}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { otpRefs.current[i] = el }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          onPaste={i === 0 ? handleOtpPaste : undefined}
                          autoFocus={i === 0}
                          aria-label={`OTP digit ${i + 1}`}
                          style={{
                            width: 42, height: 50,
                            textAlign: 'center',
                            fontSize: 22, fontWeight: 700,
                            borderRadius: 10,
                            border: digit
                              ? '2px solid #fbbf24'
                              : isDarkMode ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(0,0,0,0.15)',
                            background: digit
                              ? isDarkMode ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)'
                              : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            color: isDarkMode ? '#fff' : '#111',
                            outline: 'none',
                            transition: 'border-color 0.15s, background 0.15s',
                            boxShadow: digit ? '0 0 0 3px rgba(251,191,36,0.18)' : 'none',
                            caretColor: '#fbbf24'
                          }}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || otp.join('').length !== 6}
                      className="lp-btn lp-btn-primary"
                      onClick={e => { if (!otpLoading) spawnRipple(e, e.currentTarget) }}
                    >
                      {otpLoading
                        ? <><FiLoader size={15} className="animate-spin" aria-hidden="true" /><span>Verifying...</span></>
                        : <><span>Verify & Sign In</span><FiArrowRight size={15} className="lp-arrow" aria-hidden="true" /></>
                      }
                    </button>
                  </form>

                  {/* Resend OTP */}
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    {resendTimer > 0 ? (
                      <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9ca3af' }}>
                        Resend OTP in <strong style={{ color: '#fbbf24' }}>{resendTimer}s</strong>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                          color: isDarkMode ? '#fbbf24' : '#b45309',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          opacity: loading ? 0.6 : 1
                        }}
                        aria-label="Resend OTP"
                      >
                        <FiRefreshCw size={13} />
                        Resend OTP
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── PASSWORD STEP ── */}
              {step === 'password' && (
                <motion.div
                  key="password"
                  custom={stepDir}
                  variants={stepVar}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTx}
                  className="lp-step"
                >
                  <button
                    type="button"
                    onClick={goBack}
                    className={`lp-back ${isDarkMode ? 'lp-back-dark' : 'lp-back-light'}`}
                    aria-label="Go back"
                  >
                    <FiArrowLeft size={14} aria-hidden="true" /><span>Back</span>
                  </button>

                  <p className={`lp-step-title ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Enter your password
                  </p>
                  <p className={`lp-step-sub ${isDarkMode ? 'text-white/45' : 'text-gray-500'}`}>
                    {email}
                  </p>

                  <form onSubmit={handleEmailLogin} className="lp-form" noValidate>
                    <div className="lp-input-wrap">
                      <FiLock size={14} className="lp-input-icon text-amber-400" aria-hidden="true" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        className={`${inputCls} lp-input-has-eye`}
                        autoFocus
                        autoComplete="current-password"
                        aria-label="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="lp-eye-btn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword
                          ? <FiEyeOff size={14} aria-hidden="true" />
                          : <FiEye    size={14} aria-hidden="true" />}
                      </button>
                    </div>

                    <div className="lp-forgot-row">
                      <label className={`lp-remember ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="lp-check"
                          aria-label="Keep me signed in"
                        />
                        Keep me signed in
                      </label>
                      <Link to="/forgot-password" className="lp-forgot">
                        Forgot Password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="lp-btn lp-btn-primary"
                      onClick={e => { if (!loading) spawnRipple(e, e.currentTarget) }}
                    >
                      {loading
                        ? <><FiLoader size={15} className="animate-spin" aria-hidden="true" /><span>Signing in...</span></>
                        : <><span>Sign In</span><FiArrowRight size={15} className="lp-arrow" aria-hidden="true" /></>
                      }
                    </button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Security footer */}
          <div className={`lp-security ${isDarkMode ? 'text-white/25' : 'text-gray-400'}`}>
            <FiShield size={10} className="text-amber-400/60" aria-hidden="true" />
            <span>256-bit SSL · Google Firebase Secured</span>
          </div>
        </div>
      </div>

      {/* Skip to main content for screen readers */}
      <a href="#lp-form-email" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-2 focus:bg-amber-400 focus:text-black focus:rounded focus:top-4 focus:left-4">
        Skip to login form
      </a>
    </div>
  )
}

export default Login
