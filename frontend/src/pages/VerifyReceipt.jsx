import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiShield, 
  FiPrinter, 
  FiDownload, 
  FiSearch,
  FiArrowLeft,
  FiTruck,
  FiLock
} from 'react-icons/fi';
import { orderService } from '@services/apiServices';
import { toast } from 'react-toastify';

export default function VerifyReceipt() {
  const [searchParams] = useSearchParams();
  const initialOrder = searchParams.get('order') || '';
  const initialInvoice = searchParams.get('invoice') || '';

  const [orderQuery, setOrderQuery] = useState(initialOrder);
  const [invoiceQuery, setInvoiceQuery] = useState(initialInvoice);

  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performVerification = async (ord, inv) => {
    if (!ord && !inv) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await orderService.verifyDocument({ order: ord, invoice: inv });
      if (res.data?.success) {
        setVerificationResult(res.data);
      } else {
        setVerificationResult({ verified: false });
      }
    } catch (err) {
      console.error('Verification query failed:', err);
      setVerificationResult({ verified: false, message: 'Server error during statutory validation.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder || initialInvoice) {
      performVerification(initialOrder, initialInvoice);
    }
  }, [initialOrder, initialInvoice]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!orderQuery.trim() && !invoiceQuery.trim()) {
      toast.warning('Please enter an Order ID or Invoice Number');
      return;
    }
    performVerification(orderQuery.trim(), invoiceQuery.trim());
  };

  const handleDownloadPdf = async (orderId, orderNum) => {
    try {
      toast.info('Downloading verified Tax Invoice PDF...');
      const res = await orderService.getInvoicePdf(orderId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StyleStreet_Verified_Invoice_${orderNum || orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Verified PDF downloaded successfully');
    } catch (err) {
      toast.error('Unable to download PDF. Please log in to your account.');
    }
  };

  const doc = verificationResult?.document;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-luxury-gold hover:text-yellow-400 transition"
          >
            <FiArrowLeft size={14} /> Back to Store
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
              Compliance Registry Live
            </span>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 text-center shadow-xl backdrop-blur print:border-black print:bg-white print:p-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-luxury-gold/15 text-luxury-gold mb-3 print:hidden">
            <FiShield size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-wider uppercase text-luxury-gold print:text-black">
            STYLE STREET
          </h1>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mt-1 print:text-gray-700">
            Digital Tax Invoice & Order Authenticity Verification Portal
          </p>
          <p className="text-[11px] text-slate-400 max-w-xl mx-auto mt-2 print:hidden">
            Official statutory registry for verifying genuine goods, seller GST compliance, and courier dispatch authenticity under Indian CGST/SGST Rules.
          </p>
        </div>

        {/* Verification Search Bar (Hidden when printing) */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 shadow-sm print:hidden">
          <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Order Reference Number
              </label>
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                placeholder="e.g. ST-2026-1002"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-luxury-gold transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Tax Invoice Number
              </label>
              <input
                type="text"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                placeholder="e.g. INV-ST-2026-1002"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-luxury-gold transition"
              />
            </div>
            <div className="sm:self-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-luxury-gold hover:bg-yellow-400 text-luxury-black font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 touch-target"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiSearch size={14} /> Verify
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              Cross-referencing cryptographic ledger...
            </p>
          </div>
        )}

        {/* VERIFIED SUCCESS CARD */}
        {!loading && hasSearched && verificationResult?.verified && doc && (
          <div className="bg-slate-800/90 border-2 border-emerald-500/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur print:border-black print:bg-white print:shadow-none">
            
            {/* Top Status Banner */}
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-4 flex items-center justify-between flex-wrap gap-3 print:bg-gray-100 print:border-black">
              <div className="flex items-center gap-3">
                <FiCheckCircle size={28} className="text-emerald-400 print:text-black shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono print:text-black">
                      AUTHENTIC & VERIFIED
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:text-black print:border-black">
                      GST COMPLIANT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 print:text-gray-700">
                    Document matches active records on Style Street Central Merchant Registry
                  </p>
                </div>
              </div>
              <div className="text-right print:text-left">
                <p className="text-[10px] font-mono text-slate-400 print:text-gray-600 uppercase">Audit ID</p>
                <p className="text-xs font-mono font-bold text-luxury-gold print:text-black">
                  {verificationResult.verificationId}
                </p>
              </div>
            </div>

            {/* Verification Content Grid */}
            <div className="p-6 space-y-6 print:p-4 print:space-y-4">
              
              {/* Order & Invoice Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-700/60 print:border-black">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-600">
                    Order Reference
                  </p>
                  <p className="text-sm font-mono font-bold text-white print:text-black mt-0.5">
                    #{doc.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-600">
                    Tax Invoice No.
                  </p>
                  <p className="text-sm font-mono font-bold text-luxury-gold print:text-black mt-0.5">
                    {doc.invoiceNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-600">
                    Order Date
                  </p>
                  <p className="text-xs font-mono text-slate-300 print:text-black mt-0.5">
                    {new Date(doc.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-600">
                    Order Status
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40 print:text-black print:border-black">
                    {doc.orderStatus}
                  </span>
                </div>
              </div>

              {/* Merchant & Customer Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-700/60 print:border-black">
                
                {/* Merchant Block */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <FiShield className="text-luxury-gold" size={14} />
                    <h3 className="text-xs uppercase font-bold tracking-wider text-luxury-gold">
                      Authorized Merchant
                    </h3>
                  </div>
                  <p className="text-sm font-bold text-white print:text-black">
                    {doc.seller?.brandName || 'STYLE STREET Brand'}
                  </p>
                  <p className="text-xs text-slate-400 print:text-gray-700">
                    {doc.seller?.shopName}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs print:border-gray-300">
                    <span className="text-slate-400">Merchant GSTIN:</span>
                    <span className="font-mono font-bold text-emerald-400 print:text-black">
                      {doc.seller?.maskedGstin} {doc.seller?.gstinVerified && '✓ Verified'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Dispatch Location:</span>
                    <span className="text-slate-300 print:text-black">
                      {doc.seller?.city}, {doc.seller?.state}
                    </span>
                  </div>
                </div>

                {/* Logistics & Payment Block */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTruck className="text-luxury-gold" size={14} />
                    <h3 className="text-xs uppercase font-bold tracking-wider text-luxury-gold">
                      Fulfilment & Payment
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Classification:</span>
                      <span className="font-bold text-white print:text-black">{doc.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Status:</span>
                      <span className="font-mono font-bold text-emerald-400 print:text-black">{doc.paymentStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Articles:</span>
                      <span className="font-mono text-slate-200 print:text-black">{doc.itemCount} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verified Destination:</span>
                      <span className="text-slate-200 print:text-black">{doc.customerSummary?.destination}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline print:border-gray-300">
                      <span className="text-xs uppercase font-bold text-slate-400">Grand Total:</span>
                      <span className="text-base font-mono font-bold text-luxury-gold print:text-black">
                        ₹{(doc.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Statutory Compliance Footer Statement */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1 print:bg-white print:border-gray-300 print:text-gray-700">
                <div className="flex items-center gap-1.5 font-bold text-slate-300 print:text-black">
                  <FiLock size={12} className="text-emerald-400" />
                  <span>Statutory Authenticity & Tax Standards Compliance</span>
                </div>
                <p>
                  This official document has been authenticated under Rule 46 of the Central Goods and Services Tax Rules, 2017. Validated against the STYLE STREET central fiscal audit ledger.
                </p>
                <p className="font-mono text-[10px] text-slate-500 pt-1">
                  Validated Timestamp: {new Date(doc.statutoryCompliance?.verificationTimestamp).toLocaleString('en-IN')} | Issuer: {doc.statutoryCompliance?.marketplace}
                </p>
              </div>

              {/* Action Buttons (Hidden when printing) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition touch-target"
                >
                  <FiPrinter size={14} /> Print Certificate
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(doc.orderId, doc.orderNumber)}
                    className="px-5 py-2 bg-luxury-gold hover:bg-yellow-400 text-luxury-black rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow touch-target"
                  >
                    <FiDownload size={14} /> Download Tax Invoice (PDF)
                  </button>
                  <Link
                    to={`/orders/${doc.orderId}/track`}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition touch-target"
                  >
                    <FiTruck size={14} /> Live Tracking
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* NOT FOUND / INVALID RESULT */}
        {!loading && hasSearched && (!verificationResult?.verified || !doc) && (
          <div className="bg-slate-800/80 border border-red-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-400">
              <FiAlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wider text-red-400">
                Document Verification Failed
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {verificationResult?.message || 'No official order or tax invoice record matches the specified document details.'}
              </p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl max-w-md mx-auto text-left text-xs text-slate-400 space-y-1 font-mono">
              <p className="font-bold text-slate-300">Possible explanations:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Order ID or Invoice Number was misread or mistyped</li>
                <li>Invoice was generated by an unapproved third-party</li>
                <li>Order was cancelled prior to manifest generation</li>
              </ul>
            </div>
            <p className="text-xs text-slate-500">
              Need assistance? Contact <span className="text-luxury-gold">support@stylestreet.in</span> or verify from your customer dashboard.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
