import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiHelpCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'

function Footer({ isDarkMode }) {
  const { t } = useTranslation()
  const [showHelpline, setShowHelpline] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const handleOpenHelpline = () => setShowHelpline(true)
    window.addEventListener('open-helpline', handleOpenHelpline)
    return () => window.removeEventListener('open-helpline', handleOpenHelpline)
  }, [])

  return (
    <>
      <footer className={`transition-all duration-300 mt-20 border-t
        ${isDarkMode
          ? 'bg-gradient-to-br from-black via-luxury-charcoal to-black border-white/10 text-white'
          : 'bg-gradient-to-br from-luxury-offWhite via-white to-luxury-offWhite border-luxury-lightGray text-luxury-black'}`}
      >
        <div className="container-custom py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo and Copyright */}
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-serif font-bold text-luxury-gold">SKLP</h2>
              <span className="opacity-50 text-xs">|</span>
              <p className="text-xs opacity-75">{t('footer.allRightsReserved', '© 2024 SKLP. All rights reserved.')}</p>
            </div>

            {/* Helpline settings button & Chatbot trigger */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
                className="py-2.5 px-5 bg-luxury-gold/15 text-luxury-gold hover:bg-luxury-gold hover:text-black border border-luxury-gold/30 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                💬 Chat Bot
              </button>
              <button
                type="button"
                onClick={() => setShowHelpline(true)}
                className="py-2.5 px-5 bg-luxury-gold text-luxury-black hover:bg-luxury-darkGold rounded-full text-xs font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-glow"
              >
                📞 Help Line & Info
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* HELPLINE & INFO SETTINGS MODAL */}
      <AnimatePresence>
        {showHelpline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className={`w-full max-w-4xl p-6 md:p-8 rounded-[2rem] border shadow-2xl relative max-h-[90vh] overflow-y-auto
                ${isDarkMode ? 'bg-luxury-black border-white/10 text-white shadow-dark-glow' : 'bg-white border-luxury-gold/30 text-luxury-black'}`}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowHelpline(false)}
                className={`absolute top-6 right-6 p-2.5 rounded-full border transition-all
                  ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-luxury-gold' : 'bg-luxury-offWhite hover:bg-luxury-lightGray text-luxury-darkBlack'}`}
              >
                <FiX size={18} />
              </button>

              <div className="flex items-center gap-2 mb-8 border-b pb-4 border-current/15">
                <FiHelpCircle className="text-luxury-gold text-2xl animate-pulse" />
                <h2 className="text-2xl font-serif font-bold uppercase tracking-wider">SKLP Helpline & Info Settings</h2>
              </div>

              {/* Responsive columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Brand description and Newsletter */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-luxury-gold mb-3 uppercase tracking-wider">About SKLP</h3>
                    <p className="text-xs opacity-75 leading-relaxed">
                      {t('footer.description', 'Premium fashion and footwear for everyone. Discover luxury style and comfort.')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-luxury-gold mb-3 uppercase tracking-wider">{t('footer.newsletter', 'Newsletter')}</h3>
                    <p className="text-xs opacity-75 mb-3">
                      {t('footer.newsletterText', 'Subscribe to get special offers and updates.')}
                    </p>
                    <div className={`flex rounded-full overflow-hidden border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'}`}>
                      <input
                        type="email"
                        placeholder={t('footer.emailPlaceholder', 'Your email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`flex-1 px-4 py-2 text-xs bg-transparent outline-none border-none focus:ring-0
                          ${isDarkMode ? 'text-white placeholder:text-white/50' : 'text-black placeholder:text-black/50'}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (email) {
                            toast.success('Joined newsletter!');
                            setEmail('');
                          }
                        }}
                        className="px-4 py-2 bg-luxury-gold text-luxury-black text-xs font-bold hover:bg-luxury-darkGold transition-colors"
                      >
                        {t('footer.join', 'Join')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div>
                  <h3 className="text-base font-bold text-luxury-gold mb-4 uppercase tracking-wider">{t('footer.quickLinks', 'Quick Links')}</h3>
                  <ul className="space-y-3 text-xs">
                    <li><Link to="/" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.home', 'Home')}</Link></li>
                    <li><Link to="/products" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.products', 'Products')}</Link></li>
                    <li><Link to="/profile" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.aboutUs', 'About Us')}</Link></li>
                    <li><Link to="/profile" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.contact', 'Contact')}</Link></li>
                  </ul>
                </div>

                {/* Support Links */}
                <div>
                  <h3 className="text-base font-bold text-luxury-gold mb-4 uppercase tracking-wider">{t('footer.support', 'Support')}</h3>
                  <ul className="space-y-3 text-xs">
                    <li><Link to="/profile" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.shippingInfo', 'Shipping Info')}</Link></li>
                    <li><Link to="/profile" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.returns', 'Returns')}</Link></li>
                    <li><Link to="/profile" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.faq', 'FAQ')}</Link></li>
                    <li><Link to="/orders" onClick={() => setShowHelpline(false)} className="hover:text-luxury-gold transition-colors block py-1 font-semibold">{t('footer.trackOrder', 'Track Order')}</Link></li>
                  </ul>
                </div>

              </div>

              {/* Helpline direct contacts */}
              <div className="mt-8 pt-6 border-t border-current/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold">
                <div className="flex gap-4">
                  <span>📞 Helpline: +1 (800) 123-4567</span>
                  <span className="opacity-50">|</span>
                  <span>✉️ Email: support@sklp.com</span>
                </div>
                <button
                  onClick={() => setShowHelpline(false)}
                  className="px-6 py-2 bg-luxury-gold text-luxury-black font-extrabold uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition-all"
                >
                  Close Settings
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Footer
