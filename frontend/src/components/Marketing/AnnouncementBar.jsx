import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiClock, FiCopy, FiCheck, FiArrowRight, FiTag } from 'react-icons/fi';
import { useMarketingCampaigns } from '@hooks/useMarketingCampaigns';
import { toast } from 'react-toastify';

export default function AnnouncementBar() {
  const { topCampaign: campaign, getAssignedVariant, trackImpression, trackClick } = useMarketingCampaigns({
    type: 'announcement-bar',
    placement: 'all'
  });

  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const variant = useMemo(() => {
    return getAssignedVariant(campaign);
  }, [campaign, getAssignedVariant]);

  // Track impression when rendered
  useEffect(() => {
    if (campaign && variant && !dismissed) {
      trackImpression(campaign, variant.variantId);
    }
  }, [campaign, variant, dismissed, trackImpression]);

  // Countdown timer calculation if campaign ending soon
  useEffect(() => {
    if (!campaign?.schedule?.endDate) return;

    const calculateTime = () => {
      const diff = new Date(campaign.schedule.endDate) - new Date();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  // Check dismissal
  useEffect(() => {
    if (campaign?._id) {
      const isDismissed = sessionStorage.getItem(`sklp_dismiss_announcement_${campaign._id}`);
      if (isDismissed) setDismissed(true);
    }
  }, [campaign]);

  const handleDismiss = () => {
    setDismissed(true);
    if (campaign?._id) {
      sessionStorage.setItem(`sklp_dismiss_announcement_${campaign._id}`, 'true');
    }
  };

  const handleCopyCoupon = (e) => {
    e.stopPropagation();
    if (!campaign?.coupon?.couponCode) return;
    navigator.clipboard.writeText(campaign.coupon.couponCode);
    setCopied(true);
    toast.success(`Coupon code ${campaign.coupon.couponCode} copied! 🎉`);
    trackClick(campaign, variant?.variantId);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCtaClick = () => {
    trackClick(campaign, variant?.variantId);
  };

  if (!campaign || !variant || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-50 text-xs font-medium border-b border-amber-400/30 overflow-hidden"
        style={{
          backgroundColor: variant.backgroundColor || '#0e0e0e',
          color: variant.textColor || '#FFFFFF'
        }}
      >
        <div className="container-custom py-2 px-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Badge & Headline */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px] justify-center sm:justify-start">
            {variant.badgeText && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-sm">
                {variant.badgeText}
              </span>
            )}
            <span className="truncate tracking-wide font-semibold text-center sm:text-left">
              {variant.headline}
            </span>
          </div>

          {/* Center: Countdown Timer (if available) */}
          {timeLeft && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10 text-amber-300 font-mono text-[11px]">
              <FiClock size={12} className="animate-pulse" />
              <span>Ends in:</span>
              <span className="font-bold">
                {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          )}

          {/* Right: Coupon Pill & CTA */}
          <div className="flex items-center gap-2.5 justify-center sm:justify-end">
            {campaign.coupon?.enabled && campaign.coupon?.couponCode && (
              <button
                type="button"
                onClick={handleCopyCoupon}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 transition-all font-mono font-bold text-[11px] active:scale-95"
                title="Click to copy coupon code"
              >
                <FiTag size={11} />
                <span>{campaign.coupon.couponCode}</span>
                {copied ? <FiCheck size={11} className="text-green-400" /> : <FiCopy size={11} />}
              </button>
            )}

            {variant.ctaText && (
              <Link
                to={variant.ctaLink || '/products'}
                onClick={handleCtaClick}
                className="flex items-center gap-1 px-3 py-1 rounded-lg font-bold uppercase tracking-wider text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-yellow-400 transition-all shadow-sm active:scale-95"
              >
                <span>{variant.ctaText}</span>
                <FiArrowRight size={11} />
              </Link>
            )}

            {/* Dismiss button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss Announcement"
              className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <FiX size={14} />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
