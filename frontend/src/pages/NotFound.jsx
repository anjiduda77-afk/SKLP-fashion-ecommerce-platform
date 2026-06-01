import { Link } from 'react-router-dom'
import { FiHome, FiSearch } from 'react-icons/fi'

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-serif font-bold text-luxury-gold mb-4">404</h1>
        <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
        <p className="text-lg opacity-75 mb-12">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-luxury-gold text-luxury-black font-bold rounded-lg hover:bg-luxury-darkGold transition-colors"
          >
            <FiHome /> Back to Home
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-luxury-gold text-luxury-gold rounded-lg hover:bg-luxury-gold hover:text-luxury-black transition-colors"
          >
            <FiSearch /> Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
