/**
 * Admin Branding Settings Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows Admin to:
 *  • Upload / replace logo images for each slot (receiptLogo, shippingLogo, etc.)
 *  • Delete existing logos
 *  • Update brand text: name, tagline, colours, contact info, GSTIN
 *
 * All logo changes are reflected immediately on Order Receipt, Shipping Label
 * and Tax Invoice documents (via BrandingContext).
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  FiUploadCloud, FiTrash2, FiSave, FiImage, FiRefreshCw,
  FiPackage, FiFileText, FiMail, FiGlobe
} from 'react-icons/fi';
import { adminService } from '@services/apiServices';
import { useBranding } from '@context/BrandingContext';

// ── Logo slot definitions ─────────────────────────────────────────────────────
const LOGO_SLOTS = [
  {
    key: 'receiptLogo',
    label: 'Receipt & Invoice Logo',
    description: 'Shown on Order Receipt and Tax Invoice (full colour, recommended 600×600px)',
    icon: <FiFileText size={18} />,
    accent: '#B8860B'
  },
  {
    key: 'shippingLogo',
    label: 'Shipping / Packing Label Logo',
    description: 'Shown on Shipping Labels — should be high contrast, suitable for B&W printing',
    icon: <FiPackage size={18} />,
    accent: '#1a1a1a'
  },
  {
    key: 'mainLogo',
    label: 'Main Platform Logo',
    description: 'Used on the storefront hero and general branding — fallback for all other slots',
    icon: <FiGlobe size={18} />,
    accent: '#7c3aed'
  },
  {
    key: 'emailLogo',
    label: 'Email Logo',
    description: 'Used in transactional emails and notifications (recommended 400×100px banner)',
    icon: <FiMail size={18} />,
    accent: '#0ea5e9'
  }
];

// ── Text field definitions ────────────────────────────────────────────────────
const TEXT_FIELDS = [
  { key: 'brandName',    label: 'Brand Name',       placeholder: 'STYLE STREET', type: 'text' },
  { key: 'tagline',      label: 'Tagline',           placeholder: 'Luxury Fashion Marketplace', type: 'text' },
  { key: 'primaryColor', label: 'Primary Colour',    placeholder: '#B8860B', type: 'color' },
  { key: 'supportEmail', label: 'Support Email',     placeholder: 'support@stylestreet.in', type: 'email' },
  { key: 'supportPhone', label: 'Support Phone',     placeholder: '+91 9876543210', type: 'tel' },
  { key: 'websiteUrl',   label: 'Website URL',       placeholder: 'https://stylestreet.in', type: 'url' },
  { key: 'gstin',        label: 'GSTIN',             placeholder: '29ABCDE1234F1Z5', type: 'text' },
  { key: 'receiptFooterText', label: 'Receipt Footer Text', placeholder: 'Thank you for shopping with Style Street...', type: 'textarea' }
];

// ── Logo Slot Card ────────────────────────────────────────────────────────────
function LogoSlotCard({ slot, currentUrl, onUpload, onDelete }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(slot.key, file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove the ${slot.label}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(slot.key);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b border-slate-100"
        style={{ borderLeftWidth: 4, borderLeftColor: slot.accent, borderLeftStyle: 'solid' }}
      >
        <span style={{ color: slot.accent }}>{slot.icon}</span>
        <div>
          <p className="font-bold text-sm text-slate-800">{slot.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{slot.description}</p>
        </div>
      </div>

      {/* Preview */}
      <div className="p-5 flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={slot.label}
              className="w-full h-full object-contain p-1"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <FiImage size={28} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">No logo set</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition active:scale-95 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <FiRefreshCw size={13} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <FiUploadCloud size={14} />
                {currentUrl ? 'Replace' : 'Upload'}
              </>
            )}
          </button>

          {currentUrl && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-50"
            >
              {deleting ? <FiRefreshCw size={13} className="animate-spin" /> : <FiTrash2 size={13} />}
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BrandingSettings() {
  const { refresh: refreshBranding } = useBranding();

  const [branding, setBranding] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});

  // Fetch branding from admin endpoint (includes all fields)
  const fetchBranding = async () => {
    try {
      setLoading(true);
      const res = await adminService.getBranding();
      if (res.data?.success) {
        const b = res.data.branding;
        setBranding(b);
        // Populate form with current values
        const initial = {};
        TEXT_FIELDS.forEach(({ key }) => {
          initial[key] = b[key] ?? '';
        });
        setForm(initial);
      }
    } catch (err) {
      toast.error('Failed to load branding settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranding(); }, []);

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload = async (logoType, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await adminService.uploadBrandingLogo(logoType, formData);
      if (res.data?.success) {
        toast.success(`${logoType} uploaded successfully`);
        await fetchBranding();
        refreshBranding(); // Propagate to all receipt components immediately
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed');
    }
  };

  // ── Logo delete ────────────────────────────────────────────────────────────
  const handleLogoDelete = async (logoType) => {
    try {
      const res = await adminService.deleteBrandingLogo(logoType);
      if (res.data?.success) {
        toast.success(`${logoType} removed`);
        await fetchBranding();
        refreshBranding();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove logo');
    }
  };

  // ── Text save ──────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminService.updateBranding(form);
      if (res.data?.success) {
        toast.success('Branding settings saved');
        await fetchBranding();
        refreshBranding();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* ── Page Title ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Branding & Logo Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage the logos and brand identity used across Order Receipts, Shipping Labels, Tax Invoices, and Emails.
          Changes take effect immediately — no code deployment needed.
        </p>
      </div>

      {/* ── Logo Slots ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
          Logo Assets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {LOGO_SLOTS.map((slot) => (
            <LogoSlotCard
              key={slot.key}
              slot={slot}
              currentUrl={branding?.[slot.key]?.url || ''}
              onUpload={handleLogoUpload}
              onDelete={handleLogoDelete}
            />
          ))}
        </div>
      </section>

      {/* ── Text / Brand Fields ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
          Brand Information
        </h2>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {TEXT_FIELDS.map(({ key, label, placeholder, type }) => (
              <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {label}
                </label>
                {type === 'textarea' ? (
                  <textarea
                    value={form[key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                ) : type === 'color' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form[key] || '#B8860B'}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form[key] || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                ) : (
                  <input
                    type={type}
                    value={form[key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Registered Address Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Registered Address (printed on Tax Invoice)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {[
                { key: 'street',  label: 'Street / Building' },
                { key: 'city',    label: 'City' },
                { key: 'state',   label: 'State' },
                { key: 'pincode', label: 'Pincode' },
                { key: 'country', label: 'Country' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={form?.registeredAddress?.[key] || branding?.registeredAddress?.[key] || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        registeredAddress: { ...(f.registeredAddress || {}), [key]: e.target.value }
                      }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase tracking-wider rounded-xl text-sm transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <><FiRefreshCw size={14} className="animate-spin" /> Saving…</>
              ) : (
                <><FiSave size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ── Live Preview Hint ─────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm">
        <p className="font-bold text-amber-800 mb-1">💡 Live Preview</p>
        <p className="text-amber-700 text-xs">
          After saving, open any <strong>Order Receipt</strong>, <strong>Shipping Label</strong>, or <strong>Tax Invoice</strong>{' '}
          to see the updated logo and brand information. Changes are reflected immediately without a page reload.
        </p>
      </div>
    </div>
  );
}
