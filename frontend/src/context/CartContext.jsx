import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([])
  const [cartTotal, setCartTotal] = useState(0)
  const [itemCount, setItemCount] = useState(0)

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      const items = JSON.parse(savedCart)
      setCartItems(items)
      calculateTotals(items)
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems))
    calculateTotals(cartItems)
  }, [cartItems])

  const calculateTotals = (items) => {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)

    setCartTotal(total)
    setItemCount(count)
  }

  const addToCart = (product, quantity = 1, variant = {}) => {
    const newItem = {
      id: product._id || product.id,
      name: product.name,
      price: product.discountedPrice || product.price,
      originalPrice: product.price,
      image: product.images?.[0]?.url || product.thumbnail,
      quantity,
      variant,
      timestamp: new Date().getTime(),
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.id === newItem.id && JSON.stringify(item.variant) === JSON.stringify(newItem.variant)
      )

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === newItem.id && JSON.stringify(item.variant) === JSON.stringify(newItem.variant)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [...prevItems, newItem]
    })
  }

  const removeFromCart = (productId, variant = {}) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.id === productId && JSON.stringify(item.variant) === JSON.stringify(variant))
      )
    )
  }

  const updateCartItem = (productId, quantity, variant = {}) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant)
      return
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
          ? { ...item, quantity }
          : item
      )
    )
  }

  const clearCart = () => {
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
