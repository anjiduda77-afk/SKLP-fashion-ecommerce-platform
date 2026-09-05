import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Analytics } from '@vercel/analytics/react'

// Layout Components
import Header from '@components/Common/Header'
import Footer from '@components/Common/Footer'
import MobileNavigation from '@components/Common/MobileNavigation'
import AIChatbot from '@components/Common/AIChatbot'
import ProtectedRoute from '@components/Common/ProtectedRoute'
import AdminLayout from '@components/Admin/AdminLayout'

// Immediate Critical Pages for fastest initial paint
import Home from '@pages/Home'
import Products from '@pages/Products'
import ProductDetail from '@pages/ProductDetail'
import Cart from '@pages/Cart'

// Code-split auxiliary and role-based dashboard pages
const Checkout = lazy(() => import('@pages/Checkout'))
const Orders = lazy(() => import('@pages/Orders'))
const OrderTracking = lazy(() => import('@pages/OrderTracking'))
const Wishlist = lazy(() => import('@pages/Wishlist'))
const Profile = lazy(() => import('@pages/Profile'))
const BecomeSeller = lazy(() => import('@pages/BecomeSeller'))
const ShopPage = lazy(() => import('@pages/ShopPage'))
const NotFound = lazy(() => import('@pages/NotFound'))

// Auth Pages (Lazy)
const Login = lazy(() => import('@pages/Auth/Login'))
const Register = lazy(() => import('@pages/Auth/Register'))
const ForgotPassword = lazy(() => import('@pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@pages/Auth/ResetPassword'))
const VerifyEmail = lazy(() => import('@pages/Auth/VerifyEmail'))

// Admin Pages (Lazy - isolates heavy chart.js bundles)
const AdminDashboard = lazy(() => import('@pages/Admin/Dashboard'))
const AdminProducts = lazy(() => import('@pages/Admin/Products'))
const AdminOrders = lazy(() => import('@pages/Admin/Orders'))
const AdminUsers = lazy(() => import('@pages/Admin/Users'))
const AdminCoupons = lazy(() => import('@pages/Admin/Coupons'))
const AdminReturns = lazy(() => import('@pages/Admin/Returns'))
const AdminSellers = lazy(() => import('@pages/Admin/Sellers'))
const AdminMarketing = lazy(() => import('@pages/Admin/Marketing'))

// Seller & Delivery Dashboards (Lazy)
const SellerDashboard = lazy(() => import('@pages/Seller/Dashboard'))
const DeliveryDashboard = lazy(() => import('@pages/Delivery/Dashboard'))

// Marketing Components
import AnnouncementBar from '@components/Marketing/AnnouncementBar'
import ExitIntentPopup from '@components/Marketing/ExitIntentPopup'

const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
    <span className="text-[11px] uppercase tracking-widest font-semibold opacity-60 text-amber-500">
      Loading SKLP Fashion...
    </span>
  </div>
)


import { AuthProvider } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { CartProvider } from '@context/CartContext'
import { WishlistProvider } from '@context/WishlistContext'
import { ShopProvider } from '@context/ShopContext'
import ChooseShopModal from '@components/Shop/ChooseShopModal'


function App() {
  const { i18n } = useTranslation()
  const { isDarkMode, language } = useTheme()

  useEffect(() => {
    i18n.changeLanguage(language || 'en')
  }, [i18n, language])

  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ShopProvider>
              <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
                {/* Light/Dark Mode Background */}
                <div className={`fixed inset-0 -z-10 transition-colors duration-300
                  ${isDarkMode 
                    ? 'bg-luxury-black' 
                    : 'bg-luxury-white'}`}
                />

                {/* Announcement Bar */}
                <AnnouncementBar />

                {/* Header */}
                <Header isDarkMode={isDarkMode} />

                {/* Choose Shop / Brand Modal */}
                <ChooseShopModal />

                {/* Main Content */}
                <main className={`transition-colors duration-300 pb-20 md:pb-0
                  ${isDarkMode 
                    ? 'bg-luxury-charcoal text-luxury-white' 
                    : 'bg-luxury-white text-luxury-darkBlack'}`}
                >
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Home />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:id" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/wishlist" element={<Wishlist />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/orders/:id/track" element={<OrderTracking />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/account" element={<Navigate to="/profile" replace />} />
                      <Route path="/become-a-seller" element={<BecomeSeller />} />
                      <Route path="/shop/:slug" element={<ShopPage />} />
                      <Route path="/shops" element={<Products />} />

                      {/* Auth Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />

                      {/* Protected User Routes */}
                      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                      {/* Seller Routes */}
                      <Route path="/seller/dashboard" element={<ProtectedRoute requiredRole="seller"><SellerDashboard /></ProtectedRoute>} />

                      {/* Delivery Partner Routes */}
                      <Route path="/delivery/dashboard" element={<ProtectedRoute requiredRole="delivery"><DeliveryDashboard /></ProtectedRoute>} />

                      {/* Admin Routes with nested AdminLayout */}
                      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="coupons" element={<AdminCoupons />} />
                        <Route path="returns" element={<AdminReturns />} />
                        <Route path="sellers" element={<AdminSellers />} />
                        <Route path="marketing" element={<AdminMarketing />} />
                      </Route>

                      {/* 404 Route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>

                {/* Footer */}
                <Footer isDarkMode={isDarkMode} />

                {/* Mobile Navigation */}
                <MobileNavigation />

                {/* Exit Intent Popup */}
                <ExitIntentPopup />

                {/* AI Chatbot */}
                <AIChatbot />

                {/* Toast Notifications */}
                <ToastContainer
                  position="bottom-right"
                  autoClose={3000}
                  hideProgressBar={false}
                  newestOnTop={true}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme={isDarkMode ? 'dark' : 'light'}
                />

                {/* Vercel Analytics */}
                <Analytics />
              </div>
            </ShopProvider>
          </WishlistProvider>
          </CartProvider>
        </AuthProvider>
    </Router>
  )
}

export default App
