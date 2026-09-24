import BarcodeGenerator from './BarcodeGenerator';
import QRCodeGenerator from './QRCodeGenerator';
import sklpLogo from '@assets/images/sklp_logo.png';
import { useBranding, resolveLogoUrl } from '@context/BrandingContext';

/**
 * STYLE STREET — Official Order Receipt Document
 * Comprehensive order and financial summary for Admin and Buyer.
 * Clean, printable, and fully compliant with privacy requirements.
 */
export default function OrderReceipt({
  receipt,
  className = ''
}) {
  const { branding } = useBranding();
  const logoUrl = resolveLogoUrl(branding, 'receiptLogo', sklpLogo);

  if (!receipt) return null;

  const customer = receipt.customer || {};
  const shippingAddress = customer.shippingAddress || {};
  const billingAddress = customer.billingAddress || shippingAddress;
  const pricing = receipt.pricing || {};

  const orderDateFormatted = receipt.orderDate
    ? new Date(receipt.orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  const trackingUrl = receipt.trackingQRUrl || `https://stylestreet.in/orders/${receipt.orderNumber}/track`;

  return (
    <div
      className={`order-receipt-container bg-white text-black font-sans mx-auto max-w-[800px] border border-gray-300 rounded-xl p-8 shadow-sm print:border-none print:shadow-none print:p-4 print:max-w-none print:w-full ${className}`}
      style={{ color: '#111827', backgroundColor: '#ffffff' }}
    >
      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt={branding.brandName || 'Style Street'}
            className="w-14 h-14 object-contain"
          />
          <div>
            <h1 className="brand-name text-2xl font-black text-black">
              STYLE <span className="brand-accent">STREET</span>
            </h1>
            <p className="text-xs uppercase font-bold tracking-widest text-[#B8860B]">
              Luxury Fashion Marketplace
            </p>
            <p className="text-[10px] text-gray-500">Official Purchase Receipt</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="px-3 py-1 bg-amber-50 text-[#B8860B] border border-amber-200 text-xs font-bold uppercase rounded-full tracking-wider">
            Order Receipt
          </span>
          <div className="mt-2 text-xs font-mono">
            <p className="text-gray-500">Order ID: <strong className="text-black">{receipt.orderNumber}</strong></p>
            <p className="text-gray-500">Date: <strong className="text-black">{orderDateFormatted}</strong></p>
            {receipt.invoiceNumber && (
              <p className="text-gray-500">Invoice: <strong className="text-black">{receipt.invoiceNumber}</strong></p>
            )}
          </div>
        </div>
      </div>

      {/* ── BARCODE & QUICK META ───────────────────────────────────────────── */}
      <div className="my-5 py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <BarcodeGenerator
            value={receipt.primaryBarcode || receipt.orderNumber}
            height={38}
            width={1.6}
            displayValue={true}
          />
        </div>
        <div className="text-xs text-center sm:text-right space-y-1">
          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <span className="text-gray-500 uppercase text-[10px] font-bold">Payment:</span>
            <span className="font-bold text-black uppercase">{receipt.paymentMethod || 'PREPAID'}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              receipt.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {receipt.paymentStatus || 'COMPLETED'}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-center sm:justify-end text-[11px]">
            <span className="text-gray-500 uppercase text-[10px] font-bold">Order Status:</span>
            <span className="font-semibold text-black uppercase">{receipt.status || 'CONFIRMED'}</span>
          </div>
        </div>
      </div>

      {/* ── CUSTOMER & ADDRESS SNAPSHOT ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 text-xs">
        {/* Shipping Address */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-[11px] uppercase font-bold tracking-wider text-gray-500 border-b border-gray-100 pb-1.5 mb-2.5">
            📦 Shipping Details
          </h3>
          <p className="font-bold text-sm text-black mb-1">{customer.name || 'Valued Customer'}</p>
          <div className="text-gray-700 space-y-0.5 leading-relaxed">
            <p>{shippingAddress.street || 'Address on file'}</p>
            <p>
              {shippingAddress.city && `${shippingAddress.city}, `}
              {shippingAddress.state && `${shippingAddress.state} - `}
              <strong className="text-black font-mono">{shippingAddress.postalCode}</strong>
            </p>
            <p className="uppercase text-[11px] text-gray-500">{shippingAddress.country || 'India'}</p>
          </div>
          {/* Masked Phone Number */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-gray-500">Contact:</span>
            <span className="font-mono font-bold text-black bg-gray-100 px-2 py-0.5 rounded">
              {customer.maskedPhone || 'Not Provided'}
            </span>
          </div>
        </div>

        {/* Billing / Order Details */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-[11px] uppercase font-bold tracking-wider text-gray-500 border-b border-gray-100 pb-1.5 mb-2.5">
            💳 Billing & Account
          </h3>
          <p className="font-bold text-sm text-black mb-1">{customer.name || 'Valued Customer'}</p>
          <p className="text-gray-600 mb-2">{customer.email || 'Email on file'}</p>
          <div className="text-gray-700 space-y-0.5 leading-relaxed text-[11px]">
            <p>{billingAddress.street || shippingAddress.street}</p>
            <p>
              {billingAddress.city || shippingAddress.city}, {billingAddress.state || shippingAddress.state} - {billingAddress.postalCode || shippingAddress.postalCode}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Total Packages:</span>
            <span className="font-mono font-bold text-black">{receipt.totalPackages || 1} Package(s)</span>
          </div>
        </div>
      </div>

      {/* ── PRODUCTS TABLE (TEXT ONLY — NO PRODUCT IMAGES) ────────────────── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden my-6">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-700 tracking-wider">
              <th className="py-2.5 px-4">Item Details</th>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3">Seller / Brand</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-4 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(receipt.items || []).map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="py-3 px-4">
                  <div className="font-bold text-black">{item.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {item.variantText || 'Standard'}
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-[10px] font-bold text-gray-800 uppercase">
                  {item.sku}
                </td>
                <td className="py-3 px-3">
                  <div className="font-semibold text-black">{item.brand || 'Style Street'}</div>
                  <div className="text-[9px] text-gray-500">{item.sellerShopName}</div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-black">
                  {item.quantity}
                </td>
                <td className="py-3 px-3 text-right font-mono text-gray-700">
                  ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-black">
                  ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── FINANCIAL SUMMARY & QR CODE ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 my-6 pt-2">
        {/* Left: QR Code Tracking */}
        <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <QRCodeGenerator value={trackingUrl} size={70} />
          <div className="text-[10px] text-gray-600 space-y-1">
            <p className="font-bold text-black uppercase text-[11px]">Track Shipment</p>
            <p>Scan to verify real-time status</p>
            <p className="font-mono text-gray-500">Order #{receipt.orderNumber}</p>
          </div>
        </div>

        {/* Right: Price Breakdown */}
        <div className="w-full sm:w-72 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono font-semibold text-black">
              ₹{Number(pricing.subtotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {pricing.couponDiscount > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Coupon Discount {pricing.couponCode ? `(${pricing.couponCode})` : ''}</span>
              <span className="font-mono font-bold">
                -₹{Number(pricing.couponDiscount).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee</span>
            <span className="font-mono">
              {pricing.deliveryFee > 0 ? `₹${Number(pricing.deliveryFee).toLocaleString('en-IN')}` : 'FREE'}
            </span>
          </div>

          {pricing.platformFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Platform Fee</span>
              <span className="font-mono">₹{Number(pricing.platformFee).toLocaleString('en-IN')}</span>
            </div>
          )}

          {pricing.taxAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Estimated Tax (GST)</span>
              <span className="font-mono">₹{Number(pricing.taxAmount).toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-center text-sm font-bold text-black">
            <span className="uppercase tracking-wider">Total Amount</span>
            <span className="text-base font-mono text-[#B8860B] font-black">
              ₹{Number(pricing.totalAmount || pricing.subtotal || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500 space-y-1">
        <p className="font-serif italic text-black font-semibold text-sm">
          Thank you for shopping with STYLE STREET
        </p>
        <p className="text-[10px] uppercase tracking-widest text-[#B8860B] font-bold">
          Wear Your Story
        </p>
        <p className="text-[10px] text-gray-400">
          For support or returns, visit stylestreet.in/support or email support@stylestreet.in
        </p>
      </div>
    </div>
  );
}
