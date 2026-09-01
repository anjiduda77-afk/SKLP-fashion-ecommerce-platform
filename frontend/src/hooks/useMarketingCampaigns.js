import { useState, useEffect, useCallback, useMemo } from 'react';
import { campaignService } from '@services/apiServices';
import { useAuth } from '@context/AuthContext';
import { useCart } from '@context/CartContext';

export function useMarketingCampaigns({ placement = 'all', type = null } = {}) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const { items } = useCart();

  // Detect device type
  const deviceType = useMemo(() => {
    if (typeof window === 'undefined') return 'desktop';
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  }, []);

  // Determine audience profile
  const audienceType = useMemo(() => {
    if (!isAuthenticated) {
      if (items && items.length > 0) return 'cart-abandoners';
      return 'guests';
    }
    if (items && items.length > 0) return 'cart-abandoners';
    if (user?.ordersCount === 0 || !user?.lastLogin) return 'new-customers';
    return 'returning-customers';
  }, [isAuthenticated, user, items]);

  // Frequency Check helper
  const isFrequencyAllowed = useCallback((campaign) => {
    if (!campaign || !campaign.frequency) return true;
    const { type: freqType, value: freqVal } = campaign.frequency;
    const storageKey = `sklp_camp_${campaign._id}`;

    if (freqType === 'always') return true;

    if (freqType === 'session') {
      const shown = sessionStorage.getItem(storageKey);
      return !shown;
    }

    if (freqType === 'daily') {
      const lastShown = localStorage.getItem(storageKey);
      if (!lastShown) return true;
      const hoursSince = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60);
      return hoursSince >= 24;
    }

    if (freqType === 'pageviews') {
      const viewsKey = `sklp_views_${campaign._id}`;
      const count = parseInt(sessionStorage.getItem(viewsKey) || '0', 10) + 1;
      sessionStorage.setItem(viewsKey, count.toString());
      return count % (freqVal || 3) === 0;
    }

    return true;
  }, []);

  // Mark frequency consumed
  const markFrequencyConsumed = useCallback((campaign) => {
    if (!campaign) return;
    const storageKey = `sklp_camp_${campaign._id}`;
    sessionStorage.setItem(storageKey, 'true');
    localStorage.setItem(storageKey, Date.now().toString());
  }, []);

  // Fetch active campaigns matching current context
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        placement,
        device: deviceType,
        audience: audienceType
      };
      if (type) params.type = type;

      const res = await campaignService.getActiveCampaigns(params);
      if (res.data?.success) {
        const eligible = (res.data.campaigns || []).filter(c => isFrequencyAllowed(c));
        setCampaigns(eligible);
      }
    } catch (err) {
      console.warn('[MARKETING HOOK] Failed to fetch active campaigns:', err.message);
    } finally {
      setLoading(false);
    }
  }, [placement, type, deviceType, audienceType, isFrequencyAllowed]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // A/B Variant Assignment helper
  const getAssignedVariant = useCallback((campaign) => {
    if (!campaign || !campaign.variants || campaign.variants.length === 0) {
      return null;
    }
    if (!campaign.isAbTest || campaign.variants.length === 1) {
      return campaign.variants[0];
    }

    // Persist assigned variant per campaign in sessionStorage
    const variantKey = `sklp_ab_${campaign._id}`;
    let assignedId = sessionStorage.getItem(variantKey);

    if (!assignedId) {
      const weightA = campaign.variants[0]?.weight ?? 50;
      const rand = Math.random() * 100;
      assignedId = rand < weightA ? 'A' : 'B';
      sessionStorage.setItem(variantKey, assignedId);
    }

    return campaign.variants.find(v => v.variantId === assignedId) || campaign.variants[0];
  }, []);

  // Tracking Dispatchers
  const trackImpression = useCallback((campaign, variantId = 'A') => {
    if (!campaign?._id) return;
    markFrequencyConsumed(campaign);
    campaignService.trackEvent(campaign._id, { eventType: 'impression', variantId }).catch(() => {});
  }, [markFrequencyConsumed]);

  const trackClick = useCallback((campaign, variantId = 'A') => {
    if (!campaign?._id) return;
    campaignService.trackEvent(campaign._id, { eventType: 'click', variantId }).catch(() => {});
  }, []);

  const trackAddToCart = useCallback((campaign, variantId = 'A') => {
    if (!campaign?._id) return;
    campaignService.trackEvent(campaign._id, { eventType: 'add_to_cart', variantId }).catch(() => {});
  }, []);

  const trackPurchase = useCallback((campaign, variantId = 'A', revenue = 0) => {
    if (!campaign?._id) return;
    campaignService.trackEvent(campaign._id, { eventType: 'purchase', variantId, revenue }).catch(() => {});
  }, []);

  return {
    campaigns,
    topCampaign: campaigns[0] || null,
    loading,
    refetch: fetchCampaigns,
    getAssignedVariant,
    trackImpression,
    trackClick,
    trackAddToCart,
    trackPurchase
  };
}

export default useMarketingCampaigns;
