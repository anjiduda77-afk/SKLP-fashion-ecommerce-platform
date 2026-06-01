import { useState } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiSearch, FiUsers, FiShield, FiUser,
  FiMail, FiPhone, FiMoreVertical, FiCheckCircle, FiSlash, FiEye
} from 'react-icons/fi'
import { toast } from 'react-toastify'

const ROLES = ['All', 'user', 'admin']
const STATUS_OPTS = ['All', 'active', 'blocked']

const INITIAL_USERS = [
  { id: '1', firstName: 'Priya', lastName: 'Sharma', email: 'priya@email.com', phone: '98765 43210', role: 'user', status: 'active', orders: 12, joined: '2025-03-14', avatar: 'PS' },
  { id: '2', firstName: 'Rahul', lastName: 'Mehta',  email: 'rahul@email.com', phone: '87654 32109', role: 'user', status: 'active', orders: 8, joined: '2025-04-22', avatar: 'RM' },
  { id: '3', firstName: 'Admin', lastName: 'User',   email: 'admin@sklp.com', phone: '76543 21098', role: 'admin', status: 'active', orders: 0, joined: '2024-01-01', avatar: 'AU' },
  { id: '4', firstName: 'Anjali', lastName: 'Reddy', email: 'anjali@email.com', phone: '65432 10987', role: 'user', status: 'active', orders: 5, joined: '2025-06-10', avatar: 'AR' },
  { id: '5', firstName: 'Vikram', lastName: 'Singh', email: 'vikram@email.com', phone: '54321 09876', role: 'user', status: 'blocked', orders: 2, joined: '2025-07-05', avatar: 'VS' },
  { id: '6', firstName: 'Meena', lastName: 'Patel',  email: 'meena@email.com', phone: '43210 98765', role: 'user', status: 'active', orders: 19, joined: '2025-02-18', avatar: 'MP' },
  { id: '7', firstName: 'Arjun', lastName: 'Kumar',  email: 'arjun@email.com', phone: '32109 87654', role: 'user', status: 'active', orders: 7, joined: '2025-05-30', avatar: 'AK' },
]

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose, onBlock, onMakeAdmin }) {
  const { isDarkMode } = useTheme()
  const modalBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'

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
              {user.avatar}
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
              <span className={textSecondary}>{user.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiCheckCircle size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>Joined: {user.joined}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiShield size={15} className="text-luxury-gold flex-shrink-0" />
              <span className={textSecondary}>{user.orders} orders placed</span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {user.role !== 'admin' && (
              <button
                onClick={() => { onMakeAdmin(user.id); onClose() }}
                className="flex-1 py-2 text-xs font-bold border border-luxury-gold/30 text-luxury-gold rounded-xl hover:bg-luxury-gold/10 transition-all"
              >
                Make Admin
              </button>
            )}
            <button
              onClick={() => { onBlock(user.id); onClose() }}
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
  const [users, setUsers] = useState(INITIAL_USERS)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)

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
    .filter((u) => statusFilter === 'All' || u.status === statusFilter)

  const handleBlock = (id) => {
    setUsers((prev) => prev.map((u) =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u
    ))
    const user = users.find((u) => u.id === id)
    toast.success(`${user?.firstName} ${user?.status === 'active' ? 'blocked' : 'activated'}`)
  }

  const handleMakeAdmin = (id) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: 'admin' } : u))
    const user = users.find((u) => u.id === id)
    toast.success(`${user?.firstName} is now an admin`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Users</h2>
          <p className={`text-sm mt-0.5 ${textSecondary}`}>{users.length} total users</p>
        </div>
        {/* Quick stats */}
        <div className="flex gap-3">
          {[
            { label: 'Active', count: users.filter(u => u.status === 'active').length, color: 'text-green-500' },
            { label: 'Blocked', count: users.filter(u => u.status === 'blocked').length, color: 'text-red-500' },
            { label: 'Admins', count: users.filter(u => u.role === 'admin').length, color: 'text-luxury-gold' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-xl border px-4 py-2 text-center ${cardBg}`}>
              <p className={`text-lg font-bold ${color}`}>{count}</p>
              <p className={`text-xs ${textSecondary}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-xl border p-4 flex flex-wrap gap-3 ${cardBg}`}>
        <div className="flex-1 min-w-48 relative">
          <FiSearch size={15} className={`absolute left-3 top-3 ${textSecondary}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className={`w-full pl-9 py-2 border text-sm rounded-lg ${inputBg}`}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`border text-sm px-3 py-2 rounded-lg ${inputBg}`}>
          {ROLES.map((r) => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`border text-sm px-3 py-2 rounded-lg ${inputBg}`}>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-luxury-black/30 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
                {['User', 'Email', 'Phone', 'Role', 'Status', 'Orders', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-left text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`px-5 py-12 text-center ${textSecondary}`}>
                    <FiUsers size={32} className="mx-auto mb-3 opacity-30" />
                    No users found
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className={`transition-colors group ${rowHover}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        user.role === 'admin' ? 'bg-luxury-gold text-luxury-black' : isDarkMode ? 'bg-luxury-darkGray text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {user.avatar}
                      </div>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{user.firstName} {user.lastName}</p>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{user.email}</td>
                  <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{user.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold border ${
                      user.role === 'admin'
                        ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                        : isDarkMode ? 'bg-luxury-darkGray/50 text-luxury-mediumGray border-luxury-darkGray' : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {user.role === 'admin' ? <FiShield size={11} /> : <FiUser size={11} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      user.status === 'active'
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${textPrimary}`}>{user.orders}</td>
                  <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{user.joined}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-luxury-gold/10 text-luxury-mediumGray hover:text-luxury-gold' : 'hover:bg-luxury-gold/10 text-gray-400 hover:text-luxury-gold'}`}
                        title="View Details"
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={() => handleBlock(user.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.status === 'active'
                            ? isDarkMode ? 'hover:bg-red-900/20 text-luxury-mediumGray hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                            : isDarkMode ? 'hover:bg-green-900/20 text-luxury-mediumGray hover:text-green-400' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                        }`}
                        title={user.status === 'active' ? 'Block' : 'Activate'}
                      >
                        {user.status === 'active' ? <FiSlash size={14} /> : <FiCheckCircle size={14} />}
                      </button>
                    </div>
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
