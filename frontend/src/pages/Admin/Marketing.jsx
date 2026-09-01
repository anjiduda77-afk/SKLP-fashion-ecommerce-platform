import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FiTrendingUp, FiPlus, FiCalendar, FiBarChart2, FiFolder, FiActivity,
  FiAlertOctagon, FiCopy, FiEdit3, FiTrash2, FiPlay, FiPause, FiEye,
  FiSearch, FiFilter, FiCheck, FiX, FiClock, FiTarget, FiSmartphone,
  FiMonitor, FiUsers, FiTag, FiRefreshCw, FiZap, FiSliders, FiImage
} from 'react-icons/fi';
import { adminMarketingService, adminService } from '@services/apiServices';
import AdminLayout from '@components/Admin/AdminLayout';

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'calendar' | 'funnel' | 'assets' | 'audit'
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, scheduled: 0, paused: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Emergency Modal State
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  // Campaign Builder / Editor Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [builderTab, setBuilderTab] = useState('basic'); // 'basic' | 'targeting' | 'content' | 'rules'
  const [saving, setSaving] = useState(false);

  // Form State
  const initialForm = {
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
  const [formData, setFormData] = useState(initialForm);

  // Calendar, Funnel, Asset, and Audit state
  const [calendarData, setCalendarData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [auditLogs, setAuditLogs] = useState([]);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', folder: 'Banners', url: '', tags: '' });

  // Load Campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
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

  // Load Calendar
  const loadCalendar = async () => {
    try {
      const res = await adminMarketingService.getCalendar();
      if (res.data?.success) setCalendarData(res.data.calendar);
    } catch (err) {
      toast.error('Failed to load calendar data');
    }
  };

  // Load Funnel Analytics
  const loadFunnel = async () => {
    try {
      const res = await adminMarketingService.getFunnelAnalytics();
      if (res.data?.success) setFunnelData(res.data);
    } catch (err) {
      toast.error('Failed to load funnel metrics');
    }
  };

  // Load Assets
  const loadAssets = async (folder = 'All') => {
    try {
      const res = await adminMarketingService.getAssets({ folder: folder !== 'All' ? folder : undefined });
      if (res.data?.success) setAssets(res.data.assets || []);
    } catch (err) {
      toast.error('Failed to load asset library');
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    try {
      const res = await adminMarketingService.getAuditLogs({ limit: 50 });
      if (res.data?.success) setAuditLogs(res.data.logs || []);
    } catch (err) {
      toast.error('Failed to load audit trail');
    }
  };

  useEffect(() => {
    if (activeTab === 'campaigns') loadCampaigns();
    else if (activeTab === 'calendar') loadCalendar();
    else if (activeTab === 'funnel') loadFunnel();
    else if (activeTab === 'assets') loadAssets(selectedFolder);
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, loadCampaigns, selectedFolder]);

  // Handle Emergency Stop All
  const handleEmergencyStopAll = async () => {
    try {
      setEmergencyLoading(true);
      const res = await adminMarketingService.emergencyStopAll();
      toast.success(res.data?.message || 'All active promotions stopped immediately');
      setEmergencyModalOpen(false);
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Emergency kill-switch failed');
    } finally {
      setEmergencyLoading(false);
    }
  };

  // Status Toggle
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

  // Clone Campaign
  const handleClone = async (id) => {
    try {
      await adminMarketingService.cloneCampaign(id);
      toast.success('Campaign cloned successfully as draft!');
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clone failed');
    }
  };

  // Delete Campaign
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this campaign?')) return;
    try {
      await adminMarketingService.deleteCampaign(id);
      toast.success('Campaign deleted');
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Open Builder for Create
  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormData(initialForm);
    setBuilderTab('basic');
    setBuilderOpen(true);
  };

  // Open Builder for Edit
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
      variants: c.variants && c.variants.length > 0 ? c.variants : initialForm.variants
    });
    setBuilderTab('basic');
    setBuilderOpen(true);
  };

  // Save Campaign
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

    try {
      setSaving(true);
      if (editingCampaign) {
        await adminMarketingService.updateCampaign(editingCampaign._id, payload);
        toast.success('Campaign updated successfully!');
      } else {
        await adminMarketingService.createCampaign(payload);
        toast.success('Campaign created successfully!');
      }
      setBuilderOpen(false);
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // Create Asset
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live</span>;
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><FiClock size={11} /> Scheduled</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1"><FiPause size={11} /> Paused</span>;
      case 'completed':
      case 'expired':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/50 border border-white/10">Ended</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/60">Draft</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        
        {/* Top Header & Emergency Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-luxury-charcoal p-6 rounded-3xl border border-luxury-darkGray">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <FiTrendingUp size={22} />
              </div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Marketing & Campaigns
              </h1>
            </div>
            <p className="text-xs text-luxury-mediumGray mt-1">
              Automated targeting, A/B testing, exit-intent promotions, scheduled announcements & conversion funnels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setEmergencyModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900/60 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-950/30"
            >
              <FiAlertOctagon size={16} />
              <span>Stop All Active Promotions</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <FiPlus size={16} />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/* Dashboard Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-luxury-charcoal p-4 rounded-2xl border border-luxury-darkGray">
            <p className="text-xs text-luxury-mediumGray font-semibold">Total Campaigns</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-luxury-charcoal p-4 rounded-2xl border border-green-500/20 bg-green-500/5">
            <p className="text-xs text-green-400 font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Now</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.active}</p>
          </div>
          <div className="bg-luxury-charcoal p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
            <p className="text-xs text-blue-400 font-semibold">Scheduled</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.scheduled}</p>
          </div>
          <div className="bg-luxury-charcoal p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-xs text-yellow-400 font-semibold">Paused</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.paused}</p>
          </div>
          <div className="bg-luxury-charcoal p-4 rounded-2xl border border-luxury-darkGray col-span-2 sm:col-span-1">
            <p className="text-xs text-luxury-mediumGray font-semibold">Completed / Expired</p>
            <p className="text-2xl font-bold text-white/60 mt-1">{stats.expired}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-luxury-darkGray gap-2 overflow-x-auto pb-1">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: FiZap },
            { id: 'calendar', label: 'Calendar Timeline', icon: FiCalendar },
            { id: 'funnel', label: 'Funnel & A/B Analytics', icon: FiBarChart2 },
            { id: 'assets', label: 'Asset Library', icon: FiFolder },
            { id: 'audit', label: 'Audit Log', icon: FiActivity }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-luxury-mediumGray hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CAMPAIGNS LIST */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-luxury-charcoal p-4 rounded-2xl border border-luxury-darkGray">
              <div className="relative w-full md:w-80">
                <FiSearch className="absolute left-3.5 top-3.5 text-luxury-mediumGray" />
                <input
                  type="text"
                  placeholder="Search campaigns, coupons..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-luxury-black border border-luxury-darkGray pl-10 pr-4 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-amber-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-luxury-black border border-luxury-darkGray px-3 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active (Live)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired / Completed</option>
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
                  <option value="exit-intent">Exit Intent Popup</option>
                  <option value="popup">Standard Popup</option>
                  <option value="product-spotlight">Product Spotlight</option>
                </select>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="bg-luxury-charcoal rounded-3xl border border-luxury-darkGray overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-luxury-black/60 text-luxury-mediumGray uppercase tracking-wider font-bold border-b border-luxury-darkGray">
                    <tr>
                      <th className="py-4 px-6">Campaign</th>
                      <th className="py-4 px-4">Placement & Target</th>
                      <th className="py-4 px-4">Format</th>
                      <th className="py-4 px-4">Performance</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-darkGray/60">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-luxury-mediumGray">
                          Loading campaigns...
                        </td>
                      </tr>
                    ) : campaigns.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-luxury-mediumGray">
                          No campaigns found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map(c => {
                        const m = c.metrics || {};
                        const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={c._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-bold text-white text-sm">{c.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-luxury-mediumGray">
                                  <span>Priority: {c.priority}</span>
                                  {c.isAbTest && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">A/B Test</span>
                                  )}
                                  {c.coupon?.enabled && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">{c.coupon.couponCode}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="space-y-0.5">
                                <p className="capitalize font-semibold text-white/90">{c.placement}</p>
                                <p className="text-[11px] text-luxury-mediumGray capitalize">{c.audience} • {c.device}</p>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="px-2 py-1 rounded-lg bg-white/5 text-white/80 font-medium capitalize">
                                {c.type.replace('-', ' ')}
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <div className="space-y-0.5">
                                <p className="text-white font-mono font-semibold">{m.impressions || 0} imp / {m.clicks || 0} clicks</p>
                                <p className="text-[11px] text-green-400 font-bold">{ctr}% CTR • ₹{m.revenueGenerated || 0}</p>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {getStatusBadge(c.status)}
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleStatus(c)}
                                  title={c.status === 'active' ? 'Pause Campaign' : 'Publish Campaign'}
                                  className={`p-2 rounded-xl border transition-all ${
                                    c.status === 'active'
                                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                                      : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                                  }`}
                                >
                                  {c.status === 'active' ? <FiPause size={14} /> : <FiPlay size={14} />}
                                </button>

                                <button
                                  onClick={() => handleClone(c._id)}
                                  title="1-Click Clone"
                                  className="p-2 rounded-xl border border-luxury-darkGray text-luxury-mediumGray hover:text-white hover:bg-white/10 transition-all"
                                >
                                  <FiCopy size={14} />
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(c)}
                                  title="Edit Campaign"
                                  className="p-2 rounded-xl border border-luxury-darkGray text-luxury-mediumGray hover:text-amber-400 hover:bg-white/10 transition-all"
                                >
                                  <FiEdit3 size={14} />
                                </button>

                                <button
                                  onClick={() => handleDelete(c._id)}
                                  title="Delete Campaign"
                                  className="p-2 rounded-xl border border-luxury-darkGray text-luxury-mediumGray hover:text-red-400 hover:bg-white/10 transition-all"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CALENDAR TIMELINE */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Live Now */}
              <div className="bg-luxury-charcoal p-5 rounded-3xl border border-green-500/30 space-y-3">
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  Live Promotions ({calendarData?.live?.length || 0})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {calendarData?.live?.map(c => (
                    <div key={c._id} className="p-3.5 rounded-2xl bg-luxury-black border border-green-500/20">
                      <p className="font-bold text-white text-xs">{c.title}</p>
                      <p className="text-[11px] text-luxury-mediumGray mt-1">
                        Ends: {new Date(c.schedule.endDate).toLocaleDateString()} • Priority {c.priority}
                      </p>
                    </div>
                  ))}
                  {(!calendarData?.live || calendarData.live.length === 0) && (
                    <p className="text-xs text-luxury-mediumGray">No active live promotions.</p>
                  )}
                </div>
              </div>

              {/* Scheduled / Starting Soon */}
              <div className="bg-luxury-charcoal p-5 rounded-3xl border border-blue-500/30 space-y-3">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <FiClock size={16} />
                  Scheduled ({calendarData?.scheduled?.length || 0})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {calendarData?.scheduled?.map(c => (
                    <div key={c._id} className="p-3.5 rounded-2xl bg-luxury-black border border-blue-500/20">
                      <p className="font-bold text-white text-xs">{c.title}</p>
                      <p className="text-[11px] text-luxury-mediumGray mt-1">
                        Starts: {new Date(c.schedule.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {(!calendarData?.scheduled || calendarData.scheduled.length === 0) && (
                    <p className="text-xs text-luxury-mediumGray">No upcoming scheduled promotions.</p>
                  )}
                </div>
              </div>

              {/* Expired / Ended */}
              <div className="bg-luxury-charcoal p-5 rounded-3xl border border-luxury-darkGray space-y-3">
                <h3 className="text-sm font-bold text-luxury-mediumGray uppercase tracking-wider flex items-center gap-2">
                  <FiCheck size={16} />
                  Past & Expired ({calendarData?.expired?.length || 0})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {calendarData?.expired?.slice(0, 10).map(c => (
                    <div key={c._id} className="p-3.5 rounded-2xl bg-luxury-black/60 border border-luxury-darkGray/60">
                      <p className="font-bold text-white/70 text-xs">{c.title}</p>
                      <p className="text-[11px] text-luxury-mediumGray mt-1">
                        Ended: {new Date(c.schedule.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FUNNEL & A/B ANALYTICS */}
        {activeTab === 'funnel' && funnelData && (
          <div className="space-y-6">
            {/* Global Conversion Funnel */}
            <div className="bg-luxury-charcoal p-6 rounded-3xl border border-luxury-darkGray space-y-6">
              <div>
                <h3 className="text-lg font-serif font-bold text-white">Full Conversion Funnel</h3>
                <p className="text-xs text-luxury-mediumGray">End-to-end customer journey tracking from promotional impression to revenue purchase.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { label: '1. Impressions', count: funnelData.globalFunnel.impressions, color: 'from-blue-500 to-indigo-600' },
                  { label: '2. Clicks', count: funnelData.globalFunnel.clicks, color: 'from-cyan-500 to-blue-600' },
                  { label: '3. Product Views', count: funnelData.globalFunnel.productViews, color: 'from-amber-500 to-yellow-600' },
                  { label: '4. Add to Cart', count: funnelData.globalFunnel.addToCarts, color: 'from-orange-500 to-amber-600' },
                  { label: '5. Checkout', count: funnelData.globalFunnel.checkouts, color: 'from-purple-500 to-pink-600' },
                  { label: '6. Purchases', count: funnelData.globalFunnel.purchases, color: 'from-green-500 to-emerald-600' }
                ].map((step, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-luxury-black border border-luxury-darkGray text-center relative overflow-hidden">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${step.color} absolute top-0 left-0`} />
                    <p className="text-[11px] text-luxury-mediumGray font-bold uppercase">{step.label}</p>
                    <p className="text-2xl font-bold text-white mt-2 font-mono">{step.count}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 gap-4">
                <div>
                  <p className="text-xs font-bold text-amber-400">Store-wide Promotional Conversion Rate</p>
                  <p className="text-xl font-bold text-white mt-0.5">{funnelData.globalFunnel.overallConversionRate}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400">Total Attributed Revenue</p>
                  <p className="text-xl font-bold text-amber-300 mt-0.5 font-mono">₹{funnelData.globalFunnel.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Per-Campaign Funnel Breakdown */}
            <div className="bg-luxury-charcoal p-6 rounded-3xl border border-luxury-darkGray space-y-4">
              <h3 className="text-base font-bold text-white">Campaign Conversion Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-luxury-mediumGray font-bold border-b border-luxury-darkGray">
                    <tr>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-3 text-center">CTR</th>
                      <th className="py-3 px-3 text-center">Click → Cart</th>
                      <th className="py-3 px-3 text-center">Cart → Order</th>
                      <th className="py-3 px-3 text-center">Overall CR</th>
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
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">₹{cf.metrics.revenueGenerated || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ASSET LIBRARY */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto">
                {['All', 'Banners', 'Popups', 'Announcements', 'Seasonal', 'Coupons', 'General'].map(folder => (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedFolder === folder
                        ? 'bg-amber-500 text-black'
                        : 'bg-luxury-charcoal text-luxury-mediumGray hover:text-white'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAssetModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-400"
              >
                <FiPlus size={14} /> Add Asset
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {assets.map(asset => (
                <div key={asset._id} className="group relative bg-luxury-charcoal rounded-2xl border border-luxury-darkGray overflow-hidden">
                  <div className="h-32 w-full bg-black overflow-hidden">
                    <img src={asset.image?.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-white truncate">{asset.name}</p>
                    <p className="text-[10px] text-luxury-mediumGray">{asset.folder}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(asset.image?.url);
                      toast.success('Image URL copied to clipboard!');
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:text-amber-400 transition-all opacity-0 group-hover:opacity-100"
                    title="Copy Image URL"
                  >
                    <FiCopy size={13} />
                  </button>
                </div>
              ))}
              {assets.length === 0 && (
                <div className="col-span-full py-12 text-center text-luxury-mediumGray text-xs">
                  No assets found in this folder. Click "Add Asset" to upload or link promotional graphics.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="bg-luxury-charcoal p-6 rounded-3xl border border-luxury-darkGray space-y-4">
            <h3 className="text-base font-bold text-white">Marketing Activity Stream</h3>
            <div className="divide-y divide-luxury-darkGray/60 max-h-[600px] overflow-y-auto">
              {auditLogs.map(log => (
                <div key={log._id} className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-amber-400">
                        {log.action}
                      </span>
                      <p className="text-xs font-bold text-white">{log.campaignTitle}</p>
                    </div>
                    <p className="text-[11px] text-luxury-mediumGray mt-1">
                      By {log.adminUser?.name || 'Admin'} ({log.adminUser?.email}) • IP: {log.ipAddress}
                    </p>
                  </div>
                  <span className="text-[11px] text-luxury-mediumGray whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-xs text-luxury-mediumGray py-8 text-center">No audit logs recorded yet.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ─── MODAL: EMERGENCY KILLSWITCH CONFIRMATION ──────────────────────── */}
      <AnimatePresence>
        {emergencyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEmergencyModalOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-luxury-charcoal border-2 border-red-500/50 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 z-10 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <FiAlertOctagon size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Emergency Stop All Promotions?</h3>
              <p className="text-xs text-luxury-mediumGray leading-relaxed">
                This will immediately pause <span className="font-bold text-white">ALL currently live and scheduled marketing campaigns, announcement bars, and exit-intent popups</span> across the entire store.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-luxury-darkGray text-xs font-bold text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmergencyStopAll}
                  disabled={emergencyLoading}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30"
                >
                  {emergencyLoading ? 'Stopping...' : 'Yes, Stop All Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CAMPAIGN BUILDER / EDITOR ──────────────────────────────── */}
      <AnimatePresence>
        {builderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBuilderOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-luxury-charcoal border border-amber-500/30 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col z-10 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-luxury-darkGray">
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">
                    {editingCampaign ? 'Edit Marketing Campaign' : 'Create New Marketing Campaign'}
                  </h3>
                  <p className="text-xs text-luxury-mediumGray">Configure targeting, scheduling, A/B variants, and frequency limits.</p>
                </div>
                <button onClick={() => setBuilderOpen(false)} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10">
                  <FiX size={18} />
                </button>
              </div>

              {/* Sub-Tabs */}
              <div className="flex border-b border-luxury-darkGray px-6 gap-2 bg-luxury-black/40">
                {[
                  { id: 'basic', label: '1. Basic Info' },
                  { id: 'targeting', label: '2. Targeting & Rules' },
                  { id: 'content', label: '3. Content & A/B' },
                  { id: 'rules', label: '4. Coupon & Limits' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setBuilderTab(t.id)}
                    className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                      builderTab === t.id
                        ? 'border-amber-400 text-amber-400'
                        : 'border-transparent text-luxury-mediumGray hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveCampaign} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {/* SUBTAB 1: BASIC INFO */}
                {builderTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Campaign Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Royal Festive Couture Special"
                        className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Description / Notes</label>
                      <textarea
                        rows="2"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Internal campaign objective and notes..."
                        className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Format Type *</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        >
                          <option value="announcement-bar">Announcement Bar (Top Header)</option>
                          <option value="banner">Dynamic Banner</option>
                          <option value="exit-intent">Exit Intent Modal Popup</option>
                          <option value="popup">Standard On-Load Popup</option>
                          <option value="product-spotlight">Product Spotlight</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Priority (1 - 100)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={formData.schedule.startDate}
                          onChange={(e) => setFormData({ ...formData, schedule: { ...formData.schedule, startDate: e.target.value } })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">End Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.schedule.endDate}
                          onChange={(e) => setFormData({ ...formData, schedule: { ...formData.schedule, endDate: e.target.value } })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: TARGETING & RULES */}
                {builderTab === 'targeting' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Placement</label>
                        <select
                          value={formData.placement}
                          onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        >
                          <option value="homepage">Homepage</option>
                          <option value="category">Category Pages</option>
                          <option value="product">Product Detail Pages</option>
                          <option value="cart">Cart Page</option>
                          <option value="checkout">Checkout Page</option>
                          <option value="seller">Seller Pages</option>
                          <option value="custom">Custom Route</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Audience</label>
                        <select
                          value={formData.audience}
                          onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        >
                          <option value="all">All Visitors</option>
                          <option value="guests">Guests Only</option>
                          <option value="logged-in">Logged-in Users Only</option>
                          <option value="new-customers">New Customers (0 Orders)</option>
                          <option value="returning-customers">Returning Customers</option>
                          <option value="cart-abandoners">Cart Abandoners (Items in Cart)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Device</label>
                        <select
                          value={formData.device}
                          onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        >
                          <option value="all">Both Desktop & Mobile</option>
                          <option value="desktop">Desktop Only</option>
                          <option value="mobile">Mobile Only</option>
                        </select>
                      </div>
                    </div>

                    {formData.placement === 'custom' && (
                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Custom Route Pattern</label>
                        <input
                          type="text"
                          value={formData.customRoutePattern}
                          onChange={(e) => setFormData({ ...formData, customRoutePattern: e.target.value })}
                          placeholder="e.g. /shop/festive-collection/*"
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Frequency Control</label>
                        <select
                          value={formData.frequency.type}
                          onChange={(e) => setFormData({ ...formData, frequency: { ...formData.frequency, type: e.target.value } })}
                          className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                        >
                          <option value="always">Always Show</option>
                          <option value="session">Once Per Session</option>
                          <option value="daily">Once Per Day</option>
                          <option value="pageviews">Every X Page Views</option>
                        </select>
                      </div>

                      {formData.frequency.type === 'pageviews' && (
                        <div>
                          <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Page View Interval</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.frequency.value}
                            onChange={(e) => setFormData({ ...formData, frequency: { ...formData.frequency, value: Number(e.target.value) } })}
                            className="w-full bg-luxury-black border border-luxury-darkGray p-3 rounded-xl text-white outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: CONTENT & A/B TESTING */}
                {builderTab === 'content' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-luxury-black border border-luxury-darkGray">
                      <div>
                        <p className="font-bold text-white">Enable A/B Testing</p>
                        <p className="text-[11px] text-luxury-mediumGray">Split audience 50/50 between Variant A and Variant B to measure conversion performance.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.isAbTest}
                        onChange={(e) => setFormData({ ...formData, isAbTest: e.target.checked })}
                        className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Variant A */}
                    <div className="p-4 rounded-2xl bg-luxury-black border border-amber-500/20 space-y-3">
                      <p className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Variant A (Primary)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Headline *</label>
                          <input
                            type="text"
                            required
                            value={formData.variants[0].headline}
                            onChange={(e) => {
                              const v = [...formData.variants];
                              v[0].headline = e.target.value;
                              setFormData({ ...formData, variants: v });
                            }}
                            placeholder="e.g. 30% OFF Handcrafted Sarees"
                            className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Badge Text</label>
                          <input
                            type="text"
                            value={formData.variants[0].badgeText}
                            onChange={(e) => {
                              const v = [...formData.variants];
                              v[0].badgeText = e.target.value;
                              setFormData({ ...formData, variants: v });
                            }}
                            placeholder="e.g. ROYAL SPECIAL"
                            className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">CTA Text</label>
                          <input
                            type="text"
                            value={formData.variants[0].ctaText}
                            onChange={(e) => {
                              const v = [...formData.variants];
                              v[0].ctaText = e.target.value;
                              setFormData({ ...formData, variants: v });
                            }}
                            className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">CTA Destination URL</label>
                          <input
                            type="text"
                            value={formData.variants[0].ctaLink}
                            onChange={(e) => {
                              const v = [...formData.variants];
                              v[0].ctaLink = e.target.value;
                              setFormData({ ...formData, variants: v });
                            }}
                            className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Image URL (Optional)</label>
                        <input
                          type="text"
                          value={formData.variants[0].image?.url || ''}
                          onChange={(e) => {
                            const v = [...formData.variants];
                            v[0].image = { url: e.target.value };
                            setFormData({ ...formData, variants: v });
                          }}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Variant B (if A/B Test enabled) */}
                    {formData.isAbTest && (
                      <div className="p-4 rounded-2xl bg-luxury-black border border-purple-500/30 space-y-3">
                        <p className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">Variant B (Challenger)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Headline *</label>
                            <input
                              type="text"
                              value={formData.variants[1].headline}
                              onChange={(e) => {
                                const v = [...formData.variants];
                                v[1].headline = e.target.value;
                                setFormData({ ...formData, variants: v });
                              }}
                              placeholder="e.g. Exclusive Festive Savings: Flat 30%"
                              className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Badge Text</label>
                            <input
                              type="text"
                              value={formData.variants[1].badgeText}
                              onChange={(e) => {
                                const v = [...formData.variants];
                                v[1].badgeText = e.target.value;
                                setFormData({ ...formData, variants: v });
                              }}
                              className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">CTA Text</label>
                            <input
                              type="text"
                              value={formData.variants[1].ctaText}
                              onChange={(e) => {
                                const v = [...formData.variants];
                                v[1].ctaText = e.target.value;
                                setFormData({ ...formData, variants: v });
                              }}
                              className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">CTA Destination URL</label>
                            <input
                              type="text"
                              value={formData.variants[1].ctaLink}
                              onChange={(e) => {
                                const v = [...formData.variants];
                                v[1].ctaLink = e.target.value;
                                setFormData({ ...formData, variants: v });
                              }}
                              className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTAB 4: COUPON & LIMITS */}
                {builderTab === 'rules' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-luxury-black border border-luxury-darkGray space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">Attach Discount Coupon</p>
                          <p className="text-[11px] text-luxury-mediumGray">Auto-display copyable promo code with 1-click apply.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.coupon.enabled}
                          onChange={(e) => setFormData({ ...formData, coupon: { ...formData.coupon, enabled: e.target.checked } })}
                          className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {formData.coupon.enabled && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Coupon Code</label>
                            <input
                              type="text"
                              value={formData.coupon.couponCode}
                              onChange={(e) => setFormData({ ...formData, coupon: { ...formData.coupon, couponCode: e.target.value.toUpperCase() } })}
                              placeholder="e.g. LUXE30"
                              className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-amber-400 font-mono font-bold outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              checked={formData.coupon.autoApply}
                              onChange={(e) => setFormData({ ...formData, coupon: { ...formData.coupon, autoApply: e.target.checked } })}
                              className="w-4 h-4 rounded accent-amber-500"
                            />
                            <span className="text-white">Auto-apply in cart & checkout</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-luxury-black border border-luxury-darkGray space-y-3">
                      <p className="font-bold text-white uppercase tracking-wider text-[11px]">Safety Limits (Auto-Pause Thresholds)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Max Clicks Limit</label>
                          <input
                            type="number"
                            value={formData.limits.maxClicks}
                            onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxClicks: e.target.value } })}
                            placeholder="Leave blank for unlimited"
                            className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-luxury-mediumGray text-[10px] uppercase font-bold mb-1">Max Orders Limit</label>
                          <input
                            type="number"
                            value={formData.limits.maxOrders}
                            onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxOrders: e.target.value } })}
                            placeholder="Leave blank for unlimited"
                            className="w-full bg-luxury-charcoal border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-luxury-darkGray">
                  <button
                    type="button"
                    onClick={() => setBuilderOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-luxury-darkGray text-white/80 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold uppercase tracking-wider hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                  >
                    {saving ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: ADD ASSET ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {assetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssetModalOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-luxury-charcoal border border-luxury-darkGray rounded-3xl p-6 max-w-md w-full z-10 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Add Promotional Asset</h3>
              <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
                <div>
                  <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder="e.g. Banarasi Festive Banner"
                    className="w-full bg-luxury-black border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Folder</label>
                  <select
                    value={newAsset.folder}
                    onChange={(e) => setNewAsset({ ...newAsset, folder: e.target.value })}
                    className="w-full bg-luxury-black border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                  >
                    <option value="Banners">Banners</option>
                    <option value="Popups">Popups</option>
                    <option value="Announcements">Announcements</option>
                    <option value="Seasonal">Seasonal</option>
                    <option value="Coupons">Coupons</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Image URL *</label>
                  <input
                    type="url"
                    required
                    value={newAsset.url}
                    onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-luxury-black border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-luxury-mediumGray font-bold uppercase mb-1">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={newAsset.tags}
                    onChange={(e) => setNewAsset({ ...newAsset, tags: e.target.value })}
                    placeholder="festive, gold, silk"
                    className="w-full bg-luxury-black border border-luxury-darkGray p-2.5 rounded-xl text-white outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAssetModalOpen(false)} className="px-4 py-2 rounded-xl text-white/70">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold">Save Asset</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
