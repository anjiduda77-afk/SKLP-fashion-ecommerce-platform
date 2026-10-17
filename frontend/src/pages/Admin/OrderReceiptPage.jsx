import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiPrinter, FiDownload, FiFileText, FiPackage, FiDollarSign } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { adminService, orderService } from '@services/apiServices';
import OrderReceipt from '@components/Receipt/OrderReceipt';
import ShippingLabel from '@components/Receipt/ShippingLabel';
import TaxInvoice from '@components/Receipt/TaxInvoice';

export default function OrderReceiptPage({ isCustomerView = false }) {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') || 'receipt';
  const [activeTab, setActiveTab] = useState(tabParam);
  const [selectedPkgIndex, setSelectedPkgIndex] = useState(0);

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        const res = isCustomerView
          ? await orderService.getOrderReceipt(orderId)
          : await adminService.getOrderReceipt(orderId);
        if (res.data?.success) {
          setReceipt(res.data.receipt);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load order receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [orderId, isCustomerView]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!receipt) return;
    setDownloading(true);
    const sanitizedId = (receipt.orderNumber || orderId).replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      if (activeTab === 'label') {
        const response = await adminService.getOrderPackingSlipPdf(orderId, selectedPkgIndex);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `StyleStreet_PackingSlip_${sanitizedId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`Packing Slip PDF downloaded successfully`);
        setDownloading(false);
        return;
      }

      // Real server-generated GST Tax Invoice / Order Receipt vector PDF
      const response = isCustomerView
        ? await orderService.getInvoicePdf(orderId)
        : await adminService.getOrderTaxInvoicePdf(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StyleStreet_TaxInvoice_${sanitizedId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Tax Invoice PDF downloaded successfully`);
    } catch (err) {
      console.warn('PDF download failed, opening print dialog:', err);
      toast.info('Opening print dialog for PDF export');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs uppercase font-bold tracking-widest text-gray-600">
          Loading Style Street Order Document...
        </p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-base font-bold text-gray-800 mb-2">Order Document Not Available</p>
        <button
          onClick={() => navigate(isCustomerView ? '/orders' : '/admin/orders')}
          className="px-4 py-2 bg-luxury-gold text-black rounded-lg text-xs font-bold uppercase tracking-wider"
        >
          Return to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 print:bg-white print:p-0">
      {/* ── TOP ACTION TOOLBAR (HIDDEN IN PRINT) ───────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate(isCustomerView ? '/orders' : '/admin/orders')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition touch-target"
          >
            <FiArrowLeft size={14} /> Back to Orders
          </button>

          {/* Document Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto scrollbar-none max-w-full">
            <button
              onClick={() => handleTabChange('receipt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'receipt'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <FiFileText size={13} />
              <span>Order Receipt</span>
            </button>

            <button
              onClick={() => handleTabChange('label')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'label'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <FiPackage size={13} />
              <span>Shipping Label</span>
            </button>

            <button
              onClick={() => handleTabChange('invoice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'invoice'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <FiDollarSign size={13} />
              <span>Tax Invoice</span>
            </button>
          </div>

          {/* Action Buttons: Print & Download PDF */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Multi-package selector if applicable */}
            {activeTab === 'label' && receipt.packages?.length > 1 && (
              <select
                value={selectedPkgIndex}
                onChange={(e) => setSelectedPkgIndex(Number(e.target.value))}
                className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white font-mono font-semibold"
              >
                {receipt.packages.map((pkg, idx) => (
                  <option key={idx} value={idx}>
                    Pkg {pkg.packageNumber} ({pkg.packageId})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm active:scale-95 touch-target"
            >
              <FiPrinter size={14} /> Print
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-luxury-gold hover:bg-luxury-darkGold text-black text-xs font-extrabold uppercase tracking-wider rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 touch-target"
            >
              <FiDownload size={14} />
              {downloading ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </header>

      {/* ── DOCUMENT VIEWPORT ──────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto mt-4 sm:mt-6 px-2 sm:px-4 print:m-0 print:p-0 print:max-w-none">
        <div id="printable-document" className="bg-white rounded-xl shadow-md print:shadow-none overflow-x-auto">
          {activeTab === 'receipt' && (
            <OrderReceipt receipt={receipt} />
          )}

          {activeTab === 'label' && (
            <ShippingLabel
              receipt={receipt}
              selectedPackageIndex={selectedPkgIndex}
            />
          )}

          {activeTab === 'invoice' && (
            <TaxInvoice receipt={receipt} />
          )}
        </div>
      </main>
    </div>
  );
}
