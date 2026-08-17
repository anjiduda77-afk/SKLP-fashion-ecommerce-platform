import { createContext, useContext, useState, useEffect } from 'react'

const CurrencyContext = createContext()

export const RATES = {
  INR: { symbol: '₹', rate: 1, label: 'INR (₹)' },
  USD: { symbol: '$', rate: 0.012, label: 'USD ($)' },
  EUR: { symbol: '€', rate: 0.011, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.0094, label: 'GBP (£)' },
  AED: { symbol: 'AED ', rate: 0.044, label: 'AED (د.إ)' },
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('sklp_currency') || 'INR')

  useEffect(() => {
    localStorage.setItem('sklp_currency', currency)
  }, [currency])

  const formatPrice = (priceInINR) => {
    const numericPrice = Number(priceInINR) || 0
    const curr = RATES[currency] || RATES.INR
    const converted = numericPrice * curr.rate
    
    if (currency === 'INR') {
      return `₹${Math.round(converted).toLocaleString('en-IN')}`
    } else {
      return `${curr.symbol}${converted.toFixed(2)}`
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, RATES }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
