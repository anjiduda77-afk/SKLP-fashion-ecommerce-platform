import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers, FiTag, FiRefreshCw, FiBriefcase,
  FiLogOut, FiMenu, FiX, FiChevronRight, FiBell, FiTrendingUp
} from 'react-icons/fi'

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { path: '/admin/products', label: 'Products', icon: FiPackage },
  { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { path: '/admin/users', label: 'Users', icon: FiUsers },
  { path: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { path: '/admin/marketing', label: 'Marketing', icon: FiTrendingUp },
  { path: '/admin/returns', label: 'Returns', icon: FiRefreshCw },
  { path: '/admin/sellers', label: 'Sellers', icon: FiBriefcase },
]

// Shared sidebar nav content
function SidebarContent({ location, user, handleLogout, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-luxury-darkGray flex-shrink-0">
        <span className="text-2xl font-serif font-bold text-luxury-gold">SKLP Admin</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors touch-target"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 space-y-1 px-2 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group touch-target
                ${isActive
                  ? 'bg-luxury-gold text-luxury-black font-bold shadow-glow'
                  : 'text-luxury-lightGray hover:bg-luxury-darkGray hover:text-luxury-gold'
                }`}
            >
              <Icon size={20} className={isActive ? 'text-luxury-black' : 'group-hover:text-luxury-gold'} />
              <span className="text-sm font-medium truncate">{label}</span>
              {isActive && <FiChevronRight size={16} className="ml-auto text-luxury-black" />}
            </Link>
          )
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-luxury-darkGray p-4 flex-shrink-0">
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
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/20 transition-colors touch-target"
        >
          <FiLogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}

function AdminLayout({ children }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-luxury-black overflow-hidden">

      {/* ─── MOBILE OVERLAY DRAWER (hidden on lg+) ─── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-72 h-full bg-luxury-charcoal border-r border-luxury-darkGray flex flex-col safe-pt"
            >
              <SidebarContent
                location={location}
                user={user}
                handleLogout={handleLogout}
                onClose={() => setMobileDrawerOpen(false)}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DESKTOP SIDEBAR (hidden on mobile) ─── */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } bg-luxury-charcoal border-r border-luxury-darkGray flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-luxury-darkGray">
          {!sidebarCollapsed && (
            <span className="text-2xl font-serif font-bold text-luxury-gold">SKLP Admin</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors ml-auto touch-target"
          >
            {sidebarCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
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
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group touch-target
                  ${isActive
                    ? 'bg-luxury-gold text-luxury-black font-bold shadow-glow'
                    : 'text-luxury-lightGray hover:bg-luxury-darkGray hover:text-luxury-gold'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-luxury-black' : 'group-hover:text-luxury-gold'} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {!sidebarCollapsed && isActive && (
                  <FiChevronRight size={16} className="ml-auto text-luxury-black" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-luxury-darkGray p-4">
          {!sidebarCollapsed ? (
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
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/20 transition-colors touch-target ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <FiLogOut size={18} />
            {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="h-14 sm:h-16 bg-luxury-charcoal border-b border-luxury-darkGray flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors touch-target mr-2"
          >
            <FiMenu size={20} />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-white capitalize truncate">
            {navItems.find(n => n.path === location.pathname)?.label || 'Admin Panel'}
          </h2>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-luxury-mediumGray hover:text-luxury-gold transition-colors touch-target">
              <FiBell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-luxury-gold rounded-full" />
            </button>
            <Link
              to="/"
              className="hidden sm:block text-sm text-luxury-mediumGray hover:text-luxury-gold transition-colors"
            >
              ← View Store
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-luxury-black p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
