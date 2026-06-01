import { useState, useEffect } from 'react'
import { useAuth } from '@context/AuthContext'
import { userService } from '@services/apiServices'
import { toast } from 'react-toastify'
import {
  FiUser, FiMail, FiPhone, FiLock, FiMapPin,
  FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiEye, FiEyeOff
} from 'react-icons/fi'

const TABS = ['Personal Info', 'Addresses', 'Change Password']

// ── Address Modal ────────────────────────────────────────────────────────────
function AddressModal({ address, onSave, onClose }) {
  const [form, setForm] = useState(
    address || { label: 'Home', street: '', city: '', state: '', pincode: '', country: 'India', isDefault: false }
  )

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold">{address ? 'Edit Address' : 'Add New Address'}</h3>
          <button onClick={onClose} className="p-1 hover:text-luxury-gold transition-colors"><FiX /></button>
        </div>
        <div className="space-y-4">
          {/* Label */}
          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setForm((p) => ({ ...p, label: l }))}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                  form.label === l ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-luxury-mediumGray/30'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <input name="street" value={form.street} onChange={handleChange} placeholder="Street / House no." className="w-full" />
          <div className="grid grid-cols-2 gap-3">
            <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="w-full" />
            <input name="state" value={form.state} onChange={handleChange} placeholder="State" className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" className="w-full" />
            <input name="country" value={form.country} onChange={handleChange} placeholder="Country" className="w-full" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} className="accent-yellow-400" />
            Set as default address
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-luxury-mediumGray/30 rounded-xl hover:border-luxury-gold transition-colors font-semibold text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all">Save Address</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Profile Page ────────────────────────────────────────────────────────
function Profile() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    // Load addresses
    userService.getAddresses()
      .then((res) => setAddresses(res?.data?.addresses || []))
      .catch(() => {})
  }, [])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const res = await userService.updateProfile(profileForm)
      updateUser(res.data.user)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      await userService.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      toast.success('Password changed successfully!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Password change failed')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSaveAddress = async (addressData) => {
    try {
      if (editingAddress?._id) {
        const res = await userService.updateAddress(editingAddress._id, addressData)
        setAddresses((prev) => prev.map((a) => a._id === editingAddress._id ? res.data.address : a))
        toast.success('Address updated!')
      } else {
        const res = await userService.addAddress(addressData)
        setAddresses((prev) => [...prev, res.data.address])
        toast.success('Address added!')
      }
    } catch {
      // Optimistic UI for demo
      if (editingAddress) {
        setAddresses((prev) => prev.map((a, i) => i === addresses.indexOf(editingAddress) ? addressData : a))
      } else {
        setAddresses((prev) => [...prev, { ...addressData, _id: Date.now().toString() }])
      }
    }
    setShowAddressModal(false)
    setEditingAddress(null)
  }

  const handleDeleteAddress = async (id) => {
    try {
      await userService.deleteAddress(id)
    } catch (error) {
      console.error('Failed to delete address:', error)
    }
    setAddresses((prev) => prev.filter((a) => a._id !== id))
    toast.info('Address removed')
  }

  return (
    <div className="container-custom py-12 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-luxury-gold flex items-center justify-center text-luxury-black font-bold text-2xl font-serif">
          {user?.firstName?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm opacity-60">{user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-luxury-charcoal rounded-xl mb-8 w-fit">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === i
                ? 'bg-luxury-gold text-luxury-black shadow-glow'
                : 'text-luxury-mediumGray hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 0: Personal Info */}
      {activeTab === 0 && (
        <div className="card p-6 max-w-2xl animate-fade-in">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <FiUser className="text-luxury-gold" /> Personal Information
          </h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  className="pl-9 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Phone Number</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  className="pl-9 w-full"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
              >
                {profileLoading ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : <FiSave size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 1: Addresses */}
      {activeTab === 1 && (
        <div className="max-w-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FiMapPin className="text-luxury-gold" /> My Addresses
            </h2>
            <button
              onClick={() => { setEditingAddress(null); setShowAddressModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all text-sm"
            >
              <FiPlus size={16} /> Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="card p-10 text-center">
              <FiMapPin size={40} className="text-luxury-mediumGray mx-auto mb-3" />
              <p className="opacity-60 mb-4">No saved addresses yet</p>
              <button
                onClick={() => { setEditingAddress(null); setShowAddressModal(true) }}
                className="px-5 py-2 bg-luxury-gold text-luxury-black font-bold rounded-xl text-sm"
              >
                Add First Address
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {addresses.map((addr, i) => (
                <div key={addr._id || i} className={`card p-5 border-2 ${addr.isDefault ? 'border-luxury-gold' : 'border-transparent'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold rounded-full text-xs font-bold uppercase">
                          {addr.label || 'Address'}
                        </span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-luxury-gold text-luxury-black rounded-full text-xs font-bold">Default</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed opacity-80">
                        {addr.street}, {addr.city}, {addr.state} – {addr.pincode}
                        {addr.country && `, ${addr.country}`}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => { setEditingAddress(addr); setShowAddressModal(true) }}
                        className="p-2 rounded-lg hover:bg-luxury-gold/10 text-luxury-mediumGray hover:text-luxury-gold transition-colors"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="p-2 rounded-lg hover:bg-red-900/20 text-luxury-mediumGray hover:text-red-400 transition-colors"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddressModal && (
            <AddressModal
              address={editingAddress}
              onSave={handleSaveAddress}
              onClose={() => { setShowAddressModal(false); setEditingAddress(null) }}
            />
          )}
        </div>
      )}

      {/* Tab 2: Change Password */}
      {activeTab === 2 && (
        <div className="card p-6 max-w-md animate-fade-in">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <FiLock className="text-luxury-gold" /> Change Password
          </h2>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Current Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type={showOld ? 'text' : 'password'}
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                  className="pl-9 pr-10 w-full"
                  required
                />
                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-3 text-luxury-mediumGray hover:text-luxury-gold">
                  {showOld ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="pl-9 pr-10 w-full"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3 text-luxury-mediumGray hover:text-luxury-gold">
                  {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Confirm New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={`pl-9 w-full ${passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? 'border-red-500' : ''}`}
                  required
                />
              </div>
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-6 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
              >
                {passwordLoading ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : <FiSave size={16} />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Profile
