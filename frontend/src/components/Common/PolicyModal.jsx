import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiX, FiTruck, FiRefreshCw, FiShield, FiAward, 
  FiPhone, FiCheck, FiStar, FiFileText
} from 'react-icons/fi'

function PolicyModal({ isOpen, onClose, initialTab = 'shipping', isDarkMode = true }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  if (!isOpen) return null

  const tabs = [
    { id: 'shipping', label: 'Shipping & Delivery', icon: FiTruck },
    { id: 'returns', label: 'Returns & Refunds', icon: FiRefreshCw },
    { id: 'payments', label: 'Payments & Security', icon: FiShield },
    { id: 'vip', label: 'VIP Membership Plan', icon: FiAward },
    { id: 'support', label: 'Customer Handling & Helpline', icon: FiPhone }
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className={`w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden
            ${isDarkMode 
              ? 'bg-luxury-black border-white/10 text-white shadow-dark-glow' 
              : 'bg-white border-luxury-gold/30 text-luxury-darkBlack'}`}
        >
          {/* Header */}
          <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-luxury-gold/20 flex items-center justify-center text-luxury-gold">
                <FiFileText size={22} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold tracking-wide">SKLP Policies & Customer Plans</h2>
                <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Official Store Policies & Customer Resolution Standards</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2.5 rounded-full border transition-all ${
                isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/15 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'
              }`}
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className={`flex border-b overflow-x-auto scrollbar-none px-4 pt-2 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? 'border-luxury-gold text-luxury-gold bg-luxury-gold/10'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content Body */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 text-sm">
            
            {/* 1. SHIPPING POLICY */}
            {activeTab === 'shipping' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/30 flex items-center gap-4">
                  <FiTruck size={32} className="text-luxury-gold shrink-0" />
                  <div>
                    <h3 className="font-bold text-luxury-gold uppercase text-xs tracking-wider">Express Nationwide Delivery</h3>
                    <p className="text-xs opacity-80 mt-0.5">Free standard shipping on all orders over ₹1,999. Dispatch within 24 hours.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <h4 className="font-bold mb-2 flex items-center gap-2 text-luxury-gold">
                      <FiCheck className="text-green-400" /> Standard Delivery (3-5 Days)
                    </h4>
                    <p className="text-xs opacity-75">Available across all 19,000+ PIN codes in India with real-time OTP doorstep verification.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <h4 className="font-bold mb-2 flex items-center gap-2 text-luxury-gold">
                      <FiCheck className="text-green-400" /> SKLP VIP Express (1-2 Days)
                    </h4>
                    <p className="text-xs opacity-75">Priority handling for metro cities (Hyderabad, Bangalore, Mumbai, Delhi, Chennai, Kolkata).</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-xs">Delivery Guarantee & Tracking</h4>
                  <ul className="space-y-2 text-xs opacity-80 list-disc pl-5">
                    <li>Live GPS driver tracking available via our integrated Delivery Partner Dashboard.</li>
                    <li>Secure OTP Verification required at delivery for high-value fashion items.</li>
                    <li>Tamper-proof double-layered luxury box packaging for all delicate garments and footwear.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 2. RETURNS & REFUNDS POLICY */}
            {activeTab === 'returns' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-4">
                  <FiRefreshCw size={32} className="text-blue-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-400 uppercase text-xs tracking-wider">15-Day No-Questions-Asked Returns</h3>
                    <p className="text-xs opacity-80 mt-0.5">Free doorstep pickup and instant refund processing within 24 hours of pickup verification.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-luxury-gold/20 text-luxury-gold flex items-center justify-center mx-auto mb-2 font-bold">1</div>
                    <h5 className="font-bold text-xs">Request Online</h5>
                    <p className="text-[11px] opacity-70 mt-1">Select items & return reason from My Orders page.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-luxury-gold/20 text-luxury-gold flex items-center justify-center mx-auto mb-2 font-bold">2</div>
                    <h5 className="font-bold text-xs">Doorstep Pickup</h5>
                    <p className="text-[11px] opacity-70 mt-1">Free pickup by SKLP courier partner at your convenience.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-luxury-gold/20 text-luxury-gold flex items-center justify-center mx-auto mb-2 font-bold">3</div>
                    <h5 className="font-bold text-xs">Instant Refund</h5>
                    <p className="text-[11px] opacity-70 mt-1">Refund credited directly to Original Payment / UPI / Store Credit.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-xs">Return Conditions</h4>
                  <p className="text-xs opacity-75 leading-relaxed">
                    Items must be unwashed, unworn, and have original luxury brand tags intact. Footwear must be returned in the original shoe box undamaged.
                  </p>
                </div>
              </div>
            )}

            {/* 3. PAYMENTS & SECURITY POLICY */}
            {activeTab === 'payments' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center gap-4">
                  <FiShield size={32} className="text-green-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-400 uppercase text-xs tracking-wider">256-Bit Bank Grade Payment Encryption</h3>
                    <p className="text-xs opacity-80 mt-0.5">PCI-DSS Level 1 Compliant. Zero card CVV retention for 100% buyer safety.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-luxury-gold">Accepted Payment Methods</h4>
                    <ul className="space-y-1.5 text-xs opacity-80">
                      <li>• UPI (GPay, PhonePe, Paytm, BHIM)</li>
                      <li>• Credit & Debit Cards (Visa, Mastercard, RuPay, Amex)</li>
                      <li>• Cash on Delivery (COD with doorstep OTP)</li>
                      <li>• Net Banking (50+ Major Indian Banks)</li>
                      <li>• No-Cost EMI on select bank credit cards</li>
                    </ul>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-luxury-gold">Payment Protection Plan</h4>
                    <p className="text-xs opacity-75 leading-relaxed">
                      If a payment fails during checkout, deducted funds are automatically reversed by bank nodes within 10 to 15 minutes guaranteed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. VIP MEMBERSHIP PLAN */}
            {activeTab === 'vip' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-luxury-gold/30 via-yellow-500/20 to-luxury-gold/30 border border-luxury-gold/50 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <FiAward size={40} className="text-luxury-gold" />
                    <div>
                      <h3 className="font-extrabold text-base text-luxury-gold uppercase tracking-wider">SKLP VIP Elite Club Plan</h3>
                      <p className="text-xs opacity-90 mt-0.5">Unlock premium perks, 1-day free shipping, and exclusive rewards.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      alert('Congratulations! VIP Membership Plan activated on your account!')
                      onClose()
                    }}
                    className="px-6 py-3 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition-all shadow-glow shrink-0"
                  >
                    Activate Free VIP Trial
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <FiTruck className="text-luxury-gold text-2xl mx-auto mb-2" />
                    <h5 className="font-bold text-xs">Free 1-Day Express Shipping</h5>
                    <p className="text-[11px] opacity-70 mt-1">Zero shipping fees on all orders.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <FiStar className="text-luxury-gold text-2xl mx-auto mb-2" />
                    <h5 className="font-bold text-xs">10% Cashback Points</h5>
                    <p className="text-[11px] opacity-70 mt-1">Earn store rewards on every fashion purchase.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <FiRefreshCw className="text-luxury-gold text-2xl mx-auto mb-2" />
                    <h5 className="font-bold text-xs">Extended 30-Day Returns</h5>
                    <p className="text-[11px] opacity-70 mt-1">Double the standard return window.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <FiPhone className="text-luxury-gold text-2xl mx-auto mb-2" />
                    <h5 className="font-bold text-xs">Priority VIP Helpdesk</h5>
                    <p className="text-[11px] opacity-70 mt-1">Direct access to dedicated fashion advisor.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. CUSTOMER HANDLING & HELPLINE */}
            {activeTab === 'support' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-4">
                  <FiPhone size={32} className="text-purple-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-purple-400 uppercase text-xs tracking-wider">24/7 Dedicated Customer Resolution</h3>
                    <p className="text-xs opacity-80 mt-0.5">Instant AI Assistance, Phone support, & Email ticket response within 2 hours.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-luxury-gold mb-3">Instant Customer Channels</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="opacity-80">📞 Toll-Free Helpline:</span>
                        <span className="font-bold text-luxury-gold">+1 (800) 123-4567</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="opacity-80">✉️ Support Email:</span>
                        <span className="font-bold">support@sklp.com</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="opacity-80">💬 Live AI Chatbot:</span>
                        <span className="font-bold text-green-400">Online 24/7</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-luxury-gold mb-3">Customer Service Commitment</h4>
                    <ul className="space-y-2 text-xs opacity-80 list-disc pl-4">
                      <li>Guaranteed response to support requests within 2 hours.</li>
                      <li>Doorstep exchange for size mismatches within 48 hours.</li>
                      <li>Transparent order status timeline from order placement to delivery.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Action */}
          <div className={`p-4 md:p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-gray-50'}`}>
            <p className="text-xs opacity-60">SKLP Fashion Guarantee • All transactions protected by 256-bit encryption</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-luxury-gold text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition-all shadow-glow"
            >
              Understood & Close
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PolicyModal
