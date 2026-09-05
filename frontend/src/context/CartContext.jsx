import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { cartService } from '@services/apiServices'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [cartItems, setCartItems] = useState([])
  const [cartTotal, setCartTotal] = useState(0)
  const [itemCount, setItemCount] = useState(0)
  const [cartSynced, setCartSynced] = useState(false)

  const calculateTotals = useCallback((items) => {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    setCartTotal(total)
    setItemCount(count)
  }, [])

  const normalizeCartItems = useCallback((items = []) => {
    return items.map((item) => {
      const product = item.productId && typeof item.productId === 'object' ? item.productId : {}
      const prodId = product._id || product.id || (typeof item.productId === 'string' ? item.productId : item.id)
      const img = item.image || (typeof product.images?.[0] === 'object' ? product.images?.[0]?.url : product.images?.[0]) || product.image || product.thumbnail || ''
      return {
        _id: item._id,
        id: prodId,
        productId: prodId,
        name: item.productName || product.name || item.name || 'Product',
        brand: item.brand || product.brand || 'SKLP Fashion',
        shopName: item.shopName || 'SKLP Official Store',
        sellerId: item.sellerId,
        offerId: item.offerId,
        price: item.price ?? product.price ?? 0,
        originalPrice: product.originalPrice || product.price || item.price || 0,
        image: img,
        quantity: item.quantity,
        variant: item.variant || {},
        timestamp: new Date().getTime(),
      }
    })
  }, [])

  // Sync cart with backend on auth change
  useEffect(() => {
    const syncCart = async () => {
      if (!isAuthenticated) {
        // Fallback to localStorage
        const saved = localStorage.getItem('cart')
        if (saved) {
          try {
            const items = JSON.parse(saved)
            setCartItems(items)
            calculateTotals(items)
          } catch (_e) {
            setCartItems([])
          }
        }
        return
      }

      try {
        const res = await cartService.getCart()
        if (res.data?.success && res.data?.cart?.items) {
          const normalizedItems = normalizeCartItems(res.data.cart.items)
          setCartItems(normalizedItems)
          calculateTotals(normalizedItems)
        }
        setCartSynced(true)
      } catch (err) {
        console.warn('Failed to sync cart:', err.message)
        const saved = localStorage.getItem('cart')
        if (saved) {
          try {
            const items = JSON.parse(saved)
            setCartItems(items)
            calculateTotals(items)
          } catch (_e) {
            setCartItems([])
          }
        }
      }
    }

    syncCart()
  }, [isAuthenticated, user, calculateTotals, normalizeCartItems])

  // Save cart to localStorage as backup
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems))
    calculateTotals(cartItems)
  }, [cartItems, calculateTotals])

  const addToCart = async (product, quantity = 1, variant = {}, offerId = null) => {
    const prodId = product._id || product.id
    const img = (typeof product.images?.[0] === 'object' ? product.images?.[0]?.url : product.images?.[0]) || product.image || product.thumbnail || ''
    const newItem = {
      id: prodId,
      productId: prodId,
      name: product.name,
      brand: product.brand || 'SKLP Fashion',
      shopName: product.shopName || 'SKLP Official Store',
      offerId: offerId,
      price: product.discountedPrice || product.price || 0,
      originalPrice: product.originalPrice || product.price || 0,
      image: img,
      quantity,
      variant: variant || {},
      timestamp: new Date().getTime(),
    }

    if (isAuthenticated) {
      try {
        const res = await cartService.addToCart(prodId, quantity, variant, offerId)
        if (res.data?.success && res.data?.cart?.items) {
          const normalized = normalizeCartItems(res.data.cart.items)
          setCartItems(normalized)
          calculateTotals(normalized)
          return
        }
      } catch (err) {
        console.error('Failed to add to backend cart', err)
      }
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => (item.id === newItem.id || item.productId === newItem.id || item._id === newItem.id) && 
          (!offerId || item.offerId === offerId) &&
          JSON.stringify(item.variant || {}) === JSON.stringify(newItem.variant || {})
      )

      if (existingItem) {
        return prevItems.map((item) =>
          (item.id === newItem.id || item.productId === newItem.id || item._id === newItem.id) && 
          (!offerId || item.offerId === offerId) &&
          JSON.stringify(item.variant || {}) === JSON.stringify(newItem.variant || {})
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [...prevItems, newItem]
    })
  }

  const removeFromCart = async (productId, variant = {}) => {
    if (isAuthenticated) {
      try {
        const item = cartItems.find(i => 
          (i.id === productId || i.productId === productId || i._id === productId) && 
          JSON.stringify(i.variant || {}) === JSON.stringify(variant || {})
        )
        const targetId = item?._id || productId
        const res = await cartService.removeFromCart(targetId)
        if (res.data?.success && res.data?.cart?.items) {
          const normalized = normalizeCartItems(res.data.cart.items)
          setCartItems(normalized)
          calculateTotals(normalized)
          return
        }
      } catch (err) {
        console.error('Failed to remove from backend cart', err)
      }
    }
    
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !((item.id === productId || item.productId === productId || item._id === productId) && 
          JSON.stringify(item.variant || {}) === JSON.stringify(variant || {}))
      )
    )
  }

  const updateCartItem = async (productId, quantity, variant = {}) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant)
      return
    }

    if (isAuthenticated) {
      try {
        const item = cartItems.find(i => 
          (i.id === productId || i.productId === productId || i._id === productId) && 
          JSON.stringify(i.variant || {}) === JSON.stringify(variant || {})
        )
        const targetId = item?._id || productId
        const res = await cartService.updateCartItem(targetId, quantity)
        if (res.data?.success && res.data?.cart?.items) {
          const normalized = normalizeCartItems(res.data.cart.items)
          setCartItems(normalized)
          calculateTotals(normalized)
          return
        }
      } catch (err) {
        console.error('Failed to update backend cart', err)
      }
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        (item.id === productId || item.productId === productId || item._id === productId) && 
        JSON.stringify(item.variant || {}) === JSON.stringify(variant || {})
          ? { ...item, quantity }
          : item
      )
    )
  }


  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart()
      } catch (err) {
        console.error('Failed to clear backend cart', err)
      }
    }
    setCartItems([])
  }

  const applyCoupon = (couponCode, discount) => {
    // This would be handled by a coupon context or API
    console.log('Coupon applied:', couponCode, discount)
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartTotal,
        itemCount,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        applyCoupon,
        cartSynced
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
