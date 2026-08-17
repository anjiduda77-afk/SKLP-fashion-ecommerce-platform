import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { wishlistService } from '@services/apiServices'
import { useAuth } from '@context/AuthContext'
import { toast } from 'react-toastify'

const WishlistContext = createContext()

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuth()

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wishlist')
    if (saved) {
      try {
        setWishlistItems(JSON.parse(saved))
      } catch {
        setWishlistItems([])
      }
    }
  }, [])

  // Sync to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlistItems))
  }, [wishlistItems])

  // Fetch and merge from API when authenticated, clear on logout
  useEffect(() => {
    if (isAuthenticated) {
      const syncUserWishlist = async () => {
        try {
          setLoading(true)
          const response = await wishlistService.getWishlist()
          if (response?.data?.wishlist?.items) {
            const serverItems = response.data.wishlist.items.map(item => {
              if (item.product) {
                return {
                  ...item.product,
                  wishlistId: item._id,
                  addedAt: item.addedAt
                }
              }
              return null
            }).filter(Boolean)

            setWishlistItems(serverItems)
          }
        } catch (error) {
          console.warn('Error fetching wishlist:', error.message)
        } finally {
          setLoading(false)
        }
      }
      syncUserWishlist()
    } else {
      // Clear wishlist state on logout
      setWishlistItems([])
    }
  }, [isAuthenticated])

  const isInWishlist = useCallback(
    (productId) => wishlistItems.some((item) => item._id === productId || item.id === productId),
    [wishlistItems]
  )

  const addToWishlist = async (product) => {
    const id = product._id || product.id
    if (isInWishlist(id)) return

    // Optimistic update
    setWishlistItems((prev) => [...prev, product])
    toast.success(`${product.name} added to wishlist ❤️`)

    if (isAuthenticated) {
      try {
        await wishlistService.addToWishlist(id)
      } catch {
        // Revert on failure
        setWishlistItems((prev) => prev.filter((item) => (item._id || item.id) !== id))
        toast.error('Failed to update wishlist')
      }
    }
  }

  const removeFromWishlist = async (productId) => {
    const removed = wishlistItems.find((item) => (item._id || item.id) === productId)
    setWishlistItems((prev) => prev.filter((item) => (item._id || item.id) !== productId))
    toast.info('Removed from wishlist')

    if (isAuthenticated) {
      try {
        await wishlistService.removeFromWishlist(productId)
      } catch {
        // Revert on failure
        if (removed) setWishlistItems((prev) => [...prev, removed])
        toast.error('Failed to update wishlist')
      }
    }
  }

  const toggleWishlist = (product) => {
    const id = product._id || product.id
    if (isInWishlist(id)) {
      removeFromWishlist(id)
    } else {
      addToWishlist(product)
    }
  }

  const clearWishlist = () => {
    setWishlistItems([])
    localStorage.removeItem('wishlist')
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        wishlistCount: wishlistItems.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider')
  return context
}
