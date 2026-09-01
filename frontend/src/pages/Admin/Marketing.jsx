import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FiTrendingUp, FiPlus, FiCalendar, FiBarChart2, FiFolder, FiActivity,
  FiAlertOctagon, FiCopy, FiEdit3, FiTrash2, FiPlay, FiPause,
  FiSearch, FiCheck, FiX, FiClock, FiZap
} from 'react-icons/fi';
import { adminMarketingService } from '@services/apiServices';

// ─── constants ────────────────────────────────────────────────────────────────
const BLANK_FORM = {
  title: '',
  description: '',
  type: 'announcement-bar',
  placement: 'homepage',
  customRoutePattern: '',
  targetCategories: [],
  audience: 'all',
  device: 'all',
  priority: 10,
  frequency: { type: 'always', value: 1 },
  schedule: {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  coupon: { enabled: false, couponCode: '', autoApply: false },
  limits: { maxClicks: '', maxOrders: '' },
  isAbTest: false,
  variants: [
    {
      variantId: 'A',
      name: 'Variant A (Default)',
      weight: 50,
      headline: '',
      subheadline: '',
      badgeText: 'SPECIAL OFFER',
      ctaText: 'Explore Now',
      ctaLink: '/products',
      ctaStyle: 'gold',
      image: { url: '' },
      backgroundColor: '#0e0e0e',
      textColor: '#FFFFFF'
    },
    {
      variantId: 'B',
      name: 'Variant B (Challenger)',
      weight: 50,
      headline: '',
      subheadline: '',
      badgeText: 'LIMITED TIME',
      ctaText: 'Shop Exclusive',
      ctaLink: '/products',
      ctaStyle: 'primary',
      image: { url: '' },
      backgroundColor: '#161616',
      textColor: '#FFFFFF'
    }
  ]
};

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
        </span>
      );
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <FiClock size={11} /> Scheduled
        </span>
      );
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <FiPause size={11} /> Paused
        </span>
      );
    case 'completed':
    case 'expired':
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/50 border border-white/10">Ended</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/60">Draft</span>;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Marketing() {
  // Tab state
  const [activeTab, setActiveTab] = useState('campaigns');

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, scheduled: 0, paused: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Emergency
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  // Builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [builderTab, setBuilderTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => ({ ...BLANK_FORM }));

  // Other tabs
  const [calendarData, setCalendarData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [auditLogs, setAuditLogs] = useState([]);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', folder: 'Banners', url: '', tags: '' });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminMarketingService.getCampaigns({
        search: search || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        type: filterType !== 'all' ? filterType : undefined
      });
      if (res.data?.success) {
        setCampaigns(res.data.campaigns || []);
        setStats(res.data.stats || { total: 0, active: 0, scheduled: 0, paused: 0, expired: 0 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterType]);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const res = await adminMarketingService.getCalendar();
      if (res.data?.success) setCalendarData(res.data.calendar);
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const res = await adminMarketingService.getFunnelAnalytics();
      if (res.data?.success) setFunnelData(res.data);
    } catch {
      toast.error('Failed to load funnel metrics');
    } finally {
      setFunnelLoading(false);
    }
  }, []);

  const loadAssets = useCallback(async (folder = 'All') => {
    setAssetsLoading(true);
    try {
      const res = await adminMarketingService.getAssets({ folder: folder !== 'All' ? folder : undefined });
      if (res.data?.success) setAssets(res.data.assets || []);
    } catch {
      toast.error('Failed to load asset library');
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await adminMarketingService.getAuditLogs({ limit: 50 });
      if (res.data?.success) setAuditLogs(res.data.logs || []);
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') loadCampaigns();
    else if (activeTab === 'calendar') loadCalendar();
    else if (activeTab === 'funnel') loadFunnel();
    else if (activeTab === 'assets') loadAssets(selectedFolder);
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, selectedFolder, loadCampaigns, loadCalendar, loadFunnel, loadAssets, loadAuditLogs]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleEmergencyStopAll = async () => {
    setEmergencyLoading(true);
    try {
      const res = await adminMarketingService.emergencyStopAll();
      toast.success(res.data?.message || 'All active promotions paused immediately');
      setEmergencyModalOpen(false);
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Emergency kill-switch failed');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await adminMarketingService.toggleStatus(campaign._id, newStatus);
      toast.success(`Campaign ${newStatus === 'active' ? 'published' : 'paused'}!`);
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleClone = async (id) => {
    try {
      await adminMarketingService.cloneCampaign(id);
      toast.success('Campaign cloned as draft!');
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clone failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this campaign?')) return;
    try {
      await adminMarketingService.deleteCampaign(id);
      toast.success('Campaign deleted');
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormData({ ...BLANK_FORM, schedule: { ...BLANK_FORM.schedule } });
    setBuilderTab('basic');
    setBuilderOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCampaign(c);
    setFormData({
      title: c.title || '',
      description: c.description || '',
      type: c.type || 'banner',
      placement: c.placement || 'homepage',
      customRoutePattern: c.customRoutePattern || '',
      targetCategories: c.targetCategories || [],
      audience: c.audience || 'all',
      device: c.device || 'all',
      priority: c.priority || 10,
      frequency: c.frequency || { type: 'always', value: 1 },
      schedule: {
        startDate: c.schedule?.startDate ? new Date(c.schedule.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: c.schedule?.endDate ? new Date(c.schedule.endDate).toISOString().split('T')[0] : ''
      },
      coupon: {
        enabled: c.coupon?.enabled || false,
        couponCode: c.coupon?.couponCode || '',
        autoApply: c.coupon?.autoApply || false
      },
      limits: {
        maxClicks: c.limits?.maxClicks || '',
        maxOrders: c.limits?.maxOrders || ''
      },
      isAbTest: Boolean(c.isAbTest),
      variants: c.variants?.length > 0 ? c.variants : BLANK_FORM.variants
    });
    setBuilderTab('basic');
    setBuilderOpen(true);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Please enter a campaign title');
    if (!formData.schedule.endDate) return toast.error('Please specify an end date');
    const payload = {
      ...formData,
      priority: Number(formData.priority) || 10,
      limits: {
        maxClicks: formData.limits.maxClicks ? Number(formData.limits.maxClicks) : null,
        maxOrders: formData.limits.maxOrders ? Number(formData.limits.maxOrders) : null
      }
    };
    setSaving(true);
    try {
      if (editingCampaign) {
        await adminMarketingService.updateCampaign(editingCampaign._id, payload);
        toast.success('Campaign updated!');
      } else {
        await adminMarketingService.createCampaign(payload);
        toast.success('Campaign created!');
      }
      setBuilderOpen(false);
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.url) return toast.error('Name and Image URL are required');
    try {
      await adminMarketingService.createAsset({
        name: newAsset.name,
        folder: newAsset.folder,
        image: { url: newAsset.url },
        tags: newAsset.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      toast.success('Asset added to library');
      setAssetModalOpen(false);
      setNewAsset({ name: '', folder: 'Banners', url: '', tags: '' });
      loadAssets(selectedFolder);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add asset');
    }
  };

  const updateVariant = (idx, field, value) => {
    const v = formData.variants.map((vr, i) => i === idx ? { ...vr, [field]: value } : vr);
    setFormData(f => ({ ...f, variants: v }));
  };

  const updateVariantImage = (idx, url) => {
    const v = formData.variants.map((vr, i) => i === idx ? { ...vr, image: { url } } : vr);
    setFormData(f => ({ ...f, variants: v }));
  };

  // ── Input class helper ────────────────────────────────────────────────────────
  const inp = 'w-full bg-luxury-black border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none focus:border-amber-400 text-xs placeholder:text-white/30 transition-colors';
  const lbl = 'block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1';

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: FiZap },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar },
    { id: 'funnel', label: 'Funnel & A/B', icon: FiBarChart2 },
    { id: 'assets', label: 'Assets', icon: FiFolder },
    { id: 'audit', label: 'Audit Log', icon: FiActivity }
  ];

  return (
    <div className="space-y-5 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-luxury-charcoal p-5 rounded-2xl border border-luxury-darkGray">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <FiTrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-white">Marketing & Campaigns</h1>
            <p className="text-[11px] text-luxury-mediumGray mt-0.5">Targeting • A/B Testing • Funnels • Announcements</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => setEmergencyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900/60 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
          >
            <FiAlertOctagon size={15} />
            <span>Stop All Promotions</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <FiPlus size={15} />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', border: 'border-luxury-darkGray' },
          { label: '🟢 Live', value: stats.active, color: 'text-green-400', border: 'border-green-500/20' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-400', border: 'border-blue-500/20' },
          { label: 'Paused', value: stats.paused, color: 'text-yellow-400', border: 'border-yellow-500/20' },
          { label: 'Ended', value: stats.expired, color: 'text-white/50', border: 'border-luxury-darkGray' }
        ].map(card => (
          <div key={card.label} className={`bg-luxury-charcoal p-4 rounded-2xl border ${card.border}`}>
            <p className={`text-[11px] font-semibold ${card.color} opacity-70`}>{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 border-b border-luxury-darkGray">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
                active
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-luxury-mediumGray hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 1: CAMPAIGNS */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-luxury-charcoal p-4 rounded-2xl border border-luxury-darkGray">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-mediumGray" size={14} />
              <input
                type="text"
                placeholder="Search campaigns, coupons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCampaigns()}
                className="w-full bg-luxury-black border border-luxury-darkGray pl-9 pr-4 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-amber-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-luxury-black border border-luxury-darkGray px-3 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Live</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
                <option value="draft">Draft</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-luxury-black border border-luxury-darkGray px-3 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="announcement-bar">Announcement Bar</option>
                <option value="banner">Banner</option>
                <option value="exit-intent">Exit Intent</option>
                <option value="popup">Popup</option>
                <option value="product-spotlight">Spotlight</option>
              </select>
              <button
                onClick={loadCampaigns}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
              >
                Search
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-luxury-charcoal rounded-2xl border border-luxury-darkGray overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead className="bg-luxury-black/60 text-luxury-mediumGray uppercase tracking-wider font-bold border-b border-luxury-darkGray">
                  <tr>
                    <th className="py-3.5 px-5">Campaign</th>
                    <th className="py-3.5 px-4">Placement</th>
                    <th className="py-3.5 px-4">Format</th>
                    <th className="py-3.5 px-4">Performance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury-darkGray/60">
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-luxury-mediumGray">Loading campaigns...</td></tr>
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <p className="text-luxury-mediumGray mb-3">No campaigns found.</p>
                        <button onClick={handleOpenCreate} className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all">
                          + Create First Campaign
                        </button>
                      </td>
                    </tr>
                  ) : campaigns.map(c => {
                    const m = c.metrics || {};
                    const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={c._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-bold text-white">{c.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-luxury-mediumGray">P: {c.priority}</span>
                            {c.isAbTest && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">A/B</span>}
                            {c.coupon?.enabled && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px]">{c.coupon.couponCode}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="capitalize font-semibold text-white/90">{c.placement}</p>
                          <p className="text-[10px] text-luxury-mediumGray capitalize">{c.audience} • {c.device}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-1 rounded-lg bg-white/5 text-white/80 capitalize text-[11px]">
                            {c.type?.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-semibold text-white">{m.impressions || 0} imp / {m.clicks || 0} clicks</p>
                          <p className="text-[10px] text-green-400 font-bold">{ctr}% CTR • ₹{(m.revenueGenerated || 0).toLocaleString()}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(c)}
                              title={c.status === 'active' ? 'Pause' : 'Publish'}
                              className={`p-2 rounded-xl border transition-all ${
                                c.status === 'active'
                                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                                  : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                              }`}
                            >
                              {c.status === 'active' ? <FiPause size={13} /> : <FiPlay size={13} />}
                            </button>
                            <button
                              onClick={() => handleClone(c._id)}
                              title="Clone Campaign"
                              className="p-2 rounded-xl border border-luxury-darkGray text-luxury-mediumGray hover:text-white hover:bg-white/10 transition-all"
                            >
                              <FiCopy size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(c)}
                              title="Edit Campaign"
                              className="p-2 rounded-xl border border-luxury-darkGray text-luxury-mediumGray hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            >
                              <FiEdit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              title="Delete Campaign"
                              className="p-2 rounded-xl border border-luxury-darkGray text-luxury-mediumGray hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 2: CALENDAR */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Live */}
          <div className="bg-luxury-charcoal p-5 rounded-2xl border border-green-500/30 space-y-3">
            <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              Live ({calendarData?.live?.length || 0})
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {calendarLoading ? (
                <p className="text-xs text-luxury-mediumGray">Loading...</p>
              ) : calendarData?.live?.length === 0 ? (
                <p className="text-xs text-luxury-mediumGray">No live promotions.</p>
              ) : calendarData?.live?.map(c => (
                <div key={c._id} className="p-3.5 rounded-xl bg-luxury-black border border-green-500/20">
                  <p className="font-bold text-white text-xs">{c.title}</p>
                  <p className="text-[11px] text-luxury-mediumGray mt-1">
                    Ends {new Date(c.schedule.endDate).toLocaleDateString()} • P{c.priority}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Scheduled */}
          <div className="bg-luxury-charcoal p-5 rounded-2xl border border-blue-500/30 space-y-3">
            <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
              <FiClock size={15} /> Scheduled ({calendarData?.scheduled?.length || 0})
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {calendarData?.scheduled?.length === 0 ? (
                <p className="text-xs text-luxury-mediumGray">No upcoming campaigns.</p>
              ) : calendarData?.scheduled?.map(c => (
                <div key={c._id} className="p-3.5 rounded-xl bg-luxury-black border border-blue-500/20">
                  <p className="font-bold text-white text-xs">{c.title}</p>
                  <p className="text-[11px] text-luxury-mediumGray mt-1">
                    Starts {new Date(c.schedule.startDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Ended / Paused */}
          <div className="bg-luxury-charcoal p-5 rounded-2xl border border-luxury-darkGray space-y-3">
            <h3 className="text-sm font-bold text-luxury-mediumGray flex items-center gap-2">
              <FiCheck size={15} /> Ended / Paused ({(calendarData?.expired?.length || 0) + (calendarData?.paused?.length || 0)})
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {[...(calendarData?.expired || []), ...(calendarData?.paused || [])].slice(0, 15).map(c => (
                <div key={c._id} className="p-3.5 rounded-xl bg-luxury-black/60 border border-luxury-darkGray/60">
                  <p className="font-bold text-white/70 text-xs">{c.title}</p>
                  <p className="text-[11px] text-luxury-mediumGray mt-1">
                    {new Date(c.schedule.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 3: FUNNEL & A/B ANALYTICS */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'funnel' && (
        funnelLoading ? (
          <div className="py-16 text-center text-luxury-mediumGray text-sm">Loading funnel data...</div>
        ) : !funnelData ? (
          <div className="py-16 text-center text-luxury-mediumGray text-sm">No funnel data available yet.</div>
        ) : (
          <div className="space-y-5">
            {/* Global funnel */}
            <div className="bg-luxury-charcoal p-6 rounded-2xl border border-luxury-darkGray space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-white">Full Conversion Funnel</h3>
                <p className="text-xs text-luxury-mediumGray">Store-wide campaign performance across all stages.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Impressions', count: funnelData.globalFunnel.impressions, bar: 'from-blue-500 to-indigo-600' },
                  { label: 'Clicks', count: funnelData.globalFunnel.clicks, bar: 'from-cyan-500 to-blue-600' },
                  { label: 'Prod. Views', count: funnelData.globalFunnel.productViews, bar: 'from-amber-500 to-yellow-600' },
                  { label: 'Add to Cart', count: funnelData.globalFunnel.addToCarts, bar: 'from-orange-500 to-amber-600' },
                  { label: 'Checkout', count: funnelData.globalFunnel.checkouts, bar: 'from-purple-500 to-pink-600' },
                  { label: 'Purchases', count: funnelData.globalFunnel.purchases, bar: 'from-green-500 to-emerald-600' }
                ].map((step, i) => (
                  <div key={i} className="p-4 rounded-xl bg-luxury-black border border-luxury-darkGray text-center relative overflow-hidden">
                    <div className={`h-1 w-full bg-gradient-to-r ${step.bar} absolute top-0 left-0`} />
                    <p className="text-[10px] text-luxury-mediumGray font-bold uppercase mt-1">{step.label}</p>
                    <p className="text-2xl font-bold text-white mt-1.5 font-mono">{step.count}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div>
                  <p className="text-[11px] font-bold text-amber-400">Overall CTR</p>
                  <p className="text-xl font-bold text-white">{funnelData.globalFunnel.overallCTR}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-amber-400">Conversion Rate</p>
                  <p className="text-xl font-bold text-white">{funnelData.globalFunnel.overallConversionRate}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-[11px] font-bold text-amber-400">Attributed Revenue</p>
                  <p className="text-xl font-bold text-amber-300 font-mono">₹{(funnelData.globalFunnel.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Per-campaign */}
            <div className="bg-luxury-charcoal p-5 rounded-2xl border border-luxury-darkGray space-y-4">
              <h3 className="text-base font-bold text-white">Per-Campaign Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="text-luxury-mediumGray font-bold border-b border-luxury-darkGray">
                    <tr>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-3 text-center">CTR</th>
                      <th className="py-3 px-3 text-center">Click→Cart</th>
                      <th className="py-3 px-3 text-center">Cart→Order</th>
                      <th className="py-3 px-3 text-center">Total CR</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-darkGray/60">
                    {funnelData.campaignFunnels.map(cf => (
                      <tr key={cf.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold text-white">{cf.title}</td>
                        <td className="py-3 px-3 text-center font-mono">{cf.rates.ctr}</td>
                        <td className="py-3 px-3 text-center font-mono">{cf.rates.clickToCart}</td>
                        <td className="py-3 px-3 text-center font-mono">{cf.rates.cartToPurchase}</td>
                        <td className="py-3 px-3 text-center font-mono text-green-400 font-bold">{cf.rates.overallConversion}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">₹{(cf.metrics.revenueGenerated || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 4: ASSET LIBRARY */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'assets' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 overflow-x-auto">
              {['All', 'Banners', 'Popups', 'Announcements', 'Seasonal', 'Coupons', 'General'].map(f => (
                <button
                  key={f}
                  onClick={() => { setSelectedFolder(f); loadAssets(f); }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                    selectedFolder === f ? 'bg-amber-500 text-black' : 'bg-luxury-charcoal text-luxury-mediumGray border border-luxury-darkGray hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAssetModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase hover:bg-amber-400 transition-all"
            >
              <FiPlus size={14} /> Add Asset
            </button>
          </div>

          {assetsLoading ? (
            <div className="py-12 text-center text-luxury-mediumGray text-sm">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center text-luxury-mediumGray text-sm">
              No assets in this folder.
              <button onClick={() => setAssetModalOpen(true)} className="mt-3 block mx-auto px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-xs border border-amber-500/30 hover:bg-amber-500/20">
                + Add your first asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {assets.map(asset => (
                <div key={asset._id} className="group relative bg-luxury-charcoal rounded-xl border border-luxury-darkGray overflow-hidden">
                  <div className="h-28 w-full bg-black overflow-hidden">
                    <img
                      src={asset.image?.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-white truncate">{asset.name}</p>
                    <p className="text-[10px] text-luxury-mediumGray">{asset.folder}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(asset.image?.url); toast.success('URL copied!'); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:text-amber-400 transition-all opacity-0 group-hover:opacity-100"
                    title="Copy URL"
                  >
                    <FiCopy size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 5: AUDIT LOG */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="bg-luxury-charcoal rounded-2xl border border-luxury-darkGray overflow-hidden">
          <div className="p-5 border-b border-luxury-darkGray flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Marketing Activity Stream</h3>
            <button onClick={loadAuditLogs} className="text-xs text-luxury-mediumGray hover:text-white transition-colors">
              ↻ Refresh
            </button>
          </div>
          <div className="divide-y divide-luxury-darkGray/60 max-h-[520px] overflow-y-auto">
            {auditLoading ? (
              <div className="py-12 text-center text-luxury-mediumGray text-sm">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-luxury-mediumGray text-sm">No actions recorded yet.</div>
            ) : auditLogs.map(log => (
              <div key={log._id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs font-bold text-white">{log.campaignTitle}</p>
                  </div>
                  <p className="text-[11px] text-luxury-mediumGray mt-1">
                    By {log.adminUser?.name || 'Admin'} • {log.adminUser?.email}
                  </p>
                </div>
                <span className="text-[11px] text-luxury-mediumGray whitespace-nowrap flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ MODAL: EMERGENCY STOP ════════ */}
      <AnimatePresence>
        {emergencyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEmergencyModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-luxury-charcoal border-2 border-red-500/50 rounded-2xl p-6 md:p-8 max-w-md w-full text-center space-y-4 z-10 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <FiAlertOctagon size={30} />
              </div>
              <h3 className="text-xl font-bold text-white">Stop All Active Promotions?</h3>
              <p className="text-xs text-luxury-mediumGray leading-relaxed">
                This will immediately pause <span className="font-bold text-white">ALL live and scheduled</span> campaigns, announcement bars, and exit-intent popups store-wide.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-luxury-darkGray text-sm font-bold text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmergencyStopAll}
                  disabled={emergencyLoading}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold uppercase tracking-wider"
                >
                  {emergencyLoading ? 'Stopping...' : 'Yes, Stop All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════ MODAL: CAMPAIGN BUILDER ════════ */}
      <AnimatePresence>
        {builderOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBuilderOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-luxury-charcoal border border-amber-500/30 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col z-10 shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-luxury-darkGray flex-shrink-0">
                <div>
                  <h3 className="text-base font-serif font-bold text-white">
                    {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                  </h3>
                  <p className="text-[11px] text-luxury-mediumGray">Fill the steps below to configure your campaign.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Step tabs */}
              <div className="flex border-b border-luxury-darkGray px-6 gap-0 bg-luxury-black/40 flex-shrink-0 overflow-x-auto">
                {[
                  { id: 'basic', label: '1 · Info' },
                  { id: 'targeting', label: '2 · Target' },
                  { id: 'content', label: '3 · Content' },
                  { id: 'rules', label: '4 · Rules' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBuilderTab(t.id)}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                      builderTab === t.id
                        ? 'border-amber-400 text-amber-400'
                        : 'border-transparent text-luxury-mediumGray hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Form body — scrollable */}
              <form onSubmit={handleSaveCampaign} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">

                  {/* ── STEP 1: BASIC INFO ── */}
                  {builderTab === 'basic' && (
                    <div className="space-y-4">
                      <div>
                        <label className={lbl}>Campaign Title *</label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Royal Festive Couture Sale"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={lbl}>Internal Notes</label>
                        <textarea
                          rows={2}
                          value={formData.description}
                          onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                          placeholder="Campaign objective, notes..."
                          className={inp + ' resize-none'}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lbl}>Format Type *</label>
                          <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} className={inp}>
                            <option value="announcement-bar">Announcement Bar</option>
                            <option value="banner">Dynamic Banner</option>
                            <option value="exit-intent">Exit Intent Popup</option>
                            <option value="popup">Standard Popup</option>
                            <option value="product-spotlight">Product Spotlight</option>
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Priority (1–100)</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={formData.priority}
                            onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))}
                            className={inp}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lbl}>Start Date</label>
                          <input
                            type="date"
                            value={formData.schedule.startDate}
                            onChange={e => setFormData(f => ({ ...f, schedule: { ...f.schedule, startDate: e.target.value } }))}
                            className={inp}
                          />
                        </div>
                        <div>
                          <label className={lbl}>End Date *</label>
                          <input
                            type="date"
                            required
                            value={formData.schedule.endDate}
                            onChange={e => setFormData(f => ({ ...f, schedule: { ...f.schedule, endDate: e.target.value } }))}
                            className={inp}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: TARGETING ── */}
                  {builderTab === 'targeting' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={lbl}>Placement</label>
                          <select value={formData.placement} onChange={e => setFormData(f => ({ ...f, placement: e.target.value }))} className={inp}>
                            <option value="homepage">Homepage</option>
                            <option value="category">Category Pages</option>
                            <option value="product">Product Pages</option>
                            <option value="cart">Cart Page</option>
                            <option value="checkout">Checkout</option>
                            <option value="seller">Seller Pages</option>
                            <option value="custom">Custom Route</option>
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Audience</label>
                          <select value={formData.audience} onChange={e => setFormData(f => ({ ...f, audience: e.target.value }))} className={inp}>
                            <option value="all">All Visitors</option>
                            <option value="guests">Guests Only</option>
                            <option value="logged-in">Logged-in Only</option>
                            <option value="new-customers">New Customers</option>
                            <option value="returning-customers">Returning</option>
                            <option value="cart-abandoners">Cart Abandoners</option>
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Device</label>
                          <select value={formData.device} onChange={e => setFormData(f => ({ ...f, device: e.target.value }))} className={inp}>
                            <option value="all">Both</option>
                            <option value="desktop">Desktop Only</option>
                            <option value="mobile">Mobile Only</option>
                          </select>
                        </div>
                      </div>

                      {formData.placement === 'custom' && (
                        <div>
                          <label className={lbl}>Custom Route Pattern</label>
                          <input
                            type="text"
                            value={formData.customRoutePattern}
                            onChange={e => setFormData(f => ({ ...f, customRoutePattern: e.target.value }))}
                            placeholder="/shop/festive/*"
                            className={inp}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lbl}>Frequency Control</label>
                          <select
                            value={formData.frequency.type}
                            onChange={e => setFormData(f => ({ ...f, frequency: { ...f.frequency, type: e.target.value } }))}
                            className={inp}
                          >
                            <option value="always">Always Show</option>
                            <option value="session">Once Per Session</option>
                            <option value="daily">Once Per Day</option>
                            <option value="pageviews">Every X Pageviews</option>
                          </select>
                        </div>
                        {formData.frequency.type === 'pageviews' && (
                          <div>
                            <label className={lbl}>Pageview Interval</label>
                            <input
                              type="number"
                              min={1}
                              value={formData.frequency.value}
                              onChange={e => setFormData(f => ({ ...f, frequency: { ...f.frequency, value: Number(e.target.value) } }))}
                              className={inp}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: CONTENT & A/B ── */}
                  {builderTab === 'content' && (
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-3.5 rounded-xl bg-luxury-black border border-luxury-darkGray cursor-pointer">
                        <div>
                          <p className="font-bold text-white">Enable A/B Testing</p>
                          <p className="text-[10px] text-luxury-mediumGray">Split 50/50 between Variant A and B.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.isAbTest}
                          onChange={e => setFormData(f => ({ ...f, isAbTest: e.target.checked }))}
                          className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                        />
                      </label>

                      {[0, ...(formData.isAbTest ? [1] : [])].map(idx => {
                        const v = formData.variants[idx] || {};
                        const isB = idx === 1;
                        return (
                          <div key={idx} className={`p-4 rounded-xl border space-y-3 ${isB ? 'border-purple-500/30 bg-purple-900/5' : 'border-amber-500/20 bg-amber-900/5'}`}>
                            <p className={`font-bold text-[11px] uppercase tracking-wider ${isB ? 'text-purple-400' : 'text-amber-400'}`}>
                              {isB ? 'Variant B (Challenger)' : 'Variant A (Primary)'}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={lbl}>Headline *</label>
                                <input
                                  type="text"
                                  required
                                  value={v.headline || ''}
                                  onChange={e => updateVariant(idx, 'headline', e.target.value)}
                                  placeholder="e.g. 30% OFF Sarees Today"
                                  className={inp}
                                />
                              </div>
                              <div>
                                <label className={lbl}>Badge Text</label>
                                <input
                                  type="text"
                                  value={v.badgeText || ''}
                                  onChange={e => updateVariant(idx, 'badgeText', e.target.value)}
                                  placeholder="e.g. EXCLUSIVE"
                                  className={inp}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={lbl}>CTA Button Text</label>
                                <input
                                  type="text"
                                  value={v.ctaText || ''}
                                  onChange={e => updateVariant(idx, 'ctaText', e.target.value)}
                                  className={inp}
                                />
                              </div>
                              <div>
                                <label className={lbl}>CTA Destination URL</label>
                                <input
                                  type="text"
                                  value={v.ctaLink || ''}
                                  onChange={e => updateVariant(idx, 'ctaLink', e.target.value)}
                                  className={inp}
                                />
                              </div>
                            </div>
                            <div>
                              <label className={lbl}>Background Image URL (Optional)</label>
                              <input
                                type="text"
                                value={v.image?.url || ''}
                                onChange={e => updateVariantImage(idx, e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                                className={inp}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── STEP 4: COUPON & LIMITS ── */}
                  {builderTab === 'rules' && (
                    <div className="space-y-4">
                      {/* Coupon */}
                      <div className="p-4 rounded-xl bg-luxury-black border border-luxury-darkGray space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-bold text-white">Attach Discount Coupon</p>
                            <p className="text-[10px] text-luxury-mediumGray">Display a copyable promo code with the campaign.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={formData.coupon.enabled}
                            onChange={e => setFormData(f => ({ ...f, coupon: { ...f.coupon, enabled: e.target.checked } }))}
                            className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                          />
                        </label>
                        {formData.coupon.enabled && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className={lbl}>Coupon Code</label>
                              <input
                                type="text"
                                value={formData.coupon.couponCode}
                                onChange={e => setFormData(f => ({ ...f, coupon: { ...f.coupon, couponCode: e.target.value.toUpperCase() } }))}
                                placeholder="e.g. LUXE30"
                                className={inp + ' font-mono font-bold text-amber-400'}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                              <input
                                type="checkbox"
                                id="auto-apply"
                                checked={formData.coupon.autoApply}
                                onChange={e => setFormData(f => ({ ...f, coupon: { ...f.coupon, autoApply: e.target.checked } }))}
                                className="w-4 h-4 rounded accent-amber-500"
                              />
                              <label htmlFor="auto-apply" className="text-white cursor-pointer">Auto-apply in cart</label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Limits */}
                      <div className="p-4 rounded-xl bg-luxury-black border border-luxury-darkGray space-y-3">
                        <p className="font-bold text-white text-[11px] uppercase tracking-wider">Auto-Pause Safety Limits</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={lbl}>Max Clicks</label>
                            <input
                              type="number"
                              value={formData.limits.maxClicks}
                              onChange={e => setFormData(f => ({ ...f, limits: { ...f.limits, maxClicks: e.target.value } }))}
                              placeholder="Unlimited"
                              className={inp}
                            />
                          </div>
                          <div>
                            <label className={lbl}>Max Orders</label>
                            <input
                              type="number"
                              value={formData.limits.maxOrders}
                              onChange={e => setFormData(f => ({ ...f, limits: { ...f.limits, maxOrders: e.target.value } }))}
                              placeholder="Unlimited"
                              className={inp}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-luxury-darkGray flex-shrink-0 bg-luxury-charcoal">
                  <div className="flex gap-2">
                    {['basic', 'targeting', 'content', 'rules'].map((t) => (
                      <div
                        key={t}
                        className={`w-2 h-2 rounded-full transition-all ${builderTab === t ? 'bg-amber-500 w-5' : 'bg-luxury-darkGray'}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBuilderOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-luxury-darkGray text-xs font-bold text-white/80 hover:text-white hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      {saving ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════ MODAL: ADD ASSET ════════ */}
      <AnimatePresence>
        {assetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAssetModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-luxury-charcoal border border-luxury-darkGray rounded-2xl p-6 max-w-md w-full z-10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white">Add Promotional Asset</h3>
                <button type="button" onClick={() => setAssetModalOpen(false)} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10">
                  <FiX size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
                <div>
                  <label className={lbl}>Asset Name *</label>
                  <input
                    type="text" required value={newAsset.name}
                    onChange={e => setNewAsset(a => ({ ...a, name: e.target.value }))}
                    placeholder="e.g. Banarasi Festive Banner" className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Folder</label>
                  <select value={newAsset.folder} onChange={e => setNewAsset(a => ({ ...a, folder: e.target.value }))} className={inp}>
                    {['Banners', 'Popups', 'Announcements', 'Seasonal', 'Coupons', 'General'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Image URL *</label>
                  <input
                    type="url" required value={newAsset.url}
                    onChange={e => setNewAsset(a => ({ ...a, url: e.target.value }))}
                    placeholder="https://images.unsplash.com/..." className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Tags (comma separated)</label>
                  <input
                    type="text" value={newAsset.tags}
                    onChange={e => setNewAsset(a => ({ ...a, tags: e.target.value }))}
                    placeholder="festive, gold, silk" className={inp}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAssetModalOpen(false)} className="px-4 py-2 rounded-xl text-white/70 hover:text-white text-xs">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all">Save Asset</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
