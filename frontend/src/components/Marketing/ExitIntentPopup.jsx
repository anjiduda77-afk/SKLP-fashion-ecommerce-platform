import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiGift, FiCopy, FiCheck, FiArrowRight, FiPercent } from 'react-icons/fi';
import { useMarketingCampaigns } from '@hooks/useMarketingCampaigns';
import { toast } from 'react-toastify';

export default function ExitIntentPopup() {
  const { topCampaign: campaign, getAssignedVariant, trackImpression, trackClick } = useMarketingCampaigns({
    type: 'exit-intent',
    placement: 'all'
  });

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const variant = useMemo(() => {
    return getAssignedVariant(campaign);
  }, [campaign, getAssignedVariant]);

  // Open modal trigger
  const triggerPopup = useCallback(() => {
    if (!campaign || !variant) return;

    // Check frequency dismissal
    const dismissedKey = `sklp_exit_dismiss_${campaign._id}`;
    if (sessionStorage.getItem(dismissedKey) || localStorage.getItem(dismissedKey)) {
      return;
    }

    setIsOpen(true);
    trackImpression(campaign, variant.variantId);
  }, [campaign, variant, trackImpression]);

  // Desktop: Mouse leaves top of viewport
  useEffect(() => {
    if (!campaign || !variant) return;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        triggerPopup();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [campaign, variant, triggerPopup]);

  // Mobile / Inactivity fallback (25s delay)
  useEffect(() => {
    if (!campaign || !variant) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const timer = setTimeout(() => {
        triggerPopup();
      }, 25000);
      return () => clearTimeout(timer);
    }
  }, [campaign, variant, triggerPopup]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (campaign?._id) {
      sessionStorage.setItem(`sklp_exit_dismiss_${campaign._id}`, 'true');
    }
  };

  const handleCopyCoupon = (e) => {
    e.stopPropagation();
    if (!campaign?.coupon?.couponCode) return;
    navigator.clipboard.writeText(campaign.coupon.couponCode);
    setCopied(true);
    toast.success(`Discount code ${campaign.coupon.couponCode} copied! 🎉`);
    trackClick(campaign, variant?.variantId);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCta = () => {
    trackClick(campaign, variant?.variantId);
    handleClose();
  };

  if (!campaign || !variant || !isOpen) {
    return null;
  }

  const imageUrl = variant.image?.url || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0e0e0e] text-white shadow-[0_20px_70px_rgba(0,0,0,0.8)] z-10"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Close Promotion"
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white hover:text-black transition-all flex items-center justify-center"
          >
            <FiX size={18} />
          </button>

          {/* Top Banner Image */}
          <div className="relative h-48 sm:h-56 w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={variant.headline || 'Exclusive Offer'}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
            
            {variant.badgeText && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg">
                {variant.badgeText}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 text-center space-y-4 -mt-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <FiGift size={24} />
            </div>

            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
              {variant.headline}
            </h3>

            {variant.subheadline && (
              <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed">
                {variant.subheadline}
              </p>
            )}

            {/* Coupon Box */}
            {campaign.coupon?.enabled && campaign.coupon?.couponCode && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/40 flex items-center justify-between gap-3 max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <FiPercent size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">Promo Code</p>
                    <p className="font-mono font-black text-amber-300 text-base">{campaign.coupon.couponCode}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCoupon}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20"
                >
                  {copied ? (
                    <><FiCheck size={14} className="text-black" /> Copied</>
                  ) : (
                    <><FiCopy size={14} /> Copy</>
                  )}
                </button>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-2">
              <Link
                to={variant.ctaLink || '/products'}
                onClick={handleCta}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-[0.99] transition-all"
              >
                <span>{variant.ctaText || 'Claim Offer Now'}</span>
                <FiArrowRight size={16} />
              </Link>
            </div>

            <button
              onClick={handleClose}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              No thanks, I prefer paying full price
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
