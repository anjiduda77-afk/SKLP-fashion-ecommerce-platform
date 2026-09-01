import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiTag, FiCopy, FiCheck, FiSparkles } from 'react-icons/fi';
import { useMarketingCampaigns } from '@hooks/useMarketingCampaigns';
import { toast } from 'react-toastify';

export default function DynamicCampaignBanner({ placement = 'homepage', className = '' }) {
  const { topCampaign: campaign, getAssignedVariant, trackImpression, trackClick } = useMarketingCampaigns({
    type: 'banner',
    placement
  });

  const [copied, setCopied] = useState(false);

  const variant = useMemo(() => {
    return getAssignedVariant(campaign);
  }, [campaign, getAssignedVariant]);

  useEffect(() => {
    if (campaign && variant) {
      trackImpression(campaign, variant.variantId);
    }
  }, [campaign, variant, trackImpression]);

  const handleCopyCoupon = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!campaign?.coupon?.couponCode) return;
    navigator.clipboard.writeText(campaign.coupon.couponCode);
    setCopied(true);
    toast.success(`Coupon code ${campaign.coupon.couponCode} copied!`);
    trackClick(campaign, variant?.variantId);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCtaClick = () => {
    trackClick(campaign, variant?.variantId);
  };

  if (!campaign || !variant) {
    return null;
  }

  const bgImage = variant.image?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl border border-amber-500/20 shadow-xl ${className}`}
      style={{
        backgroundColor: variant.backgroundColor || '#111111',
        color: variant.textColor || '#FFFFFF'
      }}
    >
      {/* Background Graphic or Image */}
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={bgImage}
            alt={variant.headline}
            className="w-full h-full object-cover object-center opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-black flex items-center gap-1">
              <FiSparkles size={12} />
              {variant.badgeText || 'Special Promotion'}
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
            {variant.headline}
          </h3>

          {variant.subheadline && (
            <p className="text-sm text-white/80 leading-relaxed font-light">
              {variant.subheadline}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {campaign.coupon?.enabled && campaign.coupon?.couponCode && (
            <button
              type="button"
              onClick={handleCopyCoupon}
              className="px-4 py-3 rounded-2xl border-2 border-dashed border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 transition-all font-mono font-bold text-xs flex items-center gap-2"
            >
              <FiTag size={14} />
              <span>{campaign.coupon.couponCode}</span>
              {copied ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
            </button>
          )}

          <Link
            to={variant.ctaLink || '/products'}
            onClick={handleCtaClick}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-xs uppercase tracking-wider hover:from-amber-300 hover:to-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <span>{variant.ctaText || 'Shop Collection'}</span>
            <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
