import sklpLogo from '@assets/images/sklp_logo.png';
import { useBranding, resolveLogoUrl } from '@context/BrandingContext';

/**
 * Number to Indian Words Converter for Invoice
 */
function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Rupees Only';
  let str = '';
  str += (n[1] !== '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] !== '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] !== '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] !== '0') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
}

/**
 * STYLE STREET — Official Tax Invoice Document
 * Proper legal, tax, and accounting document.
 * Includes invoice number, GST breakdown, taxable value, and signatory.
 */
export default function TaxInvoice({
  receipt,
  className = ''
}) {
  const { branding } = useBranding();
  const logoUrl = resolveLogoUrl(branding, 'receiptLogo', sklpLogo);

  if (!receipt) return null;

  const seller = receipt.seller || receipt.sellers?.[0] || {
    brandName: 'STYLE STREET',
    shopName: 'Style Street Retail Private Limited',
    pickupAddress: { street: '', city: 'Hyderabad', state: 'Telangana', pincode: '500081', country: 'India' }
  };

  const customer = receipt.customer || {};
  const shippingAddress = customer.shippingAddress || {};
  const pricing = receipt.pricing || {};

  const invoiceNumber = receipt.invoiceNumber || `INV-${receipt.orderNumber || '001'}`;
  const invoiceDateFormatted = receipt.invoiceDate
    ? new Date(receipt.invoiceDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  const orderDateFormatted = receipt.orderDate
    ? new Date(receipt.orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : invoiceDateFormatted;

  const totalAmount = pricing.totalAmount || pricing.subtotal || 0;
  const totalInWords = numberToWords(totalAmount);

  // Determine state for IGST vs CGST+SGST
  const sellerState = (seller.pickupAddress?.state || 'Telangana').trim().toLowerCase();
  const customerState = (shippingAddress.state || 'Telangana').trim().toLowerCase();
  const isInterState = sellerState !== customerState;

  // Standard apparel GST 5% or 12% calculation (5% default for fashion marketplace)
  const gstRate = 5;
  const taxableBase = pricing.subtotal ? Math.round((pricing.subtotal / (1 + gstRate / 100)) * 100) / 100 : 0;
  const totalTax = pricing.taxAmount || Math.round((pricing.subtotal - taxableBase) * 100) / 100;
  const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igst = isInterState ? totalTax : 0;

  return (
    <div
      className={`tax-invoice-container bg-white text-black font-sans mx-auto max-w-[850px] border border-gray-400 p-8 shadow-sm print:border-none print:shadow-none print:p-2 print:max-w-none print:w-full ${className}`}
      style={{ color: '#000000', backgroundColor: '#ffffff' }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt={branding.brandName || 'Style Street'}
            className="w-12 h-12 object-contain filter grayscale contrast-200"
          />
          <div>
            <h1 className="brand-name text-xl font-black text-black">
              STYLE <span className="brand-accent">STREET</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B8860B]">
              {branding.tagline || 'Luxury Fashion Marketplace'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-lg font-black uppercase tracking-wider text-black">
            TAX INVOICE
          </h2>
          <p className="text-[10px] text-gray-600 font-mono">Original for Recipient</p>
          <div className="mt-1 text-xs font-mono">
            <p><strong>Invoice No:</strong> {invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> {invoiceDateFormatted}</p>
          </div>
        </div>
      </div>

      {/* ── ORDER & REFERENCE SUMMARY ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-black/40 rounded p-2.5 text-xs font-mono bg-black/[0.02] mb-4">
        <div>
          <span className="text-gray-500 block text-[9px] uppercase">Order ID</span>
          <strong className="text-black">{receipt.orderNumber}</strong>
        </div>
        <div>
          <span className="text-gray-500 block text-[9px] uppercase">Order Date</span>
          <strong className="text-black">{orderDateFormatted}</strong>
        </div>
        <div>
          <span className="text-gray-500 block text-[9px] uppercase">Payment Mode</span>
          <strong className="text-black uppercase">{receipt.paymentMethod || 'PREPAID'}</strong>
        </div>
        <div>
          <span className="text-gray-500 block text-[9px] uppercase">Place of Supply</span>
          <strong className="text-black">{shippingAddress.state || 'India'}</strong>
        </div>
      </div>

      {/* ── SELLER & BUYER DETAILS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-black/40 rounded p-4 mb-4 text-xs">
        {/* Sold By */}
        <div className="space-y-1">
          <h3 className="font-black text-[10px] uppercase tracking-wider text-black border-b border-black/20 pb-1 mb-1.5">
            Sold By (Supplier / Seller)
          </h3>
          <p className="font-bold text-sm text-black">{seller.shopName || seller.brandName}</p>
          {seller.brandName && seller.brandName !== seller.shopName && (
            <p className="text-[10px] text-[#B8860B] font-bold uppercase">Brand: {seller.brandName}</p>
          )}
          <p className="text-gray-700 leading-snug">
            {seller.pickupAddress?.street || 'Style Street Fulfillment Hub'}
          </p>
          <p className="text-gray-700">
            {seller.pickupAddress?.city && `${seller.pickupAddress.city}, `}
            {seller.pickupAddress?.state || ''} - {seller.pickupAddress?.pincode || ''}
          </p>
          <p className="font-mono mt-1 pt-1 border-t border-black/10">
            <strong>GSTIN:</strong> {seller.gstin || 'Unregistered / Not Provided'}
          </p>
          <p className="font-mono text-[10px] text-gray-600">
            State: {seller.pickupAddress?.state || 'Telangana'}
          </p>
        </div>

        {/* Bill To & Ship To */}
        <div className="space-y-1 md:border-l md:border-black/20 md:pl-4">
          <h3 className="font-black text-[10px] uppercase tracking-wider text-black border-b border-black/20 pb-1 mb-1.5">
            Billed & Shipped To (Customer)
          </h3>
          <p className="font-bold text-sm text-black">{customer.name || 'Customer'}</p>
          <p className="text-gray-700 leading-snug">{shippingAddress.street || 'Address on file'}</p>
          <p className="text-gray-700">
            {shippingAddress.city && `${shippingAddress.city}, `}
            {shippingAddress.state && `${shippingAddress.state} - `}
            <span className="font-mono font-bold">{shippingAddress.postalCode}</span>
          </p>
          <p className="font-mono mt-1 pt-1 border-t border-black/10">
            <strong>Contact (Masked):</strong> {customer.maskedPhone || 'Not Provided'}
          </p>
          <p className="font-mono text-[10px] text-gray-600">
            State: {shippingAddress.state || 'N/A'}
          </p>
        </div>
      </div>

      {/* ── ITEMIZED TAX TABLE (TEXT ONLY) ─────────────────────────────────── */}
      <div className="border border-black rounded overflow-hidden mb-4">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-black text-white text-[9px] uppercase tracking-wider">
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Item Description</th>
              <th className="py-2 px-2">HSN/SKU</th>
              <th className="py-2 px-2 text-center">Qty</th>
              <th className="py-2 px-2 text-right">Gross Rate</th>
              <th className="py-2 px-2 text-right">Taxable</th>
              <th className="py-2 px-2 text-right">GST %</th>
              <th className="py-2 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20 font-sans text-xs">
            {(receipt.items || []).map((item, idx) => {
              const lineTotal = (item.finalPrice || item.price || 0) * (item.quantity || 1);
              const lineTaxable = Math.round((lineTotal / (1 + gstRate / 100)) * 100) / 100;
              return (
                <tr key={idx} className="hover:bg-black/[0.02]">
                  <td className="py-2 px-3 font-mono text-[10px]">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-black">
                    <div>{item.name}</div>
                    <div className="text-[10px] text-gray-600 font-normal">
                      {item.variantText || 'Standard'}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px] uppercase text-gray-800">
                    {item.sku || '6204'}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-700">
                    ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-700">
                    ₹{lineTaxable.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-700">
                    {gstRate}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-black">
                    ₹{lineTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── TAX BREAKDOWN & GRAND TOTAL ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-black/40 rounded p-4 mb-4 text-xs font-mono">
        <div>
          <h4 className="font-bold uppercase text-[10px] text-black mb-2 tracking-wider">
            Tax Breakdown ({isInterState ? 'IGST' : 'CGST + SGST'})
          </h4>
          <div className="space-y-1 text-gray-700">
            <div className="flex justify-between">
              <span>Taxable Value:</span>
              <span>₹{taxableBase.toLocaleString('en-IN')}</span>
            </div>
            {!isInterState ? (
              <>
                <div className="flex justify-between">
                  <span>CGST (2.5%):</span>
                  <span>₹{cgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%):</span>
                  <span>₹{sgst.toLocaleString('en-IN')}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST (5%):</span>
                <span>₹{igst.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-black border-t border-black/20 pt-1">
              <span>Total Tax:</span>
              <span>₹{totalTax.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-black/20 text-[10px] font-sans">
            <strong>Amount in Words:</strong>
            <p className="italic text-gray-800">{totalInWords}</p>
          </div>
        </div>

        <div className="space-y-1.5 md:border-l md:border-black/20 md:pl-4">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>₹{Number(pricing.subtotal || 0).toLocaleString('en-IN')}</span>
          </div>
          {pricing.couponDiscount > 0 && (
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Discount</span>
              <span>-₹{Number(pricing.couponDiscount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span>Shipping / Delivery</span>
            <span>{pricing.deliveryFee > 0 ? `₹${Number(pricing.deliveryFee).toLocaleString('en-IN')}` : 'FREE'}</span>
          </div>
          {pricing.platformFee > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Platform Fee</span>
              <span>₹{Number(pricing.platformFee).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="border-t-2 border-black pt-2 flex justify-between items-center text-sm font-black text-black">
            <span className="uppercase">Grand Total</span>
            <span className="text-base text-[#B8860B]">₹{Number(totalAmount).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── DECLARATION & SIGNATORY ────────────────────────────────────────── */}
      <div className="flex justify-between items-end border-t border-black/40 pt-4 text-xs">
        <div className="text-[10px] text-gray-600 max-w-sm space-y-0.5 leading-snug">
          <p className="font-bold text-black">Declaration:</p>
          <p>This is a computer generated invoice and does not require physical signature unless demanded by statutory authority.</p>
          <p>Goods once sold can be returned within 7 days under standard marketplace return policy.</p>
        </div>

        <div className="text-center font-mono">
          <div className="w-40 border-b border-black pb-8 mb-1">
            <span className="text-[9px] text-gray-400 uppercase">Authorized Signatory</span>
          </div>
          <p className="text-[10px] font-bold text-black">For {seller.shopName || 'Style Street'}</p>
        </div>
      </div>
    </div>
  );
}
