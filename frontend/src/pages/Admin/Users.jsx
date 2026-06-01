import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiSearch, FiUsers, FiShield, FiUser,
  FiMail, FiPhone, FiCheckCircle, FiSlash, FiEye
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import apiServices from '../../services/apiServices'

const ROLES = ['All', 'customer', 'admin']
const STATUS_OPTS = ['All', 'active', 'blocked']

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose, onBlock, onMakeAdmin }) {
  const { isDarkMode } = useTheme()
  const modalBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'

  const avatarInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className={`w-full max-w-sm rounded-2xl border animate-fade-in ${modalBg}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${textPrimary}`}>User Details</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors text-lg font-bold ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}>×</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${
              user.role === 'admin' ? 'bg-luxury-gold text-luxury-black' : isDarkMode ? 'bg-luxury-darkGray text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {avatarInitial}
            </div>
            <div>
              <p className={`text-lg font-bold ${textPrimary}`}>{user.firstName} {user.lastName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  user.role === 'admin'
                    ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                    : isDarkMode ? 'bg-luxury-darkGray text-luxury-mediumGray border-luxury-darkGray' : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {user.role}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  user.status === 'active'
                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                }`}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>
          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <FiMail size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiPhone size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>{user.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiCheckCircle size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {user.role !== 'admin' && (
              <button
                onClick={() => { onMakeAdmin(user._id); onClose() }}
                className="flex-1 py-2 text-xs font-bold border border-luxury-gold/30 text-luxury-gold rounded-xl hover:bg-luxury-gold/10 transition-all"
              >
                Make Admin
              </button>
            )}
            <button
              onClick={() => { onBlock(user._id, user.status); onClose() }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                user.status === 'active'
                  ? 'border border-red-500/30 text-red-500 hover:bg-red-50'
                  : 'border border-green-500/30 text-green-600 hover:bg-green-50'
              }`}
            >
              {user.status === 'active' ? 'Block User' : 'Activate User'}
            </button>
          </div>
        </div>
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

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await apiServices.adminService.getUsers()
      if (res.data.success) {
        setUsers(res.data.users)
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

  const filtered = users
    .filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    )
    .filter((u) => roleFilter === 'All' || u.role === roleFilter)
    .filter((u) => statusFilter === 'All' || (u.status || 'active') === statusFilter)

  const handleBlock = async (id, currentStatus) => {
    const newStatus = (currentStatus || 'active') === 'active' ? 'blocked' : 'active'
    try {
      const res = await apiServices.adminService.changeUserRole(id, { status: newStatus })
      if (res.data.success) {
        setUsers((prev) => prev.map((u) => u._id === id ? { ...u, status: newStatus } : u))
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully`)
      }
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleMakeAdmin = async (id) => {
    if (!window.confirm("Are you sure you want to grant Admin privileges to this user?")) return
    try {
      const res = await apiServices.adminService.changeUserRole(id, { role: 'admin' })
      if (res.data.success) {
        setUsers((prev) => prev.map((u) => u._id === id ? { ...u, role: 'admin' } : u))
        toast.success('User has been granted Admin privileges')
      }
    } catch (error) {
      toast.error('Failed to update user role')
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
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Users Management</h2>
        <p className={`text-sm mt-0.5 ${textSecondary}`}>{users.length} registered users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className={`flex-1 rounded-xl border p-4 ${cardBg}`}>
          <div className="relative">
            <FiSearch size={15} className={`absolute left-3 top-3 ${textSecondary}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className={`w-full pl-9 py-2 border text-sm rounded-lg ${inputBg}`}
            />
          </div>
        </div>

        {/* Filters */}
        <div className={`sm:w-80 rounded-xl border p-4 flex gap-3 ${cardBg}`}>
          <div className="flex-1">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full border text-sm py-2 px-3 rounded-lg capitalize ${inputBg}`}
            >
              {ROLES.map(r => <option key={r} value={r}>{r} Role</option>)}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border text-sm py-2 px-3 rounded-lg capitalize ${inputBg}`}
            >
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s} Status</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-luxury-black/30 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-left text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-5 py-12 text-center ${textSecondary}`}>
                    <FiUsers size={32} className="mx-auto mb-3 opacity-30" />
                    No users found matching your search.
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user._id} className={`transition-colors group ${rowHover}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.role === 'admin' ? 'bg-luxury-gold text-luxury-black' : isDarkMode ? 'bg-luxury-darkGray text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${textPrimary}`}>{user.firstName} {user.lastName}</p>
                        <p className={`text-xs ${textSecondary}`}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${
                      user.role === 'admin'
                        ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                        : isDarkMode ? 'bg-luxury-darkGray text-luxury-mediumGray border-luxury-darkGray' : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {user.role === 'admin' ? <FiShield size={10} /> : <FiUser size={10} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${
                      (user.status || 'active') === 'active'
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                      {(user.status || 'active') === 'active' ? <FiCheckCircle size={10} /> : <FiSlash size={10} />}
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all opacity-0 group-hover:opacity-100 ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:border-luxury-gold hover:text-luxury-gold' : 'border-gray-300 text-gray-500 hover:border-luxury-gold hover:text-luxury-gold'}`}
                    >
                      <FiEye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`px-5 py-3 border-t text-xs ${textSecondary} ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBlock={handleBlock}
          onMakeAdmin={handleMakeAdmin}
        />
      )}
    </div>
  )
}

export default AdminUsers
