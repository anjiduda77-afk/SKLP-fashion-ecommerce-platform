import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  FiBell, FiCreditCard,
  FiTag, FiTruck, FiCheck, FiShoppingBag, FiHeart, FiArrowRight, FiChevronRight,
  FiMenu, FiHome
} from 'react-icons/fi'


const PRESET_AVATARS = [
  { id: 'gold_crown',      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', label: 'Golden Royalty' },
  { id: 'velvet_noir',     url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', label: 'Velvet Noir' },
  { id: 'silk_couture',    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', label: 'Silk Couture' },
  { id: 'emerald_luxe',    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80', label: 'Emerald Luxe' },
  { id: 'atelier_classic', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', label: 'Atelier Classic' },
  { id: 'ivory_grace',     url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', label: 'Ivory Grace' }
]

function AddressModal({ address, onSave, onClose, isDarkMode }) {
  const [form, setForm] = useState(address || { label: 'Home', type: 'home', street: '', landmark: '', city: '', state: '', pincode: '', postalCode: '', country: 'India', phone: '', isDefault: false })
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value, ...(name === 'pincode' ? { postalCode: value } : {}), ...(name === 'postalCode' ? { pincode: value } : {}) }))
  }
  const handleLabelSelect = (label) => { const type = label === 'Home' ? 'home' : label === 'Work' ? 'office' : 'other'; setForm((prev) => ({ ...prev, label, type })) }
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.street || !form.city || !form.state || (!form.pincode && !form.postalCode)) { toast.error('Please complete all required address fields'); return }
    onSave(form)
  }
  const bg = isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'
  const inp = isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-lg rounded-3xl border p-6 animate-fade-in shadow-2xl ${bg}`}>
        <div className="flex items-center justify-between mb-5 border-b border-current/10 pb-3">
          <h3 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2"><FiMapPin size={20} /> {address ? 'Edit Delivery Address' : 'Add New Delivery Address'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-luxury-gold/10 hover:text-luxury-gold transition-colors"><FiX size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Address Type</label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map((l) => (
                <button key={l} type="button" onClick={() => handleLabelSelect(l)} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${form.label === l ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow' : isDarkMode ? 'border-white/10 text-white hover:border-luxury-gold/50' : 'border-black/10 text-black hover:border-luxury-gold/50'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">House No. / Building / Street *</label><input name="street" value={form.street} onChange={handleChange} placeholder="e.g. Flat 402, Royal Residency" className={`w-full p-3 text-sm rounded-xl border outline-none ${inp}`} required /></div>
          <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Landmark (Optional)</label><input name="landmark" value={form.landmark || ''} onChange={handleChange} placeholder="e.g. Near City Center Mall" className={`w-full p-3 text-sm rounded-xl border outline-none ${inp}`} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">City *</label><input name="city" value={form.city} onChange={handleChange} placeholder="City" className={`w-full p-3 text-sm rounded-xl border outline-none ${inp}`} required /></div>
            <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">State *</label><input name="state" value={form.state} onChange={handleChange} placeholder="State" className={`w-full p-3 text-sm rounded-xl border outline-none ${inp}`} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">PIN Code *</label><input name="pincode" value={form.pincode || form.postalCode || ''} onChange={handleChange} placeholder="6-digit PIN" maxLength={6} className={`w-full p-3 text-sm rounded-xl border outline-none ${inp}`} required /></div>
            <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Contact Phone</label><input name="phone" value={form.phone || ''} onChange={handleChange} placeholder="10-digit mobile" maxLength={10} className={`w-full p-3 text-sm rounded-xl border outline-none ${inp}`} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold pt-1"><input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} className="accent-yellow-400 w-4 h-4 rounded" /><span>Set as default delivery address for rapid checkout</span></label>
          <div className="flex gap-3 pt-3 border-t border-current/10">
            <button type="button" onClick={onClose} className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-gray-100'}`}>Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold shadow-glow transition-all">Save Address</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PhoneModal({ onClose, onPhoneUpdated, isDarkMode }) {
  const [step, setStep] = useState('phone')
  const [newPhone, setNewPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const bg = isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'
  const inp = isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'
  const handleSendOTP = async (e) => {
    e.preventDefault()
    const clean = newPhone.replace(/\D/g, '')
    if (!/^[6-9][0-9]{9}$/.test(clean)) { toast.error('Please enter a valid 10-digit Indian mobile number'); return }
    setLoading(true)
    try {
      const res = await authService.sendLinkPhoneOTP(clean)
      setStep('otp'); toast.success(res.data?.message || `OTP sent to +91 ${clean}`)
      if (res.data?.devOtp) { toast.info(`Verification Code: ${res.data.devOtp}`, { autoClose: 10000 }); setOtp(res.data.devOtp) }
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to send OTP') }
    finally { setLoading(false) }
  }
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (otp.length < 6) { toast.error('Please enter 6-digit OTP'); return }
    setLoading(true)
    try {
      const clean = newPhone.replace(/\D/g, '')
      const res = await authService.verifyLinkPhone(clean, otp)
      if (res.data?.success && res.data?.user) { onPhoneUpdated(res.data.user); toast.success('Mobile number verified & linked!'); onClose() }
    } catch (err) { toast.error(err?.response?.data?.message || 'Invalid or expired OTP') }
    finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-sm rounded-3xl border p-6 animate-fade-in shadow-2xl ${bg}`}>
        <div className="flex items-center justify-between mb-4 border-b border-current/10 pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2 text-luxury-gold"><FiSmartphone /> Verify Mobile Number</h3>
          <button onClick={onClose} className="p-1 hover:text-luxury-gold"><FiX size={20} /></button>
        </div>
        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <p className="text-xs opacity-75 leading-relaxed">Enter your 10-digit mobile number to receive SMS verification.</p>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-sm font-bold opacity-60">+91</span>
              <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" maxLength={10} className={`pl-14 w-full p-3 rounded-xl border text-sm font-bold outline-none ${inp}`} autoFocus required />
            </div>
            <button type="submit" disabled={loading || newPhone.length < 10} className="w-full py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold transition-all disabled:opacity-50 shadow-glow">{loading ? 'Sending OTP...' : 'Send Verification OTP'}</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <p className="text-xs opacity-75">Enter the 6-digit code sent to <span className="font-bold text-luxury-gold">+91 {newPhone}</span></p>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="0 0 0 0 0 0" maxLength={6} className={`w-full text-center text-xl font-bold tracking-widest p-3 rounded-xl border outline-none ${inp}`} autoFocus required />
            <button type="submit" disabled={loading || otp.length < 6} className="w-full py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold transition-all disabled:opacity-50 shadow-glow">{loading ? 'Verifying...' : 'Verify & Link Mobile'}</button>
            <button type="button" onClick={() => { setStep('phone'); setOtp('') }} className="w-full text-xs opacity-60 hover:opacity-100 text-center">Change phone number</button>
          </form>
        )}
      </div>
    </div>
  )
}

function AvatarModal({ currentAvatar, onSelectAvatar, onClose, isDarkMode }) {
  const [customUrl, setCustomUrl] = useState('')
  const bg = isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'
  const inp = isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200'
  const handleCustomSubmit = (e) => { e.preventDefault(); if (!customUrl.trim()) return; onSelectAvatar(customUrl.trim()) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-md rounded-3xl border p-6 animate-fade-in shadow-2xl ${bg}`}>
        <div className="flex items-center justify-between mb-4 border-b border-current/10 pb-3">
          <h3 className="text-lg font-bold text-luxury-gold flex items-center gap-2 font-serif"><FiUser /> Choose Atelier Avatar</h3>
          <button onClick={onClose} className="p-1 hover:text-luxury-gold"><FiX size={20} /></button>
        </div>
        <p className="text-xs opacity-75 mb-4">Select a luxury couture avatar or provide an image link:</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PRESET_AVATARS.map((av) => {
            const isSelected = currentAvatar === av.url
            return (
              <button key={av.id} type="button" onClick={() => onSelectAvatar(av.url)} className={`relative group rounded-2xl overflow-hidden border-2 transition-all p-1 ${isSelected ? 'border-luxury-gold shadow-glow scale-105' : 'border-transparent hover:border-luxury-gold/50'}`}>
                <img src={av.url} alt={av.label} className="w-full aspect-square object-cover rounded-xl" />
                <p className="text-[9px] font-bold text-center mt-1 truncate">{av.label}</p>
                {isSelected && <div className="absolute top-2 right-2 bg-luxury-gold text-black rounded-full p-0.5"><FiCheck size={10} /></div>}
              </button>
            )
          })}
        </div>
        <form onSubmit={handleCustomSubmit} className="space-y-3 pt-3 border-t border-current/10">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-70">Custom Image Link (URL)</label>
          <div className="flex gap-2">
            <input type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className={`flex-1 p-2.5 rounded-xl border text-xs outline-none ${inp}`} />
            <button type="submit" disabled={!customUrl.trim()} className="px-4 py-2.5 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-luxury-darkGold disabled:opacity-50">Apply</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Profile() {
  const { t } = useTranslation()
  const { user, updateUser, isAuthenticated, loading: authLoading } = useAuth()
  const { isDarkMode, toggleTheme, language, changeLanguage } = useTheme()
  const { currency, setCurrency, RATES } = useCurrency()

  const TABS = [
    { id: 'profile',       label: t('profile.personalDetails', 'Personal Details'),     icon: FiUser,       desc: t('profile.personalInfo', 'Name, contact, avatar') },
    { id: 'addresses',     label: t('profile.savedAddresses', 'Saved Addresses'),       icon: FiMapPin,     desc: t('profile.noAddressesDesc', 'Delivery destinations') },
    { id: 'security',      label: t('profile.securityPassword', 'Security & Password'),   icon: FiLock,       desc: t('profile.accountSecurity', 'Password & account info') },
    { id: 'payments',      label: t('profile.paymentMethods', 'Payment Methods & UPI'), icon: FiCreditCard, desc: t('profile.savedUpi', 'UPI & wallet') },
    { id: 'display',       label: t('profile.displayRegion', 'Display & Region'),      icon: FiGlobe,      desc: t('profile.visualTheme', 'Theme, language, currency') },
    { id: 'notifications', label: t('profile.notifications', 'Notifications'),         icon: FiBell,       desc: t('profile.notificationAlerts', 'Alerts & updates') },
  ]


  const [activeTab, setActiveTab] = useState('profile')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [upiForm, setUpiForm] = useState({ upiId: '', label: 'Google Pay' })
  const [newUpiLoading, setNewUpiLoading] = useState(false)
  const [profileForm, setProfileForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', bio: user?.bio || '', gender: user?.gender || 'unisex', avatar: user?.avatar?.url || '' })
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [preferences, setPreferences] = useState({
    theme: user?.preferences?.theme || 'dark', language: user?.preferences?.language || 'en', currency: user?.preferences?.currency || 'INR',
    notifications: { email: user?.preferences?.notifications?.email ?? true, sms: user?.preferences?.notifications?.sms ?? true, push: user?.preferences?.notifications?.push ?? true, whatsapp: user?.preferences?.notifications?.whatsapp ?? true, orderUpdates: user?.preferences?.notifications?.orderUpdates ?? true, promoAlerts: user?.preferences?.notifications?.promoAlerts ?? true, priceDropAlerts: user?.preferences?.notifications?.priceDropAlerts ?? true },
    deliveryInstructions: user?.preferences?.deliveryInstructions || '', preferredSlot: user?.preferences?.preferredSlot || 'anytime'
  })
  const [fashionPreferences, setFashionPreferences] = useState({ genderPreference: user?.fashionPreferences?.genderPreference || 'all', clothingSize: user?.fashionPreferences?.clothingSize || 'M', shoeSize: user?.fashionPreferences?.shoeSize || 'UK 8', styleVibe: user?.fashionPreferences?.styleVibe || 'Royal Couture' })

  useEffect(() => {
    if (user) {
      setProfileForm({ firstName: user.firstName || '', lastName: user.lastName || '', bio: user.bio || '', gender: user.gender || 'unisex', avatar: user.avatar?.url || '' })
      if (user.preferences) setPreferences((prev) => ({ ...prev, ...user.preferences, notifications: { ...prev.notifications, ...(user.preferences.notifications || {}) } }))
      if (user.fashionPreferences) setFashionPreferences((prev) => ({ ...prev, ...user.fashionPreferences }))
    }
  }, [user])

  useEffect(() => {
    if (isAuthenticated) userService.getAddresses().then((res) => setAddresses(res?.data?.addresses || [])).catch(() => {})
  }, [isAuthenticated])

  const handleTabChange = (tabId) => { setActiveTab(tabId); setSidebarOpen(false) }

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="container-custom py-20 min-h-[70vh] flex items-center justify-center">
        <div className={`card max-w-md p-8 text-center space-y-5 rounded-3xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white text-black'}`}>
          <div className="w-16 h-16 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center mx-auto"><FiLock size={32} /></div>
          <h2 className="text-2xl font-serif font-bold">Access Atelier Settings</h2>
          <p className="text-xs opacity-75 leading-relaxed">Please sign in to manage your profile, delivery addresses, notification alerts, and account settings.</p>
          <Link to="/login?redirect=/profile" className="block w-full py-3.5 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-luxury-darkGold shadow-glow transition-all">Sign In to SKLP</Link>
        </div>
      </div>
    )
  }

  const handleProfileSave = async (e) => {
    e.preventDefault(); setProfileLoading(true)
    try {
      const res = await userService.updateProfile({ firstName: profileForm.firstName.trim(), lastName: profileForm.lastName.trim(), avatar: profileForm.avatar, fashionPreferences })
      if (res.data?.success && res.data?.user) { updateUser(res.data.user); toast.success('Personal profile details saved successfully!') }
    } catch (err) { toast.error(err?.response?.data?.message || 'Profile update failed') }
    finally { setProfileLoading(false) }
  }
  const handlePreferencesSave = async (updatedPrefs, updatedFashion) => {
    setPrefsLoading(true)
    try {
      const res = await userService.updatePreferences({ preferences: updatedPrefs || preferences, fashionPreferences: updatedFashion || fashionPreferences })
      if (res.data?.success && res.data?.user) { updateUser(res.data.user); toast.success('Settings updated!') }
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update preferences') }
    finally { setPrefsLoading(false) }
  }
  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return }
    if (passwordForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return }
    setPasswordLoading(true)
    try { await userService.changePassword(passwordForm.oldPassword, passwordForm.newPassword); toast.success('Password changed!'); setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }) }
    catch (err) { toast.error(err?.response?.data?.message || 'Password update failed') }
    finally { setPasswordLoading(false) }
  }
  const handleSaveAddress = async (addressData) => {
    try {
      if (editingAddress?._id) { const res = await userService.updateAddress(editingAddress._id, addressData); setAddresses(res.data.addresses || ((prev) => prev.map((a) => a._id === editingAddress._id ? res.data.address : a))); toast.success('Address updated!') }
      else { const res = await userService.addAddress(addressData); setAddresses(res.data.addresses || ((prev) => [...prev, res.data.address])); toast.success('New address added!') }
    } catch (err) { toast.error(err?.response?.data?.message || 'Address save error') }
    setShowAddressModal(false); setEditingAddress(null)
  }
  const handleDeleteAddress = async (id) => {
    try { await userService.deleteAddress(id); setAddresses((prev) => prev.filter((a) => a._id !== id)); toast.info('Address removed') }
    catch { toast.error('Failed to remove address') }
  }
  const handleAddUpi = async (e) => {
    e.preventDefault(); if (!upiForm.upiId) return; setNewUpiLoading(true)
    try { const res = await userService.addSavedUpi({ upiId: upiForm.upiId, label: upiForm.label }); updateUser({ ...user, savedPaymentMethods: { ...(user?.savedPaymentMethods || {}), savedUpi: res.data.savedUpi } }); setUpiForm({ upiId: '', label: 'Google Pay' }); toast.success('UPI ID saved!') }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed to save UPI ID') }
    finally { setNewUpiLoading(false) }
  }
  const handleDeleteUpi = async (upiId) => {
    try { const res = await userService.deleteSavedUpi(upiId); updateUser({ ...user, savedPaymentMethods: { ...(user?.savedPaymentMethods || {}), savedUpi: res.data.savedUpi } }); toast.info('UPI ID removed') }
    catch { toast.error('Failed to remove UPI ID') }
  }

  const displayUserId = user?.customUserId || (user?._id ? `USER_${user._id.slice(-6).toUpperCase()}` : 'USER_ACCOUNT')
  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-black'
  const inputBg = isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black'
  const sidebarBg = isDarkMode ? 'bg-[#111111] border-white/8' : 'bg-white border-gray-200'

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      <div className={`px-5 pt-6 pb-5 border-b ${isDarkMode ? 'border-white/8' : 'border-gray-100'}`}>
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-luxury-gold flex items-center justify-center shadow-glow flex-shrink-0"><span className="text-luxury-black font-extrabold text-sm font-serif">S</span></div>
          <div>
            <p className="text-luxury-gold font-extrabold text-sm tracking-widest uppercase font-serif leading-none">SKLP</p>
            <p className={`text-[9px] uppercase tracking-widest font-bold leading-none mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>Fashion</p>
          </div>
        </Link>
      </div>
      <div className="px-5 pt-5 pb-2">
        <p className={`text-[9px] font-extrabold uppercase tracking-[0.2em] ${isDarkMode ? 'text-white/30' : 'text-gray-400'}`}>Account Settings</p>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group relative ${isActive ? 'bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/25' : isDarkMode ? 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-transparent'}`}>
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-luxury-gold rounded-r-full" />}
              <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${isActive ? 'bg-luxury-gold/20 text-luxury-gold' : isDarkMode ? 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/70' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className={`text-[12px] font-bold leading-tight truncate ${isActive ? 'text-luxury-gold' : ''}`}>{tab.label}</p>
                <p className={`text-[10px] leading-tight truncate mt-0.5 ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>{tab.desc}</p>
              </div>
            </button>
          )
        })}
      </nav>
      <div className={`mt-auto px-4 py-4 border-t ${isDarkMode ? 'border-white/8' : 'border-gray-100'}`}>
        <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5 border border-white/8' : 'bg-gray-50 border border-gray-200'}`}>
          {profileForm.avatar ? <img src={profileForm.avatar} alt={user?.firstName} className="w-9 h-9 rounded-full object-cover border border-luxury-gold/40 flex-shrink-0" /> : <div className="w-9 h-9 rounded-full bg-luxury-gold flex items-center justify-center text-luxury-black font-extrabold text-sm font-serif flex-shrink-0 shadow-glow">{user?.firstName?.[0]?.toUpperCase() || 'U'}</div>}
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.firstName} {user?.lastName}</p>
            <p className={`text-[10px] truncate font-mono ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>{displayUserId}</p>
          </div>
          <Link to="/" className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-white/10 text-white/40 hover:text-white/80' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'}`} title="Go to Store"><FiHome size={13} /></Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-luxury-black' : 'bg-gray-100'}`}>
      <aside className={`hidden lg:flex flex-col w-64 xl:w-72 min-h-screen sticky top-0 h-screen flex-shrink-0 border-r ${sidebarBg}`}>
        <SidebarInner />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl z-50 border-r ${sidebarBg}`}>
            <button onClick={() => setSidebarOpen(false)} className={`absolute top-4 right-4 p-2 rounded-xl z-10 transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500'}`}><FiX size={18} /></button>
            <SidebarInner />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <div className={`lg:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-30 ${isDarkMode ? 'bg-[#111111] border-white/8' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-black'}`} aria-label="Open navigation menu"><FiMenu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-luxury-gold flex items-center justify-center flex-shrink-0"><span className="text-luxury-black font-extrabold text-xs font-serif">S</span></div>
            <span className={`text-sm font-extrabold tracking-wide ${isDarkMode ? 'text-white' : 'text-black'}`}>{TABS.find(t => t.id === activeTab)?.label || 'Settings'}</span>
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className={`rounded-2xl border p-5 md:p-6 mb-6 ${isDarkMode ? 'bg-luxury-charcoal border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative group flex-shrink-0">
                  {profileForm.avatar ? <img src={profileForm.avatar} alt={user?.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-luxury-gold shadow-glow" /> : <div className="w-16 h-16 rounded-full bg-luxury-gold flex items-center justify-center text-luxury-black font-extrabold text-2xl font-serif shadow-glow">{user?.firstName?.[0]?.toUpperCase() || 'U'}</div>}
                  <button type="button" onClick={() => setShowAvatarModal(true)} className="absolute bottom-0 right-0 p-1.5 bg-luxury-gold text-black rounded-full shadow-md hover:scale-110 transition-transform" title="Change Avatar"><FiEdit2 size={11} /></button>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className={`text-xl md:text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.firstName} {user?.lastName}</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30">{user?.role || 'Customer'}</span>
                    {user?.isEmailVerified && <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20"><FiCheckCircle size={9} /> Verified</span>}
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 text-[11px] font-mono mt-1 ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                    <span>ID: {displayUserId}</span>
                    {user?.phone && <span>+91 {user.phone}</span>}
                    {user?.email && <span>{user.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                <div className="px-3 py-1.5 rounded-xl bg-luxury-gold/10 border border-luxury-gold/20 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-luxury-gold">Club Tier</p>
                  <p className="text-sm font-serif font-extrabold text-luxury-gold">Gold Elite</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-center ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Addresses</p>
                  <p className="text-sm font-extrabold">{addresses.length}</p>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
              <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-6`}>
                <div><h2 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2"><FiUser /> Personal Details</h2><p className="text-xs opacity-65 mt-1">Manage your identity and primary contact credentials.</p></div>
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-70">First Name *</label><input type="text" value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className={`w-full p-3 text-sm rounded-xl border outline-none font-semibold ${inputBg}`} required /></div>
                    <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-70">Last Name</label><input type="text" value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className={`w-full p-3 text-sm rounded-xl border outline-none font-semibold ${inputBg}`} /></div>
                  </div>
                  <div><label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-70">Bio / About (Optional)</label><input type="text" value={profileForm.bio || ''} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Short bio or shopping notes" className={`w-full p-3 text-sm rounded-xl border outline-none font-semibold ${inputBg}`} /></div>
                  <div className="pt-2">
                    <button type="submit" disabled={profileLoading} className="px-6 py-3 bg-luxury-gold text-luxury-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow disabled:opacity-50 flex items-center gap-2">
                      {profileLoading ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : <FiSave size={16} />} Save Profile Changes
                    </button>
                  </div>
                </form>
                <div className="border-t border-current/10 pt-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-2"><FiShield size={14} /> Contact Information</h3>
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-luxury-gold/10 text-luxury-gold"><FiMail size={18} /></div>
                      <div><p className="text-[10px] font-bold uppercase opacity-60">Primary Email</p><p className="text-sm font-semibold">{user?.email || 'No email registered'}</p></div>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20"><FiCheckCircle size={12} /> Active</span>
                  </div>
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-luxury-gold/10 text-luxury-gold"><FiPhone size={18} /></div>
                      <div><p className="text-[10px] font-bold uppercase opacity-60">Mobile Number</p><p className="text-sm font-bold font-mono">{user?.phone ? `+91 ${user.phone}` : 'No phone added'}</p></div>
                    </div>
                    <button type="button" onClick={() => setShowPhoneModal(true)} className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-luxury-gold/10 hover:bg-luxury-gold text-luxury-gold hover:text-black transition-all">{user?.phone ? 'Change' : 'Add Mobile'}</button>
                  </div>
                </div>
              </div>
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-5 flex flex-col justify-between`}>
                <div className="space-y-4">
                  <h3 className="text-base font-serif font-bold text-luxury-gold flex items-center gap-2"><FiShoppingBag /> Quick Actions</h3>
                  <p className="text-xs opacity-65">Fast access to orders, addresses, and account security.</p>
                  <div className="space-y-2.5 pt-1">
                    <Link to="/orders" className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-luxury-gold/40' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-luxury-gold/50'}`}>
                      <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-luxury-gold/10 text-luxury-gold group-hover:scale-110 transition-transform"><FiTruck size={16} /></div><div><p className="text-xs font-bold">My Orders</p><p className="text-[11px] opacity-60">Track shipments</p></div></div>
                      <FiChevronRight className="opacity-50 group-hover:opacity-100 transition-all text-luxury-gold" size={15} />
                    </Link>
                    <Link to="/wishlist" className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-luxury-gold/40' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-luxury-gold/50'}`}>
                      <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform"><FiHeart size={16} /></div><div><p className="text-xs font-bold">My Wishlist</p><p className="text-[11px] opacity-60">Saved collections</p></div></div>
                      <FiChevronRight className="opacity-50 group-hover:opacity-100 transition-all text-luxury-gold" size={15} />
                    </Link>
                    <button type="button" onClick={() => setActiveTab('addresses')} className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 group ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-luxury-gold/40' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-luxury-gold/50'}`}>
                      <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-luxury-gold/10 text-luxury-gold group-hover:scale-110 transition-transform"><FiMapPin size={16} /></div><div><p className="text-xs font-bold">Saved Addresses</p><p className="text-[11px] opacity-60">{addresses.length} saved</p></div></div>
                      <FiChevronRight className="opacity-50 group-hover:opacity-100 transition-all text-luxury-gold" size={15} />
                    </button>
                    <button type="button" onClick={() => setActiveTab('security')} className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 group ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-luxury-gold/40' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-luxury-gold/50'}`}>
                      <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-luxury-gold/10 text-luxury-gold group-hover:scale-110 transition-transform"><FiLock size={16} /></div><div><p className="text-xs font-bold">Security & Password</p><p className="text-[11px] opacity-60">Manage password</p></div></div>
                      <FiChevronRight className="opacity-50 group-hover:opacity-100 transition-all text-luxury-gold" size={15} />
                    </button>
                  </div>
                </div>
                <div className="pt-3 border-t border-current/10">
                  <Link to="/become-a-seller" className="w-full py-3 bg-luxury-gold/10 hover:bg-luxury-gold text-luxury-gold hover:text-black border border-luxury-gold/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                    <span>Become an SKLP Seller</span><FiArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2"><FiMapPin /> Saved Delivery Addresses</h2><p className={`text-xs mt-1 ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>Manage multiple destination addresses.</p></div>
                <button onClick={() => { setEditingAddress(null); setShowAddressModal(true) }} className="flex items-center gap-2 px-5 py-2.5 bg-luxury-gold text-luxury-black font-extrabold rounded-xl hover:bg-luxury-darkGold transition-all text-xs uppercase tracking-wider shadow-glow"><FiPlus size={16} /> Add New Address</button>
              </div>
              {addresses.length === 0 ? (
                <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
                  <FiMapPin size={48} className="text-luxury-gold mx-auto mb-3 opacity-80" />
                  <h3 className="text-lg font-serif font-bold">No Delivery Addresses Added</h3>
                  <p className={`text-xs mt-1 mb-5 max-w-sm mx-auto ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>Save your home, office, or gift delivery destination for swift single-click checkout.</p>
                  <button onClick={() => { setEditingAddress(null); setShowAddressModal(true) }} className="px-6 py-3 bg-luxury-gold text-luxury-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow">Add Your First Address</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr, i) => (
                    <div key={addr._id || i} className={`rounded-2xl border-2 p-5 transition-all relative ${cardBg} ${addr.isDefault ? 'border-luxury-gold shadow-glow' : 'border-current/10'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold rounded-full text-[10px] font-extrabold uppercase tracking-wider">{addr.label || 'Home'}</span>
                          {addr.isDefault && <span className="px-2.5 py-1 bg-luxury-gold text-luxury-black rounded-full text-[10px] font-extrabold uppercase">Default</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingAddress(addr); setShowAddressModal(true) }} className="p-2 rounded-xl hover:bg-luxury-gold/15 text-luxury-gold transition-colors" title="Edit"><FiEdit2 size={15} /></button>
                          <button onClick={() => handleDeleteAddress(addr._id)} className="p-2 rounded-xl hover:bg-red-500/15 text-red-400 transition-colors" title="Delete"><FiTrash2 size={15} /></button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold leading-relaxed">{addr.street}</p>
                      {addr.landmark && <p className="text-xs opacity-75 mt-0.5">Landmark: {addr.landmark}</p>}
                      <p className="text-xs opacity-75 mt-1">{addr.city}, {addr.state} - <span className="font-mono font-bold">{addr.pincode || addr.postalCode}</span></p>
                      {addr.phone && <p className="text-xs opacity-60 font-mono mt-2">+91 {addr.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'display' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-6`}>
                <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2"><FiMoon /> Visual Theme & Contrast</h3>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                    <div><p className="text-sm font-bold">Dark Mode Experience</p><p className="text-xs opacity-65">Sleek obsidian background with luxury gold accents</p></div>
                    <button type="button" onClick={toggleTheme} className={`p-3 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-luxury-gold text-black shadow-glow' : 'bg-black text-luxury-gold'}`}>{isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}</button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">
                      {t('profile.displayLanguage', 'Display Language')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { code: 'en', name: 'English' },
                        { code: 'te', name: 'తెలుగు' },
                        { code: 'hi', name: 'हिन्दी' }
                      ].map((l) => (
                        <button key={l.code} type="button" onClick={() => { changeLanguage(l.code); setPreferences((p) => ({ ...p, language: l.code })) }}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${language === l.code ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow' : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'}`}>{l.name}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Preferred Currency</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.keys(RATES).map((currKey) => (
                        <button key={currKey} type="button" onClick={() => { setCurrency(currKey); setPreferences((p) => ({ ...p, currency: currKey })) }}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${currency === currKey ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow' : isDarkMode ? 'border-white/10 hover:border-luxury-gold/50' : 'border-gray-200 hover:border-luxury-gold/50'}`}>{RATES[currKey].label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-6 flex flex-col justify-between`}>
                <div>
                  <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2"><FiTruck /> Default Courier Preferences</h3>
                  <div className="space-y-4 mt-5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Preferred Delivery Window</label>
                      <select value={preferences.preferredSlot} onChange={(e) => setPreferences((p) => ({ ...p, preferredSlot: e.target.value }))} className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}>
                        <option value="anytime">Anytime during business hours (9 AM - 8 PM)</option>
                        <option value="morning">Morning Slot (9 AM - 1 PM)</option>
                        <option value="afternoon">Afternoon Slot (1 PM - 5 PM)</option>
                        <option value="evening">Evening Slot (5 PM - 8 PM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Special Delivery Instructions</label>
                      <textarea rows={3} value={preferences.deliveryInstructions} onChange={(e) => setPreferences((p) => ({ ...p, deliveryInstructions: e.target.value }))} placeholder="e.g. Call before delivery, leave with security concierge if unavailable..." className={`w-full p-3 text-xs rounded-xl border outline-none resize-none ${inputBg}`} />
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => handlePreferencesSave(preferences, fashionPreferences)} disabled={prefsLoading} className="w-full py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all">{prefsLoading ? 'Saving...' : 'Save Display & Logistic Preferences'}</button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={`p-6 rounded-2xl border ${cardBg} max-w-3xl space-y-6 animate-fade-in`}>
              <div><h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2"><FiBell /> Notification & Communication Alerts</h2><p className="text-xs opacity-65 mt-1">Configure your preferred channels for updates and private couture drops.</p></div>
              <div className="divide-y divide-current/10">
                {[
                  { key: 'orderUpdates', title: 'Live Order Tracking & Dispatch Alerts', desc: 'Real-time SMS & Email dispatch notifications with courier links' },
                  { key: 'whatsapp', title: 'WhatsApp Concierge Updates', desc: 'Receive OTPs and delivery status on your WhatsApp number' },
                  { key: 'promoAlerts', title: 'Private Couture & Festive Drops', desc: 'Early VIP access to limited-edition festive garments and sales' },
                  { key: 'priceDropAlerts', title: 'Wishlist Price Drop Alerts', desc: 'Get alerted when items on your wishlist go on discount' },
                  { key: 'email', title: 'Digest & Invoicing Emails', desc: 'Receive digital tax invoices and monthly style recommendations' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4">
                    <div><p className="text-sm font-bold">{item.title}</p><p className="text-xs opacity-65 mt-0.5">{item.desc}</p></div>
                    <button type="button" onClick={() => setPreferences(prev => ({ ...prev, notifications: { ...prev.notifications, [item.key]: !prev.notifications[item.key] } }))}
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 flex-shrink-0 ml-4 ${preferences.notifications[item.key] ? 'bg-luxury-gold' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${preferences.notifications[item.key] ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-current/10">
                <button type="button" onClick={() => handlePreferencesSave(preferences, fashionPreferences)} disabled={prefsLoading} className="px-6 py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold shadow-glow transition-all">{prefsLoading ? 'Saving...' : 'Save Notification Preferences'}</button>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
              <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-6`}>
                <div><h2 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2"><FiCreditCard /> Saved UPI IDs (Express Checkout)</h2><p className="text-xs opacity-65 mt-1">Link your Virtual Payment Address (VPA) for 1-click Razorpay verification.</p></div>
                <form onSubmit={handleAddUpi} className="flex gap-2">
                  <input type="text" value={upiForm.upiId} onChange={(e) => setUpiForm((p) => ({ ...p, upiId: e.target.value }))} placeholder="e.g. yourname@okhdfcbank" className={`flex-1 p-3 text-xs rounded-xl border outline-none font-semibold ${inputBg}`} required />
                  <button type="submit" disabled={newUpiLoading || !upiForm.upiId} className="px-5 py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold disabled:opacity-50 shadow-glow">{newUpiLoading ? 'Saving...' : 'Add UPI ID'}</button>
                </form>
                <div className="space-y-2">
                  {(user?.savedPaymentMethods?.savedUpi?.length > 0) ? (
                    user.savedPaymentMethods.savedUpi.map((upi) => (
                      <div key={upi._id || upi.upiId} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-luxury-gold/15 text-luxury-gold font-bold text-xs">UPI</div>
                          <div><p className="text-sm font-mono font-bold">{upi.upiId}</p><p className="text-[10px] opacity-60 uppercase">{upi.label || 'UPI Account'}</p></div>
                        </div>
                        <button type="button" onClick={() => handleDeleteUpi(upi._id || upi.upiId)} className="p-2 rounded-xl hover:bg-red-500/15 text-red-400 transition-colors" title="Remove UPI"><FiTrash2 size={16} /></button>
                      </div>
                    ))
                  ) : <p className="text-xs opacity-60 italic py-2">No UPI payment IDs saved yet.</p>}
                </div>
              </div>
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-4 flex flex-col justify-between`}>
                <div>
                  <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2"><FiTag /> SKLP Atelier Wallet</h3>
                  <div className="mt-4 p-5 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/30 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">Available Reward Coins</p>
                    <p className="text-3xl font-serif font-extrabold mt-1 text-luxury-gold">500 Coins</p>
                    <p className="text-[10px] opacity-75 mt-1">Worth Rs.500 discount on your next checkout</p>
                  </div>
                  <div className="mt-4 space-y-2 text-xs opacity-75"><p>Earn 5% back on all luxury couture orders</p><p>Automatically applicable at Checkout</p></div>
                </div>
                <Link to="/products" className="block text-center w-full py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow">Shop & Earn More</Link>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-5`}>
                <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2"><FiLock /> Change Account Password</h3>
                <form onSubmit={handlePasswordSave} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Current Password</label>
                    <div className="relative"><input type={showOld ? 'text' : 'password'} value={passwordForm.oldPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))} className={`w-full p-3 pr-10 text-xs rounded-xl border outline-none font-semibold ${inputBg}`} required /><button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-3 text-luxury-gold">{showOld ? <FiEyeOff size={16} /> : <FiEye size={16} />}</button></div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">New Password (Min 8 chars)</label>
                    <div className="relative"><input type={showNew ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} className={`w-full p-3 pr-10 text-xs rounded-xl border outline-none font-semibold ${inputBg}`} required minLength={8} /><button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3 text-luxury-gold">{showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}</button></div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Confirm New Password</label>
                    <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} className={`w-full p-3 text-xs rounded-xl border outline-none font-semibold ${inputBg} ${passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? 'border-red-500' : ''}`} required />
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && <p className="text-red-400 text-xs mt-1">Passwords do not match</p>}
                  </div>
                  <button type="submit" disabled={passwordLoading} className="w-full py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow hover:bg-luxury-darkGold transition-all disabled:opacity-50">{passwordLoading ? 'Updating...' : 'Update Password'}</button>
                </form>
              </div>
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-5`}>
                <h3 className="text-lg font-serif font-bold text-luxury-gold flex items-center gap-2"><FiShield /> Account Security</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Account Status', value: 'Active & Verified', badge: 'Secure', green: true },
                    { label: 'Login Method', value: user?.googleId ? 'Google OAuth' : user?.phone ? 'Mobile OTP' : 'Email & Password', icon: true },
                    { label: 'Email', value: user?.email || '-', badge: 'Active', green: true },
                    ...(user?.phone ? [{ label: 'Mobile', value: user.phone, badge: 'Linked', green: true }] : [])
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <div><p className="text-xs font-bold uppercase tracking-wider opacity-60">{item.label}</p><p className="text-sm font-bold mt-0.5 truncate max-w-[180px]">{item.value}</p></div>
                      {item.badge ? <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-green-500/15 text-green-500 border border-green-500/30">{item.badge}</span> : <FiShield className="opacity-40" size={18} />}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] opacity-50 leading-relaxed pt-1">Your session is encrypted and secured. Update your password regularly for best security.</p>
              </div>
            </div>
          )}

        </main>
      </div>

      {showAddressModal && <AddressModal address={editingAddress} onSave={handleSaveAddress} onClose={() => { setShowAddressModal(false); setEditingAddress(null) }} isDarkMode={isDarkMode} />}
      {showPhoneModal && <PhoneModal onClose={() => setShowPhoneModal(false)} onPhoneUpdated={(updatedUser) => updateUser(updatedUser)} isDarkMode={isDarkMode} />}
      {showAvatarModal && (
        <AvatarModal currentAvatar={profileForm.avatar}
          onSelectAvatar={(avatarUrl) => { setProfileForm((p) => ({ ...p, avatar: avatarUrl })); setShowAvatarModal(false); userService.updateProfile({ avatar: avatarUrl }).then((res) => { if (res.data?.user) updateUser(res.data.user); toast.success('Avatar updated!') }).catch(() => {}) }}
          onClose={() => setShowAvatarModal(false)} isDarkMode={isDarkMode} />
      )}
    </div>
  )
}

export default Profile
