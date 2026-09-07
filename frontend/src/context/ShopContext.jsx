import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import apiClient from '../services/apiClient'

const ShopContext = createContext()

export const ShopProvider = ({ children }) => {
  const [selectedShop, setSelectedShopState] = useState(() => {
    try {
      const saved = localStorage.getItem('sklp-selected-shop')
      return saved ? JSON.parse(saved) : null
    } catch (_e) {
      return null
    }
  })
  const [shopsList, setShopsList] = useState([])
  const [isLoadingShops, setIsLoadingShops] = useState(false)
  const [isShopModalOpen, setIsShopModalOpen] = useState(false)

  const fetchShops = useCallback(async (searchQuery = '') => {
    setIsLoadingShops(true)
    try {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''
      const res = await apiClient.get(`/shops${params}`)
      if (res.data?.success && Array.isArray(res.data.shops)) {
        setShopsList(res.data.shops)
      }
    } catch (err) {
      console.warn('[SHOP CONTEXT] Failed to fetch active shops:', err.message)
    } finally {
      setIsLoadingShops(false)
    }
  }, [])

  useEffect(() => {
    fetchShops()
  }, [fetchShops])


  const selectShop = useCallback((shop) => {
    setSelectedShopState(shop)
    try {
      if (shop) {
        localStorage.setItem('sklp-selected-shop', JSON.stringify(shop))
      } else {
        localStorage.removeItem('sklp-selected-shop')
      }
    } catch (_e) {
      // Storage unavailable or disabled
    }
    setIsShopModalOpen(false)
  }, [])

  const clearShop = useCallback(() => {
    setSelectedShopState(null)
    try {
      localStorage.removeItem('sklp-selected-shop')
    } catch (_e) {
      // Storage unavailable or disabled
    }
  }, [])

  const openShopModal = useCallback(() => setIsShopModalOpen(true), [])
  const closeShopModal = useCallback(() => setIsShopModalOpen(false), [])

  return (
    <ShopContext.Provider
      value={{
        selectedShop,
        shopsList,
        isLoadingShops,
        isShopModalOpen,
        selectShop,
        clearShop,
        openShopModal,
        closeShopModal,
        refreshShops: fetchShops
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

export const useShop = () => {
  const context = useContext(ShopContext)
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider')
  }
  return context
}

export default ShopContext
