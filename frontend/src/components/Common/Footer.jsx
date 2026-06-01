import { Link } from 'react-router-dom'
import { FiFacebook, FiInstagram, FiTwitter, FiLinkedin } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'

function Footer({ isDarkMode }) {
  const { t } = useTranslation()

  return (
    <footer className={`transition-all duration-300 mt-20 border-t
      ${isDarkMode
        ? 'bg-gradient-to-br from-black via-luxury-charcoal to-black border-white/10'
        : 'bg-gradient-to-br from-luxury-offWhite via-white to-luxury-offWhite border-luxury-lightGray'}`}
    >
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-luxury-gold mb-4">SKLP</h2>
            <p className="text-sm opacity-75 mb-4">
              {t('footer.description', 'Premium fashion and footwear for everyone. Discover luxury style and comfort.')}
            </p>
            <div className="flex gap-4">
              <button className="hover:text-luxury-gold transition-colors"><FiFacebook /></button>
              <button className="hover:text-luxury-gold transition-colors"><FiInstagram /></button>
              <button className="hover:text-luxury-gold transition-colors"><FiTwitter /></button>
              <button className="hover:text-luxury-gold transition-colors"><FiLinkedin /></button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-luxury-gold">{t('footer.quickLinks', 'Quick Links')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-luxury-gold transition-colors">{t('footer.home', 'Home')}</Link></li>
              <li><Link to="/products" className="hover:text-luxury-gold transition-colors">{t('footer.products', 'Products')}</Link></li>
              <li><Link to="/about" className="hover:text-luxury-gold transition-colors">{t('footer.aboutUs', 'About Us')}</Link></li>
              <li><Link to="/contact" className="hover:text-luxury-gold transition-colors">{t('footer.contact', 'Contact')}</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h3 className="font-semibold mb-4 text-luxury-gold">{t('footer.support', 'Support')}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.shippingInfo', 'Shipping Info')}</a></li>
              <li><a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.returns', 'Returns')}</a></li>
              <li><a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.faq', 'FAQ')}</a></li>
              <li><a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.trackOrder', 'Track Order')}</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4 text-luxury-gold">{t('footer.newsletter', 'Newsletter')}</h3>
            <p className="text-sm opacity-75 mb-4">
              {t('footer.newsletterText', 'Subscribe to get special offers and updates.')}
            </p>
            <div className={`flex rounded-full overflow-hidden border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'}`}>
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder', 'Your email')}
                className={`flex-1 px-4 py-3 bg-transparent outline-none border-none focus:ring-0
                  ${isDarkMode ? 'text-white placeholder:text-white/50' : 'text-black placeholder:text-black/50'}`}
              />
              <button type="button" className="px-5 py-3 bg-luxury-gold text-luxury-black font-semibold hover:bg-luxury-darkGold transition-colors">
                {t('footer.join', 'Join')}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-luxury-mediumGray pt-8 flex flex-col md:flex-row justify-between items-center text-sm opacity-75">
          <p>{t('footer.allRightsReserved', '© 2024 SKLP. All rights reserved.')}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.privacyPolicy', 'Privacy Policy')}</a>
            <a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.termsOfService', 'Terms of Service')}</a>
            <a href="#" className="hover:text-luxury-gold transition-colors">{t('footer.cookiePolicy', 'Cookie Policy')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
