import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import BrandName from '@components/Common/BrandName'
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers, FiTag, FiRefreshCw, FiBriefcase,
  FiLogOut, FiMenu, FiX, FiChevronRight, FiBell, FiTrendingUp, FiImage, FiHome
} from 'react-icons/fi'

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { path: '/admin/products', label: 'Products', icon: FiPackage },
  { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { path: '/admin/users', label: 'Users', icon: FiUsers },
  { path: '/admin/notifications', label: 'Notifications', icon: FiBell },
  { path: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { path: '/admin/marketing', label: 'Marketing', icon: FiTrendingUp },
  { path: '/admin/returns', label: 'Returns', icon: FiRefreshCw },
  { path: '/admin/sellers', label: 'Sellers', icon: FiBriefcase },
  { path: '/admin/branding', label: 'Branding', icon: FiImage },
]

// Shared sidebar nav content
function SidebarContent({ location, user, handleLogout, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-luxury-darkGray flex-shrink-0">
        <BrandName size="lg" />
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors touch-target"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {/* Quick Storefront Link */}
      <div className="px-3 pt-3 flex-shrink-0">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-luxury-gold text-black hover:bg-luxury-lightGold transition-all font-bold text-xs uppercase tracking-wider shadow-glow"
        >
          <FiHome size={15} />
          <span>Customer Storefront</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
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
            <span className="text-2xl font-serif font-bold text-luxury-gold">STYLE STREET</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors ml-auto touch-target"
          >
            {sidebarCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
          </button>
        </div>

        {/* Quick Storefront Link */}
        <div className="px-2 pt-3 flex-shrink-0">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30 hover:bg-luxury-gold hover:text-black transition-all font-bold text-xs uppercase tracking-wider ${
              sidebarCollapsed ? 'justify-center px-1' : 'justify-center'
            }`}
            title="Return to Customer Storefront"
          >
            <FiHome size={16} />
            {!sidebarCollapsed && <span>Storefront</span>}
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
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
        <header className="h-14 sm:h-16 bg-luxury-charcoal border-b border-luxury-darkGray flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-luxury-darkGray text-luxury-gold transition-colors touch-target mr-1 flex-shrink-0"
            >
              <FiMenu size={20} />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-white capitalize truncate">
              {navItems.find(n => n.path === location.pathname)?.label || 'Admin Panel'}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-lightGold transition-all shadow-glow touch-target"
              title="Return to Customer Storefront"
            >
              <FiHome size={14} />
              <span className="hidden xs:inline">Store Home</span>
            </Link>
            <button className="relative p-2 text-luxury-mediumGray hover:text-luxury-gold transition-colors touch-target">
              <FiBell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-luxury-gold rounded-full" />
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Sub-Navigation Bar */}
        <div className="lg:hidden flex gap-1.5 overflow-x-auto py-2.5 px-3 bg-luxury-charcoal/95 border-b border-luxury-darkGray scrollbar-none flex-shrink-0 backdrop-blur-md">
          <Link
            to="/"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40 hover:bg-luxury-gold hover:text-black transition-all touch-target"
          >
            <FiHome size={12} />
            <span className="whitespace-nowrap">Store Home</span>
          </Link>
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all touch-target ${
                  isActive
                    ? 'bg-luxury-gold text-black shadow-glow'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Icon size={12} />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-luxury-black p-3 sm:p-6 w-full max-w-full">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

