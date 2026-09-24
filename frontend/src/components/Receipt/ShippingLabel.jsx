import BarcodeGenerator from './BarcodeGenerator';
import QRCodeGenerator from './QRCodeGenerator';
import sklpLogo from '@assets/images/sklp_logo.png';
import { useBranding, resolveLogoUrl } from '@context/BrandingContext';

/**
 * STYLE STREET — Professional Shipping / Packing Label
 * High contrast, printer-friendly, courier-ready (A4 & 4x6 thermal compatible)
 * Strictly text-only product representation (NO photos)
 */
export default function ShippingLabel({
  receipt,
  selectedPackageIndex = 0,
  className = ''
}) {
  const { branding } = useBranding();
  const logoUrl = resolveLogoUrl(branding, 'shippingLogo', sklpLogo);

  if (!receipt) return null;

  const pkg = receipt.packages?.[selectedPackageIndex] || receipt.packages?.[0] || {
    packageNumber: '1/1',
    packageId: receipt.primaryBarcode || receipt.orderNumber
  };

  const seller = receipt.seller || receipt.sellers?.[0] || {
    brandName: 'STYLE STREET',
    shopName: 'Style Street Marketplace',
    pickupAddress: { street: '', city: '', state: '', pincode: '', country: 'India' }
  };

  const customer = receipt.customer || {};
  const shippingAddress = customer.shippingAddress || {};
  const isCOD = receipt.isCOD || receipt.paymentMethod === 'COD';
  const codAmount = receipt.codAmount || (isCOD ? receipt.pricing?.totalAmount || 0 : 0);

  // Format date
  const orderDateFormatted = receipt.orderDate
    ? new Date(receipt.orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  const barcodeValue = pkg.packageId || receipt.orderNumber;
  const trackingUrl = receipt.trackingQRUrl || `https://stylestreet.in/orders/${receipt.orderNumber}/track`;

  return (
    <div
      className={`shipping-label-container bg-white text-black font-sans mx-auto max-w-[700px] border-2 border-black rounded-lg p-5 shadow-sm print:border-2 print:border-black print:p-4 print:shadow-none print:max-w-none print:w-full ${className}`}
      style={{ color: '#000000', backgroundColor: '#ffffff' }}
    >
      {/* ── HEADER SECTION ────────────────────────────────────────────────── */}
      <div className="border-b-2 border-black pb-3 mb-3 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt={branding.brandName || 'Style Street'}
            className="w-12 h-12 object-contain filter grayscale contrast-200"
          />
          <div>
            <h1 className="brand-name text-xl font-black leading-none text-black">
              STYLE <span className="brand-accent">STREET</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B8860B] mt-0.5">
              Luxury Fashion Marketplace
            </p>
            <p className="text-[8px] tracking-wider text-black/70">E-Commerce Marketplace</p>
          </div>
        </div>

        {/* Centre: Payment Classification Badge */}
        <div className="text-center px-4 py-1.5 border-2 border-black rounded bg-black/5">
          <div className="text-[9px] uppercase font-mono font-bold tracking-widest text-black/70">
            Payment Mode
          </div>
          <div className={`text-base font-black tracking-wider ${isCOD ? 'text-red-700' : 'text-black'}`}>
            {isCOD ? 'CASH ON DELIVERY (COD)' : 'PREPAID — PAID'}
          </div>
          {isCOD && (
            <div className="text-[11px] font-bold text-black border-t border-black/30 mt-0.5 pt-0.5">
              Collect: ₹{Number(codAmount).toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {/* Right: Package Meta */}
        <div className="text-right">
          <div className="text-[9px] uppercase font-mono font-bold text-black/60">Package</div>
          <div className="text-xl font-mono font-black text-black">
            {pkg.packageNumber || '1/1'}
          </div>
          <div className="text-[10px] font-mono text-black/80 mt-0.5">
            Date: <span className="font-bold">{orderDateFormatted}</span>
          </div>
        </div>
      </div>

      {/* ── PRIMARY SCANNABLE BARCODE ──────────────────────────────────────── */}
      <div className="border border-black/40 rounded p-2 text-center bg-black/[0.02] mb-3">
        <BarcodeGenerator
          value={barcodeValue}
          height={48}
          width={1.9}
          displayValue={true}
          className="border-0 bg-transparent"
        />
        <div className="flex justify-between items-center text-[9px] font-mono text-black/60 px-2 mt-1">
          <span>ORDER REF: <strong>{receipt.orderNumber}</strong></span>
          <span>PKG ID: <strong>{pkg.packageId}</strong></span>
          <span>DISPATCH: <strong>STANDARD EXPRESS</strong></span>
        </div>
      </div>

      {/* ── SHIP TO & SOLD BY SECTION (2 COLUMNS) ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Left: SHIP TO (Customer Shipping Snapshot) */}
        <div className="border-2 border-black rounded p-3 bg-white">
          <div className="flex items-center justify-between border-b border-black/30 pb-1 mb-2">
            <span className="text-[11px] uppercase font-black tracking-wider text-black flex items-center gap-1">
              📍 SHIP TO (DELIVERY ADDRESS)
            </span>
            <span className="text-[9px] font-mono text-black/60 uppercase">Primary Destination</span>
          </div>
          <p className="text-base font-black text-black leading-tight mb-1">
            {customer.name || 'Customer'}
          </p>
          <div className="text-xs leading-relaxed text-black/90 font-medium space-y-0.5">
            <p>{shippingAddress.street || 'Address on file'}</p>
            <p>
              {shippingAddress.city && `${shippingAddress.city}, `}
              {shippingAddress.district && shippingAddress.district !== shippingAddress.city && `${shippingAddress.district}, `}
              {shippingAddress.state || ''}
            </p>
            <p className="font-mono font-black text-sm text-black tracking-wider">
              PIN: {shippingAddress.postalCode || 'N/A'}
            </p>
            <p className="text-[11px] text-black/80 uppercase">{shippingAddress.country || 'India'}</p>
          </div>
          {/* Masked Phone Number */}
          <div className="mt-2 pt-2 border-t border-black/20 flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-black/60">Customer Tel:</span>
            <span className="font-mono font-bold text-black bg-black/5 px-2 py-0.5 rounded border border-black/10">
              {customer.maskedPhone || 'Not Provided'}
            </span>
          </div>
        </div>

        {/* Right: SOLD BY (Approved Brand & Seller Info) */}
        <div className="border border-black/60 rounded p-3 bg-black/[0.02]">
          <div className="flex items-center justify-between border-b border-black/30 pb-1 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-black">
              🏢 SOLD BY / SHIPPED FROM
            </span>
            <span className="text-[9px] font-mono text-[#B8860B] font-bold">APPROVED BRAND</span>
          </div>
          <p className="text-sm font-black text-black uppercase tracking-wide">
            {seller.brandName || 'STYLE STREET'}
          </p>
          <p className="text-[11px] text-black/70 font-semibold mb-1">
            {seller.shopName || 'Style Street Merchant'}
          </p>

          {/* Seller Pickup Address */}
          <div className="text-[10px] text-black/80 leading-snug">
            <p className="font-semibold text-black/60 text-[9px] uppercase">Dispatch Origin:</p>
            <p>{seller.pickupAddress?.street || seller.pickupAddress?.address || 'Fulfilled via Style Street Hub'}</p>
            <p>
              {seller.pickupAddress?.city && `${seller.pickupAddress.city}, `}
              {seller.pickupAddress?.state || ''} - {seller.pickupAddress?.pincode || ''}
            </p>
          </div>

          {/* Verified GSTIN */}
          {seller.gstin && (
            <div className="mt-2 pt-1.5 border-t border-black/20 text-[10px] font-mono flex items-center justify-between">
              <span className="font-semibold text-black/60">Seller GSTIN:</span>
              <span className="font-black text-black bg-white px-1.5 py-0.5 border border-black/20 rounded">
                {seller.gstin}
              </span>
            </div>
          )}

          {/* Return Policy Notice */}
          <div className="mt-2 text-[8px] text-black/60 leading-tight">
            * Return within 7 days if tags intact. Inquiries: support@stylestreet.in
          </div>
        </div>
      </div>

      {/* ── PRODUCTS TABLE (TEXT ONLY — NO PRODUCT IMAGES) ────────────────── */}
      <div className="border border-black rounded overflow-hidden mb-3">
        <div className="bg-black text-white px-3 py-1.5 flex justify-between items-center text-[10px] uppercase font-mono font-bold tracking-wider">
          <span>Product Manifest (Contents)</span>
          <span>Text Verified — No Imagery</span>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black bg-black/5 text-[9px] uppercase font-bold tracking-wider text-black">
              <th className="py-1.5 px-3">Item Description</th>
              <th className="py-1.5 px-2">SKU</th>
              <th className="py-1.5 px-2">Variant</th>
              <th className="py-1.5 px-2 text-center">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20 font-medium">
            {(receipt.items || []).map((item, idx) => (
              <tr key={idx} className="hover:bg-black/[0.02]">
                <td className="py-2 px-3">
                  <div className="font-bold text-black">{item.name}</div>
                  {item.brand && (
                    <div className="text-[9px] text-[#B8860B] font-semibold uppercase tracking-wider">
                      Brand: {item.brand}
                    </div>
                  )}
                </td>
                <td className="py-2 px-2 font-mono text-[10px] font-bold text-black uppercase">
                  {item.sku || 'N/A'}
                </td>
                <td className="py-2 px-2 text-[10px] text-black/80">
                  {item.variantText || 'Standard'}
                </td>
                <td className="py-2 px-2 text-center font-mono font-black text-black">
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── LOGISTICS, QR CODE & HANDLING INSTRUCTIONS ─────────────────────── */}
      <div className="border-2 border-black rounded p-3 flex flex-col md:flex-row items-center justify-between gap-4 mb-3 bg-white">
        {/* Left: QR Code & Live Tracking */}
        <div className="flex items-center gap-3 shrink-0">
          <QRCodeGenerator value={trackingUrl} size={76} />
          <div className="text-[9px] font-mono leading-tight space-y-0.5">
            <p className="font-bold uppercase text-black text-[10px]">Secure Tracking</p>
            <p className="text-black/60">Scan with courier device</p>
            <p className="text-black/60">or smartphone camera</p>
            <p className="font-bold text-[#B8860B] pt-0.5">stylestreet.in/track</p>
          </div>
        </div>

        {/* Centre: Courier Information */}
        <div className="flex-1 text-center md:text-left border-t md:border-t-0 md:border-l border-black/20 md:pl-4">
          <div className="text-[9px] uppercase font-mono font-bold text-black/60">Courier Logistics</div>
          <div className="text-xs font-bold text-black uppercase tracking-wider">
            {pkg.courier || 'Style Street Express Delivery'}
          </div>
          {pkg.trackingNumber && (
            <div className="text-[10px] font-mono text-black mt-0.5">
              AWB: <strong className="font-black">{pkg.trackingNumber}</strong>
            </div>
          )}
          <div className="text-[9px] text-black/60 mt-1">
            Dispatch Mode: <strong>{pkg.deliveryMethod === 'delivery_partner' ? 'Logistics Partner' : 'Self Fulfillment'}</strong>
          </div>
        </div>

        {/* Right: Courier Handling Symbols */}
        <div className="shrink-0 flex items-center gap-2 border-t md:border-t-0 md:border-l border-black/20 md:pl-4 pt-2 md:pt-0">
          <div className="border border-black/40 rounded px-2 py-1 text-center text-[8px] font-bold uppercase bg-black/[0.02]">
            <span className="text-base block">☂️</span>
            KEEP DRY
          </div>
          <div className="border border-black/40 rounded px-2 py-1 text-center text-[8px] font-bold uppercase bg-black/[0.02]">
            <span className="text-base block">⚠️</span>
            HANDLE CARE
          </div>
          <div className="border border-black/40 rounded px-2 py-1 text-center text-[8px] font-bold uppercase bg-black/[0.02]">
            <span className="text-base block">⬆️</span>
            THIS SIDE UP
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div className="border-t border-black/30 pt-2 text-center text-[9px] text-black/70 flex justify-between items-center font-mono">
        <span>STYLE STREET LUXURY FASHION</span>
        <span className="font-serif italic text-black font-bold">Wear Your Story</span>
        <span>Order #{receipt.orderNumber}</span>
      </div>
    </div>
  );
}
