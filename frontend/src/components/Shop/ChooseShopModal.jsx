import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiX, FiCheckCircle, FiStar, FiGrid, FiArrowRight } from 'react-icons/fi'
import { RiStore2Line } from 'react-icons/ri'
import { useShop } from '../../context/ShopContext'
import { useTheme } from '../../context/ThemeContext'

export default function ChooseShopModal() {
  const {
    selectedShop,
    shopsList,
    isLoadingShops,
    isShopModalOpen,
    selectShop,
    closeShopModal
  } = useShop()
  const { isDarkMode } = useTheme()
  const [search, setSearch] = useState('')

  const filteredShops = useMemo(() => {
    if (!search.trim()) return shopsList
    const q = search.trim().toLowerCase()
    return shopsList.filter(s =>
      (s.brandName || s.shopName || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    )
  }, [shopsList, search])

  if (!isShopModalOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeShopModal}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window: Bottom Sheet on Mobile, Centered Card on Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className={`relative w-full max-w-3xl max-h-[88vh] rounded-t-[2rem] sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden z-10 backdrop-blur-xl ${
            isDarkMode
              ? 'bg-[#121212]/95 border-luxury-gold/25 text-white'
              : 'bg-white/95 border-luxury-gold/35 text-black'
          }`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Header */}
          <div className={`p-4 sm:p-6 border-b flex items-center justify-between ${
            isDarkMode ? 'border-white/10' : 'border-black/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-bold shadow-glow shrink-0">
                <RiStore2Line size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif tracking-tight leading-tight">
                  Choose a Shop / Brand
                </h2>
                <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Explore verified fashion houses & official designer storefronts
                </p>
              </div>
            </div>

            <button
              onClick={closeShopModal}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all touch-target shrink-0 ${
                isDarkMode
                  ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  : 'border-black/10 text-gray-600 hover:text-black hover:bg-black/5'
              }`}
              aria-label="Close brand selection"
            >
              <FiX size={19} />
            </button>
          </div>

          {/* Full-width Search Bar & Reset */}
          <div className="p-3.5 sm:p-5 border-b border-white/5 space-y-2.5">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-luxury-gold" size={17} />
              <input
                type="text"
                placeholder="Search brands (e.g. Zara, Nike, Royal Weaves)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full h-11 pl-10 pr-9 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-white focus:border-luxury-gold'
                    : 'bg-black/5 border-black/10 text-black focus:border-luxury-gold'
                }`}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            {/* "Browse All Brands" Reset Button */}
            <button
              onClick={() => {
                selectShop(null)
                closeShopModal()
              }}
              className={`w-full py-2.5 px-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all touch-target ${
                !selectedShop
                  ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow font-black'
                  : isDarkMode
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  : 'bg-black/5 border-black/10 text-gray-700 hover:bg-black/10'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <FiGrid size={15} className="shrink-0" />
                <span className="truncate">All Brands (Marketplace View)</span>
              </span>
              {!selectedShop ? (
                <span className="text-[10px] bg-black text-luxury-gold px-2 py-0.5 rounded-full shrink-0">
                  Active
                </span>
              ) : (
                <FiArrowRight size={14} className="shrink-0 ml-2" />
              )}
            </button>
          </div>

          {/* Responsive Brand Grid (2 columns on mobile, 2 columns on tablet/desktop) */}
          <div className="p-3 sm:p-5 overflow-y-auto flex-1">
            {isLoadingShops ? (
              <div className="py-12 text-center text-sm text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full mx-auto mb-3" />
                <span>Loading luxury fashion houses...</span>
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <RiStore2Line size={36} className="mx-auto text-gray-500" />
                <p className="text-sm font-semibold">No brands match your search</p>
                <p className="text-xs text-gray-400">Try searching with a different brand keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3.5">
                {filteredShops.map((shop) => {
                  const isSelected = selectedShop && (selectedShop._id === shop._id || selectedShop.id === shop._id)
                  const brandDisplayName = shop.brandName || shop.shopName

                  return (
                    <motion.div
                      key={shop._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        selectShop(shop)
                        closeShopModal()
                      }}
                      className={`p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-luxury-gold bg-luxury-gold/15 shadow-glow'
                          : isDarkMode
                          ? 'border-white/10 bg-white/5 hover:border-luxury-gold/40 hover:bg-white/10'
                          : 'border-black/10 bg-black/5 hover:border-luxury-gold/50 hover:bg-black/10'
                      }`}
                    >
                      {/* Left: Brand DP Profile & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {shop.logo?.url ? (
                          <div className="relative shrink-0">
                            <img
                              src={shop.logo.url}
                              alt={brandDisplayName}
                              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full object-cover border-2 border-amber-400/60 shadow-md"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" title="Active Brand" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-serif font-black text-xl flex items-center justify-center border-2 border-amber-400/60 shadow-md shrink-0">
                            {brandDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h3 className="font-bold text-xs sm:text-sm truncate tracking-tight">
                              {brandDisplayName}
                            </h3>
                            <FiCheckCircle size={12} className="text-amber-400 shrink-0" title="Verified Brand" />
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                            <span className="flex items-center gap-0.5 text-luxury-gold font-bold">
                              <FiStar size={10} className="fill-current" />
                              <span>{shop.rating ? shop.rating.toFixed(1) : '5.0'}</span>
                            </span>
                            <span>•</span>
                            <span className="truncate">{shop.productCount || 10}+ items</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Selected Status Indicator */}
                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="px-2 py-1 rounded-lg bg-luxury-gold text-black font-bold text-[10px] shadow-glow uppercase">
                            Active
                          </span>
                        ) : (
                          <span className={`text-[11px] font-semibold opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            <FiArrowRight size={13} />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
