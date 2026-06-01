import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers,
  FiLogOut, FiMenu, FiX, FiChevronRight, FiBell
} from 'react-icons/fi'

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { path: '/admin/products', label: 'Products', icon: FiPackage },
  { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { path: '/admin/users', label: 'Users', icon: FiUsers },
]

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-luxury-black overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-luxury-charcoal border-r border-luxury-darkGray flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-luxury-darkGray">
          {sidebarOpen && (
            <span className="text-2xl font-serif font-bold text-luxury-gold">SKLP Admin</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors ml-auto"
          >
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-6 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-luxury-gold text-luxury-black font-bold shadow-glow'
                    : 'text-luxury-lightGray hover:bg-luxury-darkGray hover:text-luxury-gold'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-luxury-black' : 'group-hover:text-luxury-gold'} />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {sidebarOpen && isActive && (
                  <FiChevronRight size={16} className="ml-auto text-luxury-black" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-luxury-darkGray p-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-luxury-gold flex items-center justify-center text-luxury-black font-bold text-sm flex-shrink-0">
                {user?.firstName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-luxury-mediumGray truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-luxury-gold flex items-center justify-center text-luxury-black font-bold text-sm mx-auto mb-3">
              {user?.firstName?.[0]?.toUpperCase() || 'A'}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/20 transition-colors ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
          >
            <FiLogOut size={18} />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-luxury-charcoal border-b border-luxury-darkGray flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white capitalize">
            {navItems.find(n => n.path === location.pathname)?.label || 'Admin Panel'}
          </h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-luxury-mediumGray hover:text-luxury-gold transition-colors">
              <FiBell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-luxury-gold rounded-full" />
            </button>
            <Link
              to="/"
              className="text-sm text-luxury-mediumGray hover:text-luxury-gold transition-colors"
            >
              ← View Store
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-luxury-black p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
