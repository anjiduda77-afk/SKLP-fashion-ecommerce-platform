import { useEffect } from 'react'
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

// Pages
import Home from '@pages/Home'
import Products from '@pages/Products'
import ProductDetail from '@pages/ProductDetail'
import Cart from '@pages/Cart'
import Checkout from '@pages/Checkout'
import Orders from '@pages/Orders'
import OrderTracking from '@pages/OrderTracking'
import Wishlist from '@pages/Wishlist'
import Profile from '@pages/Profile'
import BecomeSeller from '@pages/BecomeSeller'
import ShopPage from '@pages/ShopPage'
import NotFound from '@pages/NotFound'

// Auth Pages
import Login from '@pages/Auth/Login'
import Register from '@pages/Auth/Register'
import ForgotPassword from '@pages/Auth/ForgotPassword'
import ResetPassword from '@pages/Auth/ResetPassword'
import VerifyEmail from '@pages/Auth/VerifyEmail'

// Admin Pages
import AdminDashboard from '@pages/Admin/Dashboard'
import AdminProducts from '@pages/Admin/Products'
import AdminOrders from '@pages/Admin/Orders'
import AdminUsers from '@pages/Admin/Users'
import AdminCoupons from '@pages/Admin/Coupons'
import AdminReturns from '@pages/Admin/Returns'
import AdminSellers from '@pages/Admin/Sellers'
import AdminMarketing from '@pages/Admin/Marketing'

// Marketing Components
import AnnouncementBar from '@components/Marketing/AnnouncementBar'
import ExitIntentPopup from '@components/Marketing/ExitIntentPopup'

// Seller Pages
import SellerDashboard from '@pages/Seller/Dashboard'

// Delivery Pages
import DeliveryDashboard from '@pages/Delivery/Dashboard'

// Context
import { AuthProvider } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { CartProvider } from '@context/CartContext'
import { WishlistProvider } from '@context/WishlistContext'


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

              {/* Main Content */}
              <main className={`transition-colors duration-300 
                ${isDarkMode 
                  ? 'bg-luxury-charcoal text-luxury-white' 
                  : 'bg-luxury-white text-luxury-darkBlack'}`}
              >
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

                  {/* Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/otp-login" element={<Navigate to="/login" replace />} />

                  {/* Admin Routes */}
                  <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminProducts /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminOrders /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/coupons" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminCoupons /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/marketing" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminMarketing /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/returns" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminReturns /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/sellers" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSellers /></AdminLayout></ProtectedRoute>} />

                  {/* Seller Routes */}
                  <Route path="/seller/dashboard" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />

                  {/* Delivery Routes */}
                  <Route path="/delivery/dashboard" element={<ProtectedRoute allowedRoles={['delivery', 'deliveryPartner']}><DeliveryDashboard /></ProtectedRoute>} />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>

              {/* Footer */}
              <Footer isDarkMode={isDarkMode} />

              {/* Mobile Navigation */}
              <MobileNavigation isDarkMode={isDarkMode} />

              {/* Exit Intent Marketing Popup */}
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
          </WishlistProvider>
          </CartProvider>
        </AuthProvider>
    </Router>
  )
}

export default App
