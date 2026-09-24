
/**
 * STYLE STREET — Central Brand Typography Component
 *
 * Provides a unified, distinctive haute-couture typography style for the
 * "STYLE STREET" platform name across the entire application.
 *
 * Rules:
 * - Uses central brand font ('Cinzel' with luxury serif fallbacks)
 * - Bright Mode: High-contrast rich charcoal/black + deep luxury amber gold
 * - Dark Mode: High-contrast pure white + luminous radiant gold
 * - Scalable & responsive without text clipping or layout distortion
 */
export default function BrandName({
  size = 'md',
  className = '',
  accent = true,
  as = 'span'
}) {
  const Component = as

  const sizeClasses = {
    xs: 'text-[11px] sm:text-xs tracking-[0.16em]',
    sm: 'text-xs sm:text-sm tracking-[0.15em]',
    md: 'text-sm sm:text-base tracking-[0.14em]',
    lg: 'text-lg sm:text-xl tracking-[0.14em]',
    xl: 'text-xl sm:text-2xl tracking-[0.13em]',
    '2xl': 'text-2xl sm:text-3xl tracking-[0.12em]',
  }[size] || sizeClasses.md

  return (
    <Component
      className={`brand-name font-brand font-black uppercase inline-flex items-center select-none ${sizeClasses} ${className}`}
      aria-label="STYLE STREET"
    >
      <span className="brand-word-style">STYLE</span>
      <span className="inline-block w-[0.28em]" />
      <span className={`brand-word-street ${accent ? 'brand-accent' : ''}`}>STREET</span>
    </Component>
  )
}
