import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * STYLE STREET — Production Packing Slip / Shipping Label PDF Generator
 * Courier-ready, print-friendly, text-only product representation (NO PRODUCT IMAGES).
 * Strictly contains only the authenticated seller's suborder items.
 */
export async function generatePackingSlipPdf(receipt, selectedPkgIndex = 0, res) {
  const doc = new PDFDocument({
    margin: 36,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: `STYLE STREET Packing Slip — ${receipt.orderNumber}`,
      Author: 'STYLE STREET Logistics Fulfilment',
      Subject: 'Courier Shipping Label and Manifest'
    }
  });

  doc.pipe(res);

  const primaryGold = '#996515';
  const darkCharcoal = '#111827';
  const borderBlack = '#1F2937';
  const lightBg = '#F9FAFB';

  const pkg = receipt.packages?.[selectedPkgIndex] || receipt.packages?.[0] || {
    packageNumber: '1/1',
    packageId: receipt.primaryBarcode || receipt.orderNumber
  };

  const seller = receipt.seller || receipt.sellers?.[0] || {
    brandName: 'STYLE STREET',
    shopName: 'Style Street Partner',
    pickupAddress: { street: '', city: '', state: '', pincode: '', country: 'India' }
  };

  const customer = receipt.customer || {};
  const shippingAddress = customer.shippingAddress || {};
  const isCOD = receipt.isCOD || receipt.paymentMethod === 'COD';
  const codAmount = receipt.codAmount || (isCOD ? receipt.pricing?.totalAmount || 0 : 0);

  const orderDateFormatted = receipt.orderDate
    ? new Date(receipt.orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  // Outer border
  doc.rect(36, 36, 523, 770).lineWidth(1.5).stroke(borderBlack);

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.rect(36, 36, 523, 65).fillAndStroke('#F3F4F6', borderBlack);

  doc.fillColor(primaryGold).fontSize(16).font('Helvetica-Bold')
     .text('STYLE STREET', 48, 48);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('PACKING SLIP / SHIPPING LABEL', 48, 68);
  doc.fillColor('#4B5563').fontSize(7).font('Helvetica')
     .text('Authorised Merchant Dispatch Manifest', 48, 80);

  // Payment Badge (Center)
  doc.rect(220, 46, 175, 45).fillAndStroke('#FFFFFF', borderBlack);
  doc.fillColor('#6B7280').fontSize(7).font('Helvetica-Bold')
     .text('PAYMENT CLASSIFICATION', 225, 52, { align: 'center', width: 165 });
  const paymentText = isCOD ? 'CASH ON DELIVERY (COD)' : 'PREPAID — ORDER PAID';
  doc.fillColor(isCOD ? '#B91C1C' : '#047857').fontSize(9).font('Helvetica-Bold')
     .text(paymentText, 225, 63, { align: 'center', width: 165 });
  if (isCOD) {
    doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
       .text(`COLLECT: Rs. ${Number(codAmount).toLocaleString('en-IN')}`, 225, 75, { align: 'center', width: 165 });
  }

  // Package & Date (Right)
  doc.fillColor(darkCharcoal).fontSize(7).font('Helvetica-Bold')
     .text('PACKAGE:', 410, 48, { align: 'right', width: 135 });
  doc.fillColor(primaryGold).fontSize(12).font('Helvetica-Bold')
     .text(pkg.packageNumber || '1/1', 410, 58, { align: 'right', width: 135 });
  doc.fillColor('#4B5563').fontSize(7).font('Helvetica')
     .text(`Date: ${orderDateFormatted}`, 410, 74, { align: 'right', width: 135 });
  doc.text(`Ref: ${receipt.orderNumber}`, 410, 84, { align: 'right', width: 135 });

  // ── IDENTIFIERS / BARCODE BAR ───────────────────────────────────────────────
  let y = 110;
  doc.rect(46, y, 503, 35).fillAndStroke(lightBg, '#9CA3AF');
  doc.fillColor(darkCharcoal).fontSize(9).font('Courier-Bold')
     .text(`||||| | |||| ||| ||||||| | ||||| | ||||| ${pkg.packageId || receipt.orderNumber} ||||||||`, 50, y + 8, { align: 'center', width: 495 });
  doc.fillColor('#4B5563').fontSize(7).font('Helvetica')
     .text(`PKG ID: ${pkg.packageId || receipt.orderNumber}  •  ORDER REF: ${receipt.orderNumber}  •  DISPATCH: STANDARD EXPRESS`, 50, y + 23, { align: 'center', width: 495 });

  // ── SHIP TO & SOLD BY (2 COLUMNS) ──────────────────────────────────────────
  y = 155;
  const colWidth = 246;

  // Left: SHIP TO
  doc.rect(46, y, colWidth, 125).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(46, y, colWidth, 18).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('DELIVERY DESTINATION (SHIP TO)', 54, y + 5);

  let custY = y + 25;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(darkCharcoal)
     .text(customer.name || 'Valued Customer', 54, custY);
  custY += 15;

  const streetStr = shippingAddress.street || 'Address on record';
  const locStr = [shippingAddress.city, shippingAddress.district, shippingAddress.state].filter(Boolean).join(', ');
  const pinStr = `PIN: ${shippingAddress.postalCode || 'N/A'}`;

  doc.font('Helvetica').fontSize(8).fillColor('#374151')
     .text(`${streetStr}\n${locStr}\n${pinStr}\n${shippingAddress.country || 'India'}`, 54, custY, { width: 230, lineGap: 2 });

  doc.rect(46, y + 105, colWidth, 20).fillAndStroke(lightBg, borderBlack);
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#4B5563').text('Contact Tel:', 54, y + 111);
  doc.font('Courier-Bold').fontSize(8).fillColor(darkCharcoal).text(customer.maskedPhone || 'Not Provided', 115, y + 110);

  // Right: SOLD BY / DISPATCH ORIGIN
  const rightX = 46 + colWidth + 11;
  doc.rect(rightX, y, colWidth, 125).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(rightX, y, colWidth, 18).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('DISPATCH ORIGIN (SOLD BY)', rightX + 8, y + 5);

  let sellY = y + 25;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryGold)
     .text((seller.brandName || 'STYLE STREET').toUpperCase(), rightX + 8, sellY);
  sellY += 13;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(darkCharcoal)
     .text(seller.shopName || 'Style Street Merchant', rightX + 8, sellY);
  sellY += 14;

  const pStreet = seller.pickupAddress?.street || seller.pickupAddress?.address || 'Fulfilled via Style Street Logistics Hub';
  const pCityState = [seller.pickupAddress?.city, seller.pickupAddress?.state].filter(Boolean).join(', ');
  const pPin = seller.pickupAddress?.pincode ? `PIN: ${seller.pickupAddress.pincode}` : '';

  doc.font('Helvetica').fontSize(7.5).fillColor('#374151')
     .text(`${pStreet}\n${pCityState} ${pPin}`, rightX + 8, sellY, { width: 230, lineGap: 2 });

  if (seller.gstin) {
    doc.rect(rightX, y + 105, colWidth, 20).fillAndStroke(lightBg, borderBlack);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#4B5563').text('Seller GSTIN:', rightX + 8, y + 111);
    doc.font('Courier-Bold').fontSize(8).fillColor(darkCharcoal).text(seller.gstin, rightX + 75, y + 110);
  } else {
    doc.rect(rightX, y + 105, colWidth, 20).fillAndStroke(lightBg, borderBlack);
    doc.font('Helvetica').fontSize(7).fillColor('#6B7280').text('Standard Merchant Fulfilment', rightX + 8, y + 111);
  }

  // ── PRODUCT MANIFEST TABLE (TEXT ONLY — NO PRODUCT IMAGES) ──────────────────
  y = 290;
  doc.rect(46, y, 503, 20).fillAndStroke(darkCharcoal, darkCharcoal);
  doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
     .text('PACKAGE CONTENTS (TEXT ONLY — NO PRODUCT IMAGES)', 54, y + 6);
  doc.text('VERIFIED ITEM MANIFEST', 410, y + 6, { align: 'right', width: 130 });

  y += 20;
  doc.rect(46, y, 503, 16).fillAndStroke('#E5E7EB', borderBlack);
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold');
  doc.text('Item Description', 54, y + 4);
  doc.text('SKU', 260, y + 4);
  doc.text('Variant / Size / Color', 355, y + 4);
  doc.text('Qty', 495, y + 4, { align: 'center', width: 45 });

  y += 16;
  const items = receipt.items || [];
  items.forEach((item, idx) => {
    const isAlt = idx % 2 === 1;
    doc.rect(46, y, 503, 22).fillAndStroke(isAlt ? '#FAFAFA' : '#FFFFFF', '#E5E7EB');

    doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
       .text(item.name || 'Fashion Apparel', 54, y + 4, { width: 200, ellipsis: true });
    if (item.brand) {
      doc.fillColor(primaryGold).fontSize(6.5).font('Helvetica')
         .text(`Brand: ${item.brand}`, 54, y + 13);
    }

    doc.fillColor(darkCharcoal).fontSize(7.5).font('Courier-Bold')
       .text(item.sku || 'N/A', 260, y + 7);

    const variantStr = item.variantText || [item.size ? `Size: ${item.size}` : '', item.color ? `Color: ${item.color}` : ''].filter(Boolean).join(' | ') || 'Standard';
    doc.fillColor('#374151').fontSize(7).font('Helvetica')
       .text(variantStr, 355, y + 7, { width: 135, ellipsis: true });

    doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
       .text(String(item.quantity || 1), 495, y + 7, { align: 'center', width: 45 });

    y += 22;
  });

  // Total Item Count row
  doc.rect(46, y, 503, 18).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('TOTAL ARTICLES IN THIS SHIPMENT:', 54, y + 5);
  const totalQty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  doc.text(String(totalQty), 495, y + 5, { align: 'center', width: 45 });

  // ── HANDLING & COURIER COMPLIANCE ───────────────────────────────────────────
  y += 28;
  doc.rect(46, y, 503, 50).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(46, y, 503, 15).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text('SPECIAL HANDLING INSTRUCTIONS & CARRIER ADVISORY', 54, y + 4);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#B91C1C')
     .text('FRAGILE  •  KEEP DRY  •  HANDLE WITH CARE  •  THIS SIDE UP', 54, y + 22, { align: 'center', width: 490 });
  doc.font('Helvetica').fontSize(6.5).fillColor('#6B7280')
     .text('Deliver parcel to authorized recipient only. Do not leave parcel unattended. Secure packaging inspected prior to handoff.', 54, y + 36, { align: 'center', width: 490 });

  // ── TRACKING QR CODE BLOCK ──────────────────────────────────────────────────
  y += 58;
  const qrBoxHeight = 72;
  doc.rect(46, y, 503, qrBoxHeight).fillAndStroke(lightBg, borderBlack);
  const trackUrl = receipt.trackingQRUrl || `${process.env.FRONTEND_URL || 'http://localhost:5174'}/verify-receipt?order=${receipt.orderNumber}&invoice=${receipt.invoiceNumber || 'INV-' + receipt.orderNumber}`;
  try {
    const qrBuffer = await QRCode.toBuffer(trackUrl, { width: 130, margin: 1 });
    doc.image(qrBuffer, 54, y + 6, { width: 60, height: 60 });
  } catch (qrErr) {
    console.warn('QR code buffer generation error:', qrErr);
    doc.rect(54, y + 6, 60, 60).stroke('#D1D5DB');
  }
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('DIGITAL AUDIT & DISPATCH CONFIRMATION', 124, y + 10);
  doc.fillColor('#4B5563').fontSize(7).font('Helvetica')
     .text(`Package Tracking & Verification: ${trackUrl}\nAuthorised Merchant: ${seller.brandName || seller.shopName}\nEnclose in transparent shipping pouch on parcel exterior. Validated for courier pickup.`, 124, y + 24, { width: 415, lineGap: 2 });

  // Footer inside box
  doc.fontSize(6).font('Helvetica').fillColor('#9CA3AF')
     .text('STYLE STREET Logistics • Secure Courier Packing Document • Generated in compliance with E-Commerce Fulfilment Standards', 36, 792, { align: 'center', width: 523 });

  doc.end();
}
