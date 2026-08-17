import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { useCurrency } from '@context/CurrencyContext'
import { userService, authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import {
  FiUser, FiMail, FiPhone, FiLock, FiMapPin,
  FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiEye, FiEyeOff,
  FiCheckCircle, FiShield, FiSmartphone, FiGlobe, FiMoon, FiSun,
  FiBell, FiCreditCard, FiDownload, FiAlertTriangle, FiSliders,
  FiTag, FiTruck, FiClock, FiKey, FiLogOut, FiCheck, FiRefreshCw
} from 'react-icons/fi'

const TABS = [
  { id: 'profile', label: 'Personal & Fashion', icon: FiUser },
  { id: 'addresses', label: 'Saved Addresses', icon: FiMapPin },
  { id: 'display', label: 'Display & Region', icon: FiGlobe },
  { id: 'notifications', label: 'Notifications & Alerts', icon: FiBell },
  { id: 'payments', label: 'Payment Methods & UPI', icon: FiCreditCard },
  { id: 'security', label: 'Security & Privacy', icon: FiShield },
]

const PRESET_AVATARS = [
  { id: 'gold_crown', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', label: 'Golden Royalty' },
  { id: 'velvet_noir', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', label: 'Velvet Noir' },
  { id: 'silk_couture', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', label: 'Silk Couture' },
  { id: 'emerald_luxe', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80', label: 'Emerald Luxe' },
  { id: 'atelier_classic', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', label: 'Atelier Classic' },
  { id: 'ivory_grace', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', label: 'Ivory Grace' }
]

// ── Address Modal ────────────────────────────────────────────────────────────
function AddressModal({ address, onSave, onClose, isDarkMode }) {
  const [form, setForm] = useState(
    address || {
      label: 'Home',
      type: 'home',
      street: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      postalCode: '',
      country: 'India',
      phone: '',
      isDefault: false
    }
  )

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'pincode' ? { postalCode: value } : {}),
      ...(name === 'postalCode' ? { pincode: value } : {})
    }))
  }

  const handleLabelSelect = (label) => {
    const type = label === 'Home' ? 'home' : label === 'Work' ? 'office' : 'other'
    setForm((prev) => ({ ...prev, label, type }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.street || !form.city || !form.state || (!form.pincode && !form.postalCode)) {
      toast.error('Please complete all required address fields')
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-lg rounded-3xl border p-6 animate-fade-in shadow-2xl ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
        <div className="flex items-center justify-between mb-5 border-b border-current/10 pb-3">
          <h3 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2">
            <FiMapPin size={20} /> {address ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-luxury-gold/10 hover:text-luxury-gold transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Address Type</label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLabelSelect(l)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                    form.label === l
                      ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                      : isDarkMode ? 'border-white/10 text-white hover:border-luxury-gold/50' : 'border-black/10 text-black hover:border-luxury-gold/50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">House No. / Building / Street *</label>
            <input
              name="street"
              value={form.street}
              onChange={handleChange}
              placeholder="e.g. Flat 402, Royal Residency, Road No. 12"
              className={`w-full p-3 text-sm rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Landmark (Optional)</label>
            <input
              name="landmark"
              value={form.landmark || ''}
              onChange={handleChange}
              placeholder="e.g. Near City Center Mall"
              className={`w-full p-3 text-sm rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">City *</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="City"
                className={`w-full p-3 text-sm rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">State *</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="State"
                className={`w-full p-3 text-sm rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">PIN Code *</label>
              <input
                name="pincode"
                value={form.pincode || form.postalCode || ''}
                onChange={handleChange}
                placeholder="6-digit PIN"
                maxLength={6}
                className={`w-full p-3 text-sm rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Contact Phone</label>
              <input
                name="phone"
                value={form.phone || ''}
                onChange={handleChange}
                placeholder="10-digit mobile"
                maxLength={10}
                className={`w-full p-3 text-sm rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold pt-1">
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault}
              onChange={handleChange}
              className="accent-yellow-400 w-4 h-4 rounded"
            />
            <span>Set as default delivery address for rapid checkout</span>
          </label>

          <div className="flex gap-3 pt-3 border-t border-current/10">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-colors ${
                isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold shadow-glow transition-all"
            >
              Save Address
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Phone Link / Change OTP Modal ─────────────────────────────────────────────
function PhoneModal({ onClose, onPhoneUpdated, isDarkMode }) {
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [newPhone, setNewPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const clean = newPhone.replace(/\D/g, '')
    if (!/^[6-9][0-9]{9}$/.test(clean)) {
      toast.error('Please enter a valid 10-digit Indian mobile number')
      return
    }
    setLoading(true)
    try {
      await authService.sendLinkPhoneOTP(clean)
      setStep('otp')
      toast.success(`OTP sent to +91 ${clean}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (otp.length < 6) {
      toast.error('Please enter 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const clean = newPhone.replace(/\D/g, '')
      const res = await authService.verifyLinkPhone(clean, otp)
      if (res.data?.success && res.data?.user) {
        onPhoneUpdated(res.data.user)
        toast.success('Mobile number verified & linked successfully! 🎉')
        onClose()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-sm rounded-3xl border p-6 animate-fade-in shadow-2xl ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
        <div className="flex items-center justify-between mb-4 border-b border-current/10 pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2 text-luxury-gold">
            <FiSmartphone /> Verify Mobile Number
          </h3>
          <button onClick={onClose} className="p-1 hover:text-luxury-gold"><FiX size={20} /></button>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <p className="text-xs opacity-75 leading-relaxed">
              Enter your 10-digit mobile number to receive high-security SMS delivery updates & OTP alerts.
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-sm font-bold opacity-60">+91</span>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                maxLength={10}
                className={`pl-14 w-full p-3 rounded-xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || newPhone.length < 10}
              className="w-full py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold transition-all disabled:opacity-50 shadow-glow"
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <p className="text-xs opacity-75">
              Enter the 6-digit verification code sent to <span className="font-bold text-luxury-gold">+91 {newPhone}</span>
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="0 0 0 0 0 0"
              maxLength={6}
              className={`w-full text-center text-xl font-bold tracking-widest p-3 rounded-xl border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold transition-all disabled:opacity-50 shadow-glow"
            >
              {loading ? 'Verifying...' : 'Verify & Link Mobile'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp('') }}
              className="w-full text-xs opacity-60 hover:opacity-100 text-center"
            >
              ← Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Avatar Chooser Modal ──────────────────────────────────────────────────────
function AvatarModal({ currentAvatar, onSelectAvatar, onClose, isDarkMode }) {
  const [customUrl, setCustomUrl] = useState('')

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!customUrl.trim()) return
    onSelectAvatar(customUrl.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-md rounded-3xl border p-6 animate-fade-in shadow-2xl ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
        <div className="flex items-center justify-between mb-4 border-b border-current/10 pb-3">
          <h3 className="text-lg font-bold text-luxury-gold flex items-center gap-2 font-serif">
            <FiUser /> Choose Atelier Avatar
          </h3>
          <button onClick={onClose} className="p-1 hover:text-luxury-gold"><FiX size={20} /></button>
        </div>

        <p className="text-xs opacity-75 mb-4">Select a luxury couture avatar or provide an image link:</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {PRESET_AVATARS.map((av) => {
            const isSelected = currentAvatar === av.url
            return (
              <button
                key={av.id}
                type="button"
                onClick={() => onSelectAvatar(av.url)}
                className={`relative group rounded-2xl overflow-hidden border-2 transition-all p-1 ${
                  isSelected ? 'border-luxury-gold shadow-glow scale-105' : 'border-transparent hover:border-luxury-gold/50'
                }`}
              >
                <img src={av.url} alt={av.label} className="w-full aspect-square object-cover rounded-xl" />
                <p className="text-[9px] font-bold text-center mt-1 truncate">{av.label}</p>
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-luxury-gold text-black rounded-full p-0.5">
                    <FiCheck size={10} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-3 pt-3 border-t border-current/10">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-70">Custom Image Link (URL)</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className={`flex-1 p-2.5 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="px-4 py-2.5 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-luxury-darkGold disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Profile & Settings Page ─────────────────────────────────────────────
function Profile() {
  const { user, updateUser, isAuthenticated, loading: authLoading, logout } = useAuth()
  const { isDarkMode, toggleTheme, language, changeLanguage } = useTheme()
  const { currency, setCurrency, RATES } = useCurrency()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('profile')
  const [profileLoading, setProfileLoading] = useState(false)
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [upiForm, setUpiForm] = useState({ upiId: '', label: 'Google Pay' })
  const [newUpiLoading, setNewUpiLoading] = useState(false)

  // Profile details form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    gender: user?.gender || 'unisex',
    avatar: user?.avatar?.url || ''
  })

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Preferences form state
  const [preferences, setPreferences] = useState({
    theme: user?.preferences?.theme || 'dark',
    language: user?.preferences?.language || 'en',
    currency: user?.preferences?.currency || 'INR',
    notifications: {
      email: user?.preferences?.notifications?.email ?? true,
      sms: user?.preferences?.notifications?.sms ?? true,
      push: user?.preferences?.notifications?.push ?? true,
      whatsapp: user?.preferences?.notifications?.whatsapp ?? true,
      orderUpdates: user?.preferences?.notifications?.orderUpdates ?? true,
      promoAlerts: user?.preferences?.notifications?.promoAlerts ?? true,
      priceDropAlerts: user?.preferences?.notifications?.priceDropAlerts ?? true
    },
    deliveryInstructions: user?.preferences?.deliveryInstructions || '',
    preferredSlot: user?.preferences?.preferredSlot || 'anytime'
  })

  // Fashion style preferences state
  const [fashionPreferences, setFashionPreferences] = useState({
    genderPreference: user?.fashionPreferences?.genderPreference || 'all',
    clothingSize: user?.fashionPreferences?.clothingSize || 'M',
    shoeSize: user?.fashionPreferences?.shoeSize || 'UK 8',
    styleVibe: user?.fashionPreferences?.styleVibe || 'Royal Couture'
  })

  // Sync state on user object changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        gender: user.gender || 'unisex',
        avatar: user.avatar?.url || ''
      })
      if (user.preferences) {
        setPreferences((prev) => ({
          ...prev,
          ...user.preferences,
          notifications: {
            ...prev.notifications,
            ...(user.preferences.notifications || {})
          }
        }))
      }
      if (user.fashionPreferences) {
        setFashionPreferences((prev) => ({
          ...prev,
          ...user.fashionPreferences
        }))
      }
    }
  }, [user])

  // Fetch addresses
  useEffect(() => {
    if (isAuthenticated) {
      userService.getAddresses()
        .then((res) => setAddresses(res?.data?.addresses || []))
        .catch(() => {})
    }
  }, [isAuthenticated])

  // If not authenticated, render pleasant guest card
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="container-custom py-20 min-h-[70vh] flex items-center justify-center">
        <div className={`card max-w-md p-8 text-center space-y-5 rounded-3xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white text-black'}`}>
          <div className="w-16 h-16 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center mx-auto">
            <FiLock size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold">Access Atelier Settings</h2>
          <p className="text-xs opacity-75 leading-relaxed">
            Please sign in to manage your profile, delivery addresses, high-security 2FA, notification alerts, and personalized fashion preferences.
          </p>
          <Link
            to="/login?redirect=/profile"
            className="block w-full py-3.5 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-luxury-darkGold shadow-glow transition-all"
          >
            Sign In to SKLP
          </Link>
        </div>
      </div>
    )
  }

  // ── Profile Save Handler ──
  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const res = await userService.updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        avatar: profileForm.avatar,
        fashionPreferences
      })
      if (res.data?.success && res.data?.user) {
        updateUser(res.data.user)
        toast.success('Personal profile details saved successfully! ✨')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Profile update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Preferences Save Handler ──
  const handlePreferencesSave = async (updatedPrefs, updatedFashion) => {
    setPrefsLoading(true)
    try {
      const res = await userService.updatePreferences({
        preferences: updatedPrefs || preferences,
        fashionPreferences: updatedFashion || fashionPreferences
      })
      if (res.data?.success && res.data?.user) {
        updateUser(res.data.user)
        toast.success('Display and notification settings updated! ⚙️')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update preferences')
    } finally {
      setPrefsLoading(false)
    }
  }

  // ── Password Save Handler ──
  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    setPasswordLoading(true)
    try {
      await userService.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      toast.success('Security password changed successfully!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Password update failed')
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── Address Handlers ──
  const handleSaveAddress = async (addressData) => {
    try {
      if (editingAddress?._id) {
        const res = await userService.updateAddress(editingAddress._id, addressData)
        setAddresses(res.data.addresses || ((prev) => prev.map((a) => a._id === editingAddress._id ? res.data.address : a)))
        toast.success('Address updated successfully!')
      } else {
        const res = await userService.addAddress(addressData)
        setAddresses(res.data.addresses || ((prev) => [...prev, res.data.address]))
        toast.success('New address added!')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Address save error')
    }
    setShowAddressModal(false)
    setEditingAddress(null)
  }

  const handleDeleteAddress = async (id) => {
    try {
      await userService.deleteAddress(id)
      setAddresses((prev) => prev.filter((a) => a._id !== id))
      toast.info('Address removed')
    } catch (error) {
      toast.error('Failed to remove address')
    }
  }

  // ── 2FA Toggle ──
  const handleToggle2FA = async () => {
    const newState = !user?.twoFactorEnabled
    try {
      const res = await userService.toggleTwoFactor(newState)
      updateUser({ ...user, twoFactorEnabled: res.data.twoFactorEnabled })
      toast.success(res.data.message)
    } catch (err) {
      toast.error('Failed to update 2FA status')
    }
  }

  // ── Saved UPI Handlers ──
  const handleAddUpi = async (e) => {
    e.preventDefault()
    if (!upiForm.upiId) return
    setNewUpiLoading(true)
    try {
      const res = await userService.addSavedUpi({ upiId: upiForm.upiId, label: upiForm.label })
      updateUser({
        ...user,
        savedPaymentMethods: {
          ...(user?.savedPaymentMethods || {}),
          savedUpi: res.data.savedUpi
        }
      })
      setUpiForm({ upiId: '', label: 'Google Pay' })
      toast.success('UPI ID saved for express checkout! 💳')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save UPI ID')
    } finally {
      setNewUpiLoading(false)
    }
  }

  const handleDeleteUpi = async (upiId) => {
    try {
      const res = await userService.deleteSavedUpi(upiId)
      updateUser({
        ...user,
        savedPaymentMethods: {
          ...(user?.savedPaymentMethods || {}),
          savedUpi: res.data.savedUpi
        }
      })
      toast.info('UPI ID removed')
    } catch (err) {
      toast.error('Failed to remove UPI ID')
    }
  }

  // ── Export User Data ──
  const handleExportData = async () => {
    try {
      toast.info('Preparing your data archive...')
      const res = await userService.exportUserData()
      if (res.data?.data) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data.data, null, 2))
        const downloadAnchor = document.createElement('a')
        downloadAnchor.setAttribute('href', dataStr)
        downloadAnchor.setAttribute('download', `sklp_user_data_${user?.customUserId || 'account'}.json`)
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
        toast.success('Account data exported successfully! 📂')
      }
    } catch (err) {
      toast.error('Data export failed')
    }
  }

  // ── Deactivate Account ──
  const handleDeactivateAccount = async () => {
    try {
      await userService.deactivateAccount({ reason: 'User requested closure via settings' })
      toast.info('Your account has been deactivated. Logging out...')
      logout()
      navigate('/login')
    } catch (err) {
      toast.error('Could not complete deactivation')
    }
  }

  const displayUserId = user?.customUserId || (user?._id ? `USER_${user._id.slice(-6).toUpperCase()}` : 'USER_ACCOUNT')
  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'
  const inputBg = isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black'

  return (
    <div className="container-custom py-10 min-h-screen">
      
      {/* ── HEADER USER PROFILE HERO CARD ── */}
      <div className={`rounded-3xl border p-6 md:p-8 mb-8 shadow-xl ${cardBg}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              {profileForm.avatar ? (
                <img
                  src={profileForm.avatar}
                  alt={user?.firstName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-luxury-gold shadow-glow"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-luxury-gold flex items-center justify-center text-luxury-black font-extrabold text-3xl font-serif shadow-glow">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 p-2 bg-luxury-gold text-black rounded-full shadow-md hover:scale-110 transition-transform"
                title="Change Avatar"
              >
                <FiEdit2 size={12} />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-serif font-bold">
                  {user?.firstName} {user?.lastName}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30">
                  {user?.role || 'Customer'}
                </span>
                {user?.isEmailVerified && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-green-500 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                    <FiCheckCircle size={10} /> Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs opacity-75 font-mono mt-1.5">
                <span>ID: {displayUserId}</span>
                {user?.phone && <span>• 📱 +91 {user.phone}</span>}
                {user?.email && <span>• ✉️ {user.email}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="px-4 py-2 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/20 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">Club Tier</p>
              <p className="text-sm font-serif font-extrabold">Gold Elite</p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-current/10 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Addresses</p>
              <p className="text-sm font-extrabold">{addresses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION BAR ── */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-black/20 rounded-2xl mb-8 scrollbar-none border border-current/5">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-luxury-gold text-luxury-black shadow-glow font-extrabold scale-[1.02]'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                    : 'text-gray-600 hover:text-black hover:bg-black/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="space-y-6">

        {/* ──────── TAB 1: PERSONAL & FASHION DETAILS ──────── */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left Col: Personal Form */}
            <div className={`lg:col-span-2 card p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-6`}>
              <div>
                <h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2">
                  <FiUser /> Personal Details & Identity
                </h2>
                <p className="text-xs opacity-65 mt-1">Keep your contact and profile representation up to date.</p>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-70">First Name *</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                      className={`w-full p-3.5 text-sm rounded-xl border outline-none font-semibold ${inputBg}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-70">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                      className={`w-full p-3.5 text-sm rounded-xl border outline-none font-semibold ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
                  >
                    {profileLoading ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : <FiSave size={16} />}
                    Save Profile Changes
                  </button>
                </div>
              </form>

              {/* Verified Contact Accounts */}
              <div className="border-t border-current/10 pt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-2">
                  <FiShield size={14} /> Verified Contact Credentials
                </h3>

                {/* Email Item */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-luxury-gold/10 text-luxury-gold">
                      <FiMail size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Primary Email</p>
                      <p className="text-sm font-semibold">{user?.email || 'No email registered'}</p>
                    </div>
                  </div>
                  {user?.isEmailVerified ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                      <FiCheckCircle size={12} /> Verified
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full">
                      Unverified
                    </span>
                  )}
                </div>

                {/* Phone Item */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-luxury-gold/10 text-luxury-gold">
                      <FiPhone size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Verified Mobile (SMS Alerts)</p>
                      <p className="text-sm font-bold font-mono">{user?.phone ? `+91 ${user.phone}` : 'No phone linked'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.isPhoneVerified && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                        <FiCheckCircle size={12} /> Linked
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPhoneModal(true)}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-luxury-gold/10 hover:bg-luxury-gold text-luxury-gold hover:text-black transition-all"
                    >
                      {user?.phone ? 'Change' : 'Link Phone'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Fashion Persona & Sizes */}
            <div className={`card p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-5 flex flex-col justify-between`}>
              <div>
                <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2">
                  <FiTag /> Fashion Identity & Sizes
                </h3>
                <p className="text-xs opacity-65 mt-1">Personalize recommendation algorithms for your exact fit.</p>

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Style Persona</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Royal Couture', 'Minimal Luxe', 'Ethnic Festive', 'Street Luxury'].map((vibe) => (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => setFashionPreferences((p) => ({ ...p, styleVibe: vibe }))}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left truncate ${
                            fashionPreferences.styleVibe === vibe
                              ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow'
                              : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'
                          }`}
                        >
                          {vibe}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Default Clothing Size</label>
                    <div className="flex flex-wrap gap-2">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFashionPreferences((p) => ({ ...p, clothingSize: s }))}
                          className={`w-10 h-10 rounded-xl text-xs font-bold border transition-all ${
                            fashionPreferences.clothingSize === s
                              ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow'
                              : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Footwear Size (UK/India)</label>
                    <div className="flex flex-wrap gap-2">
                      {['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'].map((shoe) => (
                        <button
                          key={shoe}
                          type="button"
                          onClick={() => setFashionPreferences((p) => ({ ...p, shoeSize: shoe }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            fashionPreferences.shoeSize === shoe
                              ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow'
                              : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'
                          }`}
                        >
                          {shoe}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePreferencesSave(preferences, fashionPreferences)}
                disabled={prefsLoading}
                className="w-full py-3 bg-luxury-gold/15 text-luxury-gold hover:bg-luxury-gold hover:text-black border border-luxury-gold/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                {prefsLoading ? 'Saving Fits...' : 'Save Fashion Fit Preferences'}
              </button>
            </div>
          </div>
        )}

        {/* ──────── TAB 2: SAVED ADDRESSES ──────── */}
        {activeTab === 'addresses' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2">
                  <FiMapPin /> Saved Delivery Addresses
                </h2>
                <p className="text-xs opacity-65">Manage multiple destination addresses with pinpoint precision.</p>
              </div>
              <button
                onClick={() => { setEditingAddress(null); setShowAddressModal(true) }}
                className="flex items-center gap-2 px-5 py-2.5 bg-luxury-gold text-luxury-black font-extrabold rounded-xl hover:bg-luxury-darkGold transition-all text-xs uppercase tracking-wider shadow-glow"
              >
                <FiPlus size={16} /> Add New Address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl border ${cardBg}`}>
                <FiMapPin size={48} className="text-luxury-gold mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-serif font-bold">No Delivery Addresses Added</h3>
                <p className="text-xs opacity-65 mb-5 max-w-sm mx-auto mt-1">
                  Save your home, office, or gift delivery destination addresses for swift single-click checkout.
                </p>
                <button
                  onClick={() => { setEditingAddress(null); setShowAddressModal(true) }}
                  className="px-6 py-3 bg-luxury-gold text-luxury-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow"
                >
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr, i) => (
                  <div
                    key={addr._id || i}
                    className={`rounded-3xl border-2 p-5 transition-all relative ${cardBg} ${
                      addr.isDefault ? 'border-luxury-gold shadow-glow' : 'border-current/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          {addr.label || 'Home'}
                        </span>
                        {addr.isDefault && (
                          <span className="px-2.5 py-1 bg-luxury-gold text-luxury-black rounded-full text-[10px] font-extrabold uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingAddress(addr); setShowAddressModal(true) }}
                          className="p-2 rounded-xl hover:bg-luxury-gold/15 text-luxury-gold transition-colors"
                          title="Edit Address"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr._id)}
                          className="p-2 rounded-xl hover:bg-red-500/15 text-red-400 transition-colors"
                          title="Delete Address"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-semibold leading-relaxed">
                      {addr.street}
                    </p>
                    {addr.landmark && (
                      <p className="text-xs opacity-75 mt-0.5">Landmark: {addr.landmark}</p>
                    )}
                    <p className="text-xs opacity-75 mt-1">
                      {addr.city}, {addr.state} – <span className="font-mono font-bold">{addr.pincode || addr.postalCode}</span>
                    </p>
                    {addr.phone && (
                      <p className="text-xs opacity-60 font-mono mt-2">📞 +91 {addr.phone}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 3: DISPLAY & REGIONAL PREFERENCES ──────── */}
        {activeTab === 'display' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in max-w-4xl">
            {/* Theme & Visuals */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-6`}>
              <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2">
                <FiMoon /> Visual Theme & Contrast
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-current/10">
                  <div>
                    <p className="text-sm font-bold">Dark Mode Experience</p>
                    <p className="text-xs opacity-65">Sleek obsidian background with luxury gold accents</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl border transition-all duration-300 ${
                      isDarkMode ? 'bg-luxury-gold text-black shadow-glow' : 'bg-black text-luxury-gold'
                    }`}
                  >
                    {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
                  </button>
                </div>

                {/* Multi-language */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">
                    Display Language
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'en', name: 'English' },
                      { code: 'te', name: 'తెలుగు (Telugu)' },
                      { code: 'hi', name: 'हिन्दी (Hindi)' }
                    ].map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          changeLanguage(l.code)
                          setPreferences((p) => ({ ...p, language: l.code }))
                        }}
                        className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                          language === l.code
                            ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow'
                            : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multi-Currency */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">
                    Preferred Currency
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(RATES).map((currKey) => (
                      <button
                        key={currKey}
                        type="button"
                        onClick={() => {
                          setCurrency(currKey)
                          setPreferences((p) => ({ ...p, currency: currKey }))
                        }}
                        className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                          currency === currKey
                            ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow'
                            : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'
                        }`}
                      >
                        {RATES[currKey].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery instructions & slot */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-6 flex flex-col justify-between`}>
              <div>
                <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2">
                  <FiTruck /> Default Courier Preferences
                </h3>

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">
                      Preferred Delivery Window
                    </label>
                    <select
                      value={preferences.preferredSlot}
                      onChange={(e) => setPreferences((p) => ({ ...p, preferredSlot: e.target.value }))}
                      className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                    >
                      <option value="anytime">Anytime during business hours (9 AM - 8 PM)</option>
                      <option value="morning">Morning Slot (9 AM - 1 PM)</option>
                      <option value="afternoon">Afternoon Slot (1 PM - 5 PM)</option>
                      <option value="evening">Evening Slot (5 PM - 8 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">
                      Special Delivery Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={preferences.deliveryInstructions}
                      onChange={(e) => setPreferences((p) => ({ ...p, deliveryInstructions: e.target.value }))}
                      placeholder="e.g. Call before delivery, leave with security concierge if unavailable..."
                      className={`w-full p-3 text-xs rounded-xl border outline-none resize-none ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePreferencesSave(preferences, fashionPreferences)}
                disabled={prefsLoading}
                className="w-full py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all"
              >
                {prefsLoading ? 'Saving...' : 'Save Display & Logistic Preferences'}
              </button>
            </div>
          </div>
        )}

        {/* ──────── TAB 4: NOTIFICATIONS & ALERTS ──────── */}
        {activeTab === 'notifications' && (
          <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} max-w-3xl space-y-6 animate-fade-in`}>
            <div>
              <h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2">
                <FiBell /> Notification & Communication Alerts
              </h2>
              <p className="text-xs opacity-65 mt-1">Configure your preferred channels for updates and private couture drops.</p>
            </div>

            <div className="space-y-3 divide-y divide-current/10">
              {[
                { key: 'orderUpdates', title: 'Live Order Tracking & Dispatch Alerts', desc: 'Real-time SMS & Email dispatch notifications with courier links' },
                { key: 'whatsapp', title: 'WhatsApp Concierge Updates', desc: 'Receive OTPs and delivery status directly on your WhatsApp number' },
                { key: 'promoAlerts', title: 'Private Couture & Festive Drops', desc: 'Early VIP access to limited-edition festive garments and sales' },
                { key: 'priceDropAlerts', title: 'Wishlist Price Drop Alerts', desc: 'Get alerted instantly when items on your wishlist go on discount' },
                { key: 'email', title: 'Digest & Invoicing Emails', desc: 'Receive digital tax invoices and monthly style recommendations' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between pt-4">
                  <div>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-xs opacity-65 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = {
                        ...preferences,
                        notifications: {
                          ...preferences.notifications,
                          [item.key]: !preferences.notifications[item.key]
                        }
                      }
                      setPreferences(next)
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      preferences.notifications[item.key] ? 'bg-luxury-gold' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        preferences.notifications[item.key] ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-current/10">
              <button
                type="button"
                onClick={() => handlePreferencesSave(preferences, fashionPreferences)}
                disabled={prefsLoading}
                className="px-6 py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold shadow-glow transition-all"
              >
                {prefsLoading ? 'Saving...' : 'Save Notification Preferences'}
              </button>
            </div>
          </div>
        )}

        {/* ──────── TAB 5: PAYMENT METHODS & UPI ──────── */}
        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in max-w-4xl">
            {/* Left: Saved UPI IDs */}
            <div className={`lg:col-span-2 p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-6`}>
              <div>
                <h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2">
                  <FiCreditCard /> Saved UPI IDs (Express Checkout)
                </h2>
                <p className="text-xs opacity-65 mt-1">Link your Virtual Payment Address (VPA) for 1-click Razorpay verification.</p>
              </div>

              {/* Form to add UPI */}
              <form onSubmit={handleAddUpi} className="flex gap-2">
                <input
                  type="text"
                  value={upiForm.upiId}
                  onChange={(e) => setUpiForm((p) => ({ ...p, upiId: e.target.value }))}
                  placeholder="e.g. yourname@okhdfcbank"
                  className={`flex-1 p-3 text-xs rounded-xl border outline-none font-semibold ${inputBg}`}
                  required
                />
                <button
                  type="submit"
                  disabled={newUpiLoading || !upiForm.upiId}
                  className="px-5 py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold disabled:opacity-50 shadow-glow"
                >
                  {newUpiLoading ? 'Saving...' : 'Add UPI ID'}
                </button>
              </form>

              {/* List of saved UPIs */}
              <div className="space-y-2">
                {(user?.savedPaymentMethods?.savedUpi?.length > 0) ? (
                  user.savedPaymentMethods.savedUpi.map((upi) => (
                    <div
                      key={upi._id || upi.upiId}
                      className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-luxury-gold/15 text-luxury-gold font-bold text-xs">
                          UPI
                        </div>
                        <div>
                          <p className="text-sm font-mono font-bold">{upi.upiId}</p>
                          <p className="text-[10px] opacity-60 uppercase">{upi.label || 'UPI Account'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteUpi(upi._id || upi.upiId)}
                        className="p-2 rounded-xl hover:bg-red-500/15 text-red-400 transition-colors"
                        title="Remove UPI"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs opacity-60 italic py-2">No UPI payment IDs saved yet.</p>
                )}
              </div>
            </div>

            {/* Right: SKLP Rewards Wallet */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-4 flex flex-col justify-between`}>
              <div>
                <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2">
                  <FiTag /> SKLP Atelier Wallet
                </h3>
                <div className="mt-4 p-5 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/30 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">Available Reward Coins</p>
                  <p className="text-3xl font-serif font-extrabold mt-1 text-luxury-gold">500 Coins</p>
                  <p className="text-[10px] opacity-75 mt-1">Worth ₹500 discount on your next checkout</p>
                </div>
                <div className="mt-4 space-y-2 text-xs opacity-75">
                  <p>• Earn 5% back on all luxury couture orders</p>
                  <p>• Automatically applicable at Checkout</p>
                </div>
              </div>

              <Link
                to="/products"
                className="block text-center w-full py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow"
              >
                Shop & Earn More
              </Link>
            </div>
          </div>
        )}

        {/* ──────── TAB 6: SECURITY & PRIVACY ──────── */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in max-w-4xl">
            {/* Password Change */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-5`}>
              <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2">
                <FiLock /> Change Account Password
              </h3>

              <form onSubmit={handlePasswordSave} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Current Password</label>
                  <div className="relative">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                      className={`w-full p-3 pr-10 text-xs rounded-xl border outline-none font-semibold ${inputBg}`}
                      required
                    />
                    <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-3 text-luxury-gold">
                      {showOld ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">New Password (Min 8 chars)</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      className={`w-full p-3 pr-10 text-xs rounded-xl border outline-none font-semibold ${inputBg}`}
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3 text-luxury-gold">
                      {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className={`w-full p-3 text-xs rounded-xl border outline-none font-semibold ${inputBg} ${
                      passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow hover:bg-luxury-darkGold transition-all disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* 2FA & Privacy / Data Export */}
            <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${cardBg} space-y-6 flex flex-col justify-between`}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2">
                    <FiShield /> Two-Factor Authentication (2FA)
                  </h3>
                  <div className="flex items-center justify-between mt-3 p-4 rounded-2xl border border-current/10">
                    <div>
                      <p className="text-sm font-bold">Require OTP on Unknown Login</p>
                      <p className="text-xs opacity-65">Protects unauthorized access via SMS OTP verification</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggle2FA}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border transition-all ${
                        user?.twoFactorEnabled
                          ? 'bg-green-500/15 text-green-500 border-green-500/30 shadow-glow'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-serif font-bold text-luxury-gold flex items-center gap-2">
                    <FiDownload /> Data Privacy & Download
                  </h4>
                  <p className="text-xs opacity-65 mt-1 mb-3">
                    Download an encrypted JSON file of your account, addresses, orders, and wishlist.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full py-2.5 rounded-xl border border-current/20 hover:border-luxury-gold text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiDownload size={14} /> Export My Account Data (.JSON)
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-red-500/20">
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(true)}
                  className="w-full py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Deactivate / Close Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADDRESS MODAL ── */}
      {showAddressModal && (
        <AddressModal
          address={editingAddress}
          onSave={handleSaveAddress}
          onClose={() => { setShowAddressModal(false); setEditingAddress(null) }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ── PHONE LINK OTP MODAL ── */}
      {showPhoneModal && (
        <PhoneModal
          onClose={() => setShowPhoneModal(false)}
          onPhoneUpdated={(updatedUser) => updateUser(updatedUser)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ── AVATAR CHOOSER MODAL ── */}
      {showAvatarModal && (
        <AvatarModal
          currentAvatar={profileForm.avatar}
          onSelectAvatar={(avatarUrl) => {
            setProfileForm((p) => ({ ...p, avatar: avatarUrl }))
            setShowAvatarModal(false)
            userService.updateProfile({ avatar: avatarUrl }).then((res) => {
              if (res.data?.user) updateUser(res.data.user)
              toast.success('Avatar updated! 👑')
            }).catch(() => {})
          }}
          onClose={() => setShowAvatarModal(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ── DEACTIVATE ACCOUNT CONFIRMATION MODAL ── */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 animate-fade-in shadow-2xl ${cardBg}`}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-3">
              <FiAlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-center">Deactivate Account?</h3>
            <p className="text-xs opacity-75 text-center mt-2 leading-relaxed">
              Are you sure you want to deactivate your SKLP account? You will be logged out and your sessions invalidated.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-current/20 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-red-700 shadow-md"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
