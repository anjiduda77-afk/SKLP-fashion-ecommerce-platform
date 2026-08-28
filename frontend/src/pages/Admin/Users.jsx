import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiSearch, FiUsers, FiShield, FiUser,
  FiMail, FiPhone, FiCheckCircle, FiSlash, FiEye,
  FiPlus, FiTrash2, FiX, FiShoppingBag, FiTruck
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'

const ROLES = ['All', 'customer', 'admin', 'seller', 'delivery']
const STATUS_OPTS = ['All', 'active', 'blocked', 'inactive']

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose, onBlock, onChangeRole, onDelete }) {
  const { isDarkMode } = useTheme()
  const [selectedRole, setSelectedRole] = useState(user.role || 'customer')
  const [savingRole, setSavingRole] = useState(false)
  const modalBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'

  const avatarInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'

  const handleRoleSubmit = async () => {
    setSavingRole(true)
    await onChangeRole(user._id, selectedRole)
    setSavingRole(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className={`w-full max-w-md rounded-3xl border animate-fade-in shadow-2xl ${modalBg}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-serif font-bold text-luxury-gold`}>Account Details</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors text-lg font-bold ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
            <FiX size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${
              user.role === 'admin'
                ? 'bg-luxury-gold text-luxury-black shadow-glow'
                : user.role === 'seller'
                ? 'bg-blue-500 text-white'
                : user.role === 'delivery'
                ? 'bg-emerald-500 text-white'
                : isDarkMode ? 'bg-luxury-darkGray text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {avatarInitial}
            </div>
            <div>
              <p className={`text-lg font-bold ${textPrimary}`}>{user.firstName} {user.lastName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                  user.role === 'admin'
                    ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                    : user.role === 'seller'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : user.role === 'delivery'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : isDarkMode ? 'bg-luxury-darkGray text-luxury-mediumGray border-luxury-darkGray' : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {user.role}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                  user.status === 'active'
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                }`}>
                  {user.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <FiMail size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>{user.email || 'No email registered'}</span>
            </div>
            <div className="flex items-center gap-3">
              <FiPhone size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>{user.phone ? `+91 ${user.phone}` : 'No phone linked'}</span>
            </div>
            <div className="flex items-center gap-3">
              <FiCheckCircle size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Change Role Selection */}
          <div className="space-y-2 pt-3 border-t border-current/10">
            <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Modify Account Role</label>
            <div className="flex gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={`flex-1 text-xs py-2.5 px-3 rounded-xl border outline-none capitalize ${isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              >
                <option value="customer">Customer (Shopper)</option>
                <option value="seller">Seller (Merchant)</option>
                <option value="delivery">Delivery Partner (Logistics)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
              <button
                onClick={handleRoleSubmit}
                disabled={savingRole || selectedRole === user.role}
                className="px-4 py-2 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold disabled:opacity-50 transition-all shadow-glow"
              >
                {savingRole ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Actions: Block / Delete */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { onBlock(user._id, user.status); onClose() }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                user.status === 'active'
                  ? 'border border-red-500/30 text-red-500 hover:bg-red-500/10'
                  : 'border border-green-500/30 text-green-500 hover:bg-green-500/10'
              }`}
            >
              {user.status === 'active' ? 'Block Account' : 'Activate Account'}
            </button>
            <button
              onClick={() => { onDelete(user._id); onClose() }}
              className="px-4 py-2.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-all border border-red-500/30"
              title="Delete Account"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated, isDarkMode }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    status: 'active'
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email && !form.phone) {
      toast.error('Either email or phone is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await adminService.createUser(form)
      if (res.data?.success) {
        toast.success(`${form.role.toUpperCase()} account created successfully! 🎉`)
        onCreated(res.data.user)
        onClose()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create user account')
    } finally {
      setSubmitting(false)
    }
  }

  const modalBg = isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-gray-200 text-black'
  const inputBg = isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-black'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className={`w-full max-w-lg rounded-3xl border p-6 animate-fade-in shadow-2xl ${modalBg}`}>
        <div className="flex items-center justify-between mb-5 border-b border-current/10 pb-3">
          <h3 className="text-xl font-serif font-bold text-luxury-gold flex items-center gap-2">
            <FiPlus /> Create New Account
          </h3>
          <button onClick={onClose} className="p-1 hover:text-luxury-gold"><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">First Name *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="First name"
                className={`w-full p-2.5 text-xs rounded-xl border outline-none ${inputBg}`}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Last name"
                className={`w-full p-2.5 text-xs rounded-xl border outline-none ${inputBg}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className={`w-full p-2.5 text-xs rounded-xl border outline-none ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Mobile Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="9876543210"
                maxLength={10}
                className={`w-full p-2.5 text-xs rounded-xl border outline-none ${inputBg}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Account Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={`w-full p-2.5 text-xs rounded-xl border outline-none capitalize ${inputBg}`}
              >
                <option value="customer">Customer (Shopper)</option>
                <option value="seller">Seller (Merchant)</option>
                <option value="delivery">Delivery Partner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Initial Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 chars"
                className={`w-full p-2.5 text-xs rounded-xl border outline-none ${inputBg}`}
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-current/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow hover:bg-luxury-darkGold disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
function AdminUsers() {
  const { isDarkMode } = useTheme()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await adminService.getUsers()
      if (res.data.success) {
        setUsers(res.data.users || [])
      }
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  const rowHover = isDarkMode ? 'hover:bg-luxury-darkGray/20' : 'hover:bg-gray-50'

  // Account role counts
  const counts = {
    all: users.length,
    customer: users.filter(u => u.role === 'customer' || !u.role).length,
    seller: users.filter(u => u.role === 'seller').length,
    delivery: users.filter(u => u.role === 'delivery' || u.role === 'deliveryPartner').length,
    admin: users.filter(u => u.role === 'admin').length,
  }

  const filtered = users
    .filter((u) =>
      `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(search.toLowerCase())
    )
    .filter((u) => roleFilter === 'All' || u.role === roleFilter)
    .filter((u) => statusFilter === 'All' || (u.status || 'active') === statusFilter)

  const handleBlock = async (id, currentStatus) => {
    const newStatus = (currentStatus || 'active') === 'active' ? 'blocked' : 'active'
    try {
      const res = await adminService.changeUserRole(id, { status: newStatus })
      if (res.data.success) {
        setUsers((prev) => prev.map((u) => u._id === id ? { ...u, status: newStatus } : u))
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully`)
      }
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleChangeRole = async (id, role) => {
    if (role === 'admin' && !window.confirm("Are you sure you want to grant Admin privileges to this user?")) return
    try {
      const res = await adminService.changeUserRole(id, { role })
      if (res.data.success) {
        setUsers((prev) => prev.map((u) => u._id === id ? { ...u, role } : u))
        toast.success(`User role updated to ${role}`)
      }
    } catch (error) {
      toast.error('Failed to update user role')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account? This cannot be undone.")) return
    try {
      await adminService.deleteUser(id)
      setUsers((prev) => prev.filter((u) => u._id !== id))
      toast.success('User account deleted permanently')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete user')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Stats & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Multi-Account Management</h2>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>Manage all 4 account tiers: Customers, Verified Sellers, Delivery Fleet, and Admins</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow hover:bg-luxury-darkGold transition-all w-fit"
        >
          <FiPlus size={16} /> Add Account
        </button>
      </div>

      {/* Account Tier Quick Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Shoppers / Customers', count: counts.customer, icon: FiUser, role: 'customer', color: 'text-luxury-gold' },
          { label: 'Merchant Sellers', count: counts.seller, icon: FiShoppingBag, role: 'seller', color: 'text-blue-400' },
          { label: 'Delivery Fleet', count: counts.delivery, icon: FiTruck, role: 'delivery', color: 'text-emerald-400' },
          { label: 'Platform Admins', count: counts.admin, icon: FiShield, role: 'admin', color: 'text-amber-400' },
        ].map((stat) => {
          const Icon = stat.icon
          const isSelected = roleFilter === stat.role
          return (
            <button
              key={stat.label}
              onClick={() => setRoleFilter(isSelected ? 'All' : stat.role)}
              className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between ${cardBg} ${
                isSelected ? 'border-luxury-gold shadow-glow' : 'border-current/10 hover:border-luxury-gold/50'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-65">{stat.label}</p>
                <p className={`text-2xl font-serif font-extrabold mt-1 ${stat.color}`}>{stat.count}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-current/10">
                <Icon size={20} className={stat.color} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className={`flex-1 rounded-2xl border p-3 ${cardBg}`}>
          <div className="relative">
            <FiSearch size={16} className={`absolute left-3.5 top-3 ${textSecondary}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className={`w-full pl-10 pr-3 py-1.5 border text-xs rounded-xl outline-none font-semibold ${inputBg}`}
            />
          </div>
        </div>

        {/* Filters */}
        <div className={`sm:w-80 rounded-2xl border p-3 flex gap-2 ${cardBg}`}>
          <div className="flex-1">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full border text-xs py-2 px-3 rounded-xl outline-none capitalize ${inputBg}`}
            >
              {ROLES.map(r => <option key={r} value={r}>{r} Role</option>)}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border text-xs py-2 px-3 rounded-xl outline-none capitalize ${inputBg}`}
            >
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s} Status</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-3xl border overflow-hidden shadow-lg ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-luxury-black/40 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
                {['User Profile', 'Role', 'Status', 'Joined Date', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-left text-[11px] uppercase tracking-wider font-extrabold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-5 py-12 text-center ${textSecondary}`}>
                    <FiUsers size={36} className="mx-auto mb-3 opacity-30" />
                    No users found matching your search.
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user._id} className={`transition-colors group ${rowHover}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.role === 'admin' ? 'bg-luxury-gold text-luxury-black' : isDarkMode ? 'bg-luxury-darkGray text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${textPrimary}`}>{user.firstName} {user.lastName}</p>
                        <p className={`text-[11px] font-mono ${textSecondary}`}>
                          {user.email || (user.phone ? `+91 ${user.phone}` : 'No credential')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border capitalize ${
                      user.role === 'admin'
                        ? 'bg-luxury-gold/15 text-luxury-gold border-luxury-gold/30'
                        : user.role === 'seller'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : user.role === 'delivery'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isDarkMode ? 'bg-luxury-darkGray text-luxury-mediumGray border-luxury-darkGray' : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {user.role === 'admin' ? <FiShield size={11} /> : user.role === 'seller' ? <FiShoppingBag size={11} /> : user.role === 'delivery' ? <FiTruck size={11} /> : <FiUser size={11} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                      (user.status || 'active') === 'active'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {(user.status || 'active') === 'active' ? <FiCheckCircle size={10} /> : <FiSlash size={10} />}
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-xs font-mono ${textSecondary}`}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isDarkMode ? 'border-white/10 hover:border-luxury-gold hover:text-luxury-gold' : 'border-gray-300 text-gray-600 hover:border-luxury-gold hover:text-luxury-gold'
                      }`}
                    >
                      <FiEye size={13} /> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`px-5 py-3 border-t text-xs ${textSecondary} ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          Showing {filtered.length} of {users.length} registered accounts
        </div>
      </div>

      {/* User Detail & Manage Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBlock={handleBlock}
          onChangeRole={handleChangeRole}
          onDelete={handleDeleteUser}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  )
}

export default AdminUsers
