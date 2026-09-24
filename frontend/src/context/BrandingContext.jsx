/**
 * BrandingContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the platform branding configuration (logo URLs, brand colours, etc.)
 * from the public /api/branding endpoint once at app boot and makes it
 * available to all receipt, label and invoice components via useBranding().
 *
 * Falls back gracefully to local defaults when the API is unavailable.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import apiClient from '@services/apiClient'

// ── Sensible defaults (used until the API responds / on error) ─────────────────
export const DEFAULT_BRANDING = {
  brandName:    'STYLE STREET',
  tagline:      'Luxury Fashion Marketplace',
  primaryColor: '#B8860B',
  secondaryColor: '#1a1a1a',
  supportEmail: 'support@stylestreet.in',
  supportPhone: '',
  websiteUrl:   'https://stylestreet.in',
  gstin:        '',
  receiptFooterText: "Thank you for shopping with Style Street — India's premier luxury fashion destination.",
  registeredAddress: {
    street:  '',
    city:    'Hyderabad',
    state:   'Telangana',
    pincode: '500001',
    country: 'India'
  },
  mainLogo:     { url: '', publicId: '' },
  receiptLogo:  { url: '', publicId: '' },
  shippingLogo: { url: '', publicId: '' },
  emailLogo:    { url: '', publicId: '' },
  favicon:      { url: '', publicId: '' }
}

// ── Context ───────────────────────────────────────────────────────────────────
const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  loading: true,
  error: null,
  refresh: () => {}
})

// ── Provider ──────────────────────────────────────────────────────────────────
export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient.get('/branding')
      if (res.data?.success && res.data?.branding) {
        // Deep-merge with defaults so missing fields always have a value
        setBranding({ ...DEFAULT_BRANDING, ...res.data.branding })
      }
    } catch (err) {
      console.warn('[BrandingContext] Failed to load branding config — using defaults:', err.message)
      setError(err.message)
      // Keep default branding so receipts still render
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  return (
    <BrandingContext.Provider value={{ branding, loading, error, refresh: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBranding() {
  return useContext(BrandingContext)
}

/**
 * Returns the best logo URL for a given logo slot.
 * If the slot's url is empty, falls back to the next available logo
 * (receiptLogo → mainLogo → local static import passed as fallback).
 */
export function resolveLogoUrl(branding, logoType = 'receiptLogo', staticFallback = null) {
  if (!branding) return staticFallback

  // Priority chain per slot type
  const chains = {
    receiptLogo:  ['receiptLogo', 'mainLogo'],
    shippingLogo: ['shippingLogo', 'receiptLogo', 'mainLogo'],
    emailLogo:    ['emailLogo', 'receiptLogo', 'mainLogo'],
    favicon:      ['favicon', 'mainLogo'],
    mainLogo:     ['mainLogo']
  }

  const chain = chains[logoType] || ['receiptLogo', 'mainLogo']
  for (const slot of chain) {
    const url = branding[slot]?.url
    if (url && url.trim() !== '') return url
  }

  return staticFallback
}

export default BrandingContext
