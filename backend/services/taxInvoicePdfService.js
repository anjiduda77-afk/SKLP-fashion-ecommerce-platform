import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Number to Indian Words Converter for Invoice PDF
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
 * STYLE STREET — Production GST Tax Invoice PDF Generator
 * Official legal tax document with GST breakdown, HSN classification,
 * verified seller info, QR code audit verification, and digital signatory.
 *
 * @param {Object} receipt - Receipt payload from buildAdminReceiptPayload or buildSellerReceiptPayload
 * @param {Stream} res - Express response stream
 */
export async function generateTaxInvoicePdf(receipt, res) {
  const doc = new PDFDocument({
    margin: 36,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: `STYLE STREET Tax Invoice — ${receipt.invoiceNumber || receipt.orderNumber}`,
      Author: 'STYLE STREET Retail Marketplace',
      Subject: 'Official GST Tax Invoice and Delivery Challan',
      Keywords: 'Style Street, Tax Invoice, GST, Invoice, Fashion Marketplace'
    }
  });

  doc.pipe(res);

  const primaryGold = '#996515';
  const darkCharcoal = '#111827';
  const borderBlack = '#1F2937';
  const lightBg = '#F9FAFB';

  const seller = receipt.seller || receipt.sellers?.[0] || {
    brandName: 'STYLE STREET',
    shopName: 'Style Street Retail Private Limited',
    pickupAddress: { street: 'Madhapur', city: 'Hyderabad', state: 'Telangana', pincode: '500081', country: 'India' },
    gstin: '36AAAAA0000A1Z5'
  };

  const customer = receipt.customer || {};
  const shippingAddress = customer.shippingAddress || {};
  const pricing = receipt.pricing || {};

  const invoiceNumber = receipt.invoiceNumber || `INV-${receipt.orderNumber || '001'}`;
  const invoiceDateFormatted = receipt.invoiceDate
    ? new Date(receipt.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const orderDateFormatted = receipt.orderDate
    ? new Date(receipt.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : invoiceDateFormatted;

  const totalAmount = pricing.totalAmount || pricing.subtotal || 0;
  const totalInWords = numberToWords(totalAmount);

  // Tax breakdown
  const sellerState = (seller.pickupAddress?.state || 'Telangana').trim().toLowerCase();
  const customerState = (shippingAddress.state || 'Telangana').trim().toLowerCase();
  const isInterState = sellerState !== customerState;

  const gstRate = 5;
  const taxableBase = pricing.subtotal ? Math.round((pricing.subtotal / (1 + gstRate / 100)) * 100) / 100 : 0;
  const totalTax = pricing.taxAmount || Math.round((pricing.subtotal - taxableBase) * 100) / 100;
  const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igst = isInterState ? totalTax : 0;

  // Outer Page Border
  doc.rect(36, 36, 523, 770).lineWidth(1.2).stroke(borderBlack);

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.rect(36, 36, 523, 62).fillAndStroke('#F8FAFC', borderBlack);

  doc.fillColor(primaryGold).fontSize(16).font('Helvetica-Bold')
     .text('STYLE STREET', 48, 48);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('TAX INVOICE', 48, 68);
  doc.fillColor('#6B7280').fontSize(6.5).font('Helvetica')
     .text('Original for Recipient • Tax Invoice cum Delivery Challan', 48, 79);

  // Invoice identifiers (Right)
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text(`INVOICE NO:`, 360, 48, { align: 'right', width: 185 });
  doc.fillColor(primaryGold).fontSize(9).font('Helvetica-Bold')
     .text(invoiceNumber, 360, 58, { align: 'right', width: 185 });

  doc.fillColor('#374151').fontSize(7).font('Helvetica')
     .text(`Invoice Date: ${invoiceDateFormatted}`, 360, 71, { align: 'right', width: 185 })
     .text(`Order No: ${receipt.orderNumber}  |  Order Date: ${orderDateFormatted}`, 360, 81, { align: 'right', width: 185 });

  // ── 2 COLUMNS: SOLD BY & BILL TO / SHIP TO ──────────────────────────────────
  let y = 106;
  const colWidth = 250;

  // Left Column: SOLD BY (Supplier)
  doc.rect(46, y, colWidth, 105).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(46, y, colWidth, 16).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text('SOLD BY (SUPPLIER DETAILS)', 54, y + 4);

  let sellY = y + 22;
  doc.fillColor(primaryGold).fontSize(9.5).font('Helvetica-Bold')
     .text((seller.brandName || 'STYLE STREET').toUpperCase(), 54, sellY);
  sellY += 12;
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text(seller.shopName || 'Style Street Retail Private Limited', 54, sellY);
  sellY += 12;

  const pStreet = seller.pickupAddress?.street || 'Design District, Jubilee Hills';
  const pCityState = [seller.pickupAddress?.city, seller.pickupAddress?.state].filter(Boolean).join(', ');
  const pPin = seller.pickupAddress?.pincode ? `PIN: ${seller.pickupAddress.pincode}` : '';
  doc.fillColor('#4B5563').fontSize(7.5).font('Helvetica')
     .text(`${pStreet}, ${pCityState} ${pPin}`, 54, sellY, { width: 235, lineGap: 1.5 });
  sellY += 24;

  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text(`GSTIN: ${seller.gstin || '36AAAAA0000A1Z5'}  |  State: ${seller.pickupAddress?.state || 'Telangana'}`, 54, sellY);

  // Right Column: BILL TO & SHIP TO (Buyer)
  const rightX = 46 + colWidth + 11;
  doc.rect(rightX, y, colWidth, 105).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(rightX, y, colWidth, 16).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text('BILL TO & SHIP TO (BUYER DETAILS)', rightX + 8, y + 4);

  let custY = y + 22;
  doc.fillColor(darkCharcoal).fontSize(9.5).font('Helvetica-Bold')
     .text(customer.name || 'Valued Customer', rightX + 8, custY);
  custY += 14;

  const cStreet = shippingAddress.street || 'Address on record';
  const cCityState = [shippingAddress.city, shippingAddress.district, shippingAddress.state].filter(Boolean).join(', ');
  const cPin = shippingAddress.postalCode ? `PIN: ${shippingAddress.postalCode}` : '';
  doc.fillColor('#4B5563').fontSize(7.5).font('Helvetica')
     .text(`${cStreet}\n${cCityState} ${cPin}`, rightX + 8, custY, { width: 235, lineGap: 1.5 });
  custY += 28;

  const phoneText = customer.maskedPhone ? `Phone: ${customer.maskedPhone}` : '';
  const emailText = customer.email ? `Email: ${customer.email}` : '';
  doc.fillColor(darkCharcoal).fontSize(7).font('Helvetica')
     .text(`${phoneText}  ${emailText}  |  Place of Supply: ${shippingAddress.state || 'Telangana'}`, rightX + 8, custY);

  // ── ITEMIZED GOODS TABLE ────────────────────────────────────────────────────
  y = 219;
  doc.rect(46, y, 503, 18).fillAndStroke(darkCharcoal, darkCharcoal);
  doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
  doc.text('#', 52, y + 5);
  doc.text('Description of Goods', 70, y + 5);
  doc.text('HSN', 245, y + 5);
  doc.text('Qty', 285, y + 5, { align: 'center', width: 25 });
  doc.text('Unit Price', 315, y + 5, { align: 'right', width: 50 });
  doc.text('Taxable', 370, y + 5, { align: 'right', width: 50 });
  doc.text('GST Rate', 425, y + 5, { align: 'center', width: 45 });
  doc.text('Total (Rs.)', 475, y + 5, { align: 'right', width: 68 });

  y += 18;
  const items = receipt.items || [];
  items.forEach((item, idx) => {
    const isAlt = idx % 2 === 1;
    doc.rect(46, y, 503, 24).fillAndStroke(isAlt ? '#FAFAFA' : '#FFFFFF', '#E5E7EB');

    const unitPrice = item.finalPrice || item.price || 0;
    const qty = item.quantity || 1;
    const itemTotal = unitPrice * qty;
    const itemTaxable = Math.round((itemTotal / 1.05) * 100) / 100;
    const hsnCode = item.category === 'shoes' ? '6403' : item.category === 'accessories' ? '7113' : '6203';

    doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
       .text(String(idx + 1), 52, y + 5);

    doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
       .text(item.name || 'Apparel Item', 70, y + 4, { width: 170, ellipsis: true });

    const varText = item.variantText || [item.size ? `Size: ${item.size}` : '', item.color ? `Color: ${item.color}` : ''].filter(Boolean).join(' | ');
    if (varText) {
      doc.fillColor('#6B7280').fontSize(6).font('Helvetica')
         .text(varText, 70, y + 14, { width: 170, ellipsis: true });
    }

    doc.fillColor('#4B5563').fontSize(7).font('Courier')
       .text(hsnCode, 245, y + 7);

    doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
       .text(String(qty), 285, y + 7, { align: 'center', width: 25 });

    doc.fillColor('#374151').fontSize(7.5).font('Helvetica')
       .text(Number(unitPrice).toLocaleString('en-IN'), 315, y + 7, { align: 'right', width: 50 });

    doc.fillColor('#374151').fontSize(7.5).font('Helvetica')
       .text(Number(itemTaxable).toLocaleString('en-IN'), 370, y + 7, { align: 'right', width: 50 });

    doc.fillColor('#374151').fontSize(7).font('Helvetica')
       .text(`${gstRate}%`, 425, y + 7, { align: 'center', width: 45 });

    doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
       .text(Number(itemTotal).toLocaleString('en-IN'), 475, y + 7, { align: 'right', width: 68 });

    y += 24;
  });

  // ── TAX & TOTAL SUMMARY BOX ─────────────────────────────────────────────────
  y = Math.max(y + 8, 380);
  const sumWidth = 246;

  // Left side: GST Split & Amount in Words
  doc.rect(46, y, sumWidth, 105).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(46, y, sumWidth, 16).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text('TAX BREAKDOWN & STATUTORY SUMMARY', 54, y + 4);

  let taxY = y + 22;
  doc.fillColor('#374151').fontSize(7).font('Helvetica');
  doc.text('Taxable Value of Goods:', 54, taxY);
  doc.font('Helvetica-Bold').text(`Rs. ${taxableBase.toLocaleString('en-IN')}`, 210, taxY, { align: 'right', width: 75 });
  taxY += 12;

  if (isInterState) {
    doc.font('Helvetica').text('Integrated Tax (IGST 5%):', 54, taxY);
    doc.font('Helvetica-Bold').text(`Rs. ${igst.toLocaleString('en-IN')}`, 210, taxY, { align: 'right', width: 75 });
    taxY += 12;
  } else {
    doc.font('Helvetica').text('Central Tax (CGST 2.5%):', 54, taxY);
    doc.font('Helvetica-Bold').text(`Rs. ${cgst.toLocaleString('en-IN')}`, 210, taxY, { align: 'right', width: 75 });
    taxY += 12;
    doc.font('Helvetica').text('State Tax (SGST 2.5%):', 54, taxY);
    doc.font('Helvetica-Bold').text(`Rs. ${sgst.toLocaleString('en-IN')}`, 210, taxY, { align: 'right', width: 75 });
    taxY += 12;
  }

  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Total Tax Amount:', 54, taxY);
  doc.text(`Rs. ${totalTax.toLocaleString('en-IN')}`, 210, taxY, { align: 'right', width: 75 });
  taxY += 14;

  doc.fillColor('#4B5563').fontSize(6.5).font('Helvetica-Bold').text('Amount in Words:', 54, taxY);
  taxY += 8;
  doc.fillColor(darkCharcoal).fontSize(7).font('Helvetica-Bold')
     .text(totalInWords, 54, taxY, { width: 230 });

  // Right side: Grand Total Calculation
  const rightSumX = 46 + sumWidth + 11;
  doc.rect(rightSumX, y, sumWidth, 105).fillAndStroke('#FFFFFF', borderBlack);
  doc.rect(rightSumX, y, sumWidth, 16).fillAndStroke(lightBg, borderBlack);
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text('TOTAL CHARGES & PAYMENT SUMMARY', rightSumX + 8, y + 4);

  let py = y + 22;
  doc.fillColor('#374151').fontSize(7.5).font('Helvetica');
  doc.text('Subtotal:', rightSumX + 8, py);
  doc.text(`Rs. ${Number(pricing.subtotal || 0).toLocaleString('en-IN')}`, rightSumX + 150, py, { align: 'right', width: 90 });
  py += 12;

  if (pricing.couponDiscount > 0) {
    doc.fillColor('#047857').text('Promotional Discount:', rightSumX + 8, py);
    doc.text(`- Rs. ${Number(pricing.couponDiscount).toLocaleString('en-IN')}`, rightSumX + 150, py, { align: 'right', width: 90 });
    py += 12;
  }

  doc.fillColor('#374151').text('Delivery / Shipping Charges:', rightSumX + 8, py);
  doc.text(pricing.deliveryFee > 0 ? `Rs. ${Number(pricing.deliveryFee).toLocaleString('en-IN')}` : 'FREE (Rs. 0)', rightSumX + 150, py, { align: 'right', width: 90 });
  py += 14;

  // Grand Total Box
  doc.rect(rightSumX + 4, py, sumWidth - 8, 22).fillAndStroke(lightBg, primaryGold);
  doc.fillColor(darkCharcoal).fontSize(9).font('Helvetica-Bold')
     .text('GRAND TOTAL:', rightSumX + 12, py + 6);
  doc.fillColor(primaryGold).fontSize(11).font('Helvetica-Bold')
     .text(`Rs. ${Number(totalAmount).toLocaleString('en-IN')}`, rightSumX + 130, py + 5, { align: 'right', width: 100 });
  py += 26;

  // Payment Mode Badge
  const isCOD = receipt.isCOD || receipt.paymentMethod === 'COD';
  doc.fillColor('#4B5563').fontSize(7).font('Helvetica')
     .text(`Payment Mode: ${receipt.paymentMethod || (isCOD ? 'CASH ON DELIVERY' : 'ONLINE PREPAID')}`, rightSumX + 8, py)
     .text(`Status: ${isCOD ? 'COLLECT ON DELIVERY' : 'PAID IN FULL'}`, rightSumX + 130, py, { align: 'right', width: 110 });

  // ── AUDIT & DIGITAL VERIFICATION SECTION ─────────────────────────────────────
  y += 115;
  const qrBoxHeight = 85;
  doc.rect(46, y, 503, qrBoxHeight).fillAndStroke(lightBg, borderBlack);

  // Generate real QR code buffer
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/verify-receipt?order=${receipt.orderNumber}&invoice=${invoiceNumber}`;
  try {
    const qrBuffer = await QRCode.toBuffer(verificationUrl, { width: 140, margin: 1 });
    doc.image(qrBuffer, 54, y + 8, { width: 68, height: 68 });
  } catch (qrErr) {
    console.warn('QR code buffer generation error:', qrErr);
    doc.rect(54, y + 8, 68, 68).stroke('#D1D5DB');
  }

  // Verification Audit Text next to QR Code
  doc.fillColor(darkCharcoal).fontSize(8.5).font('Helvetica-Bold')
     .text('DIGITAL TAX VERIFICATION & STATUTORY COMPLIANCE', 132, y + 10);
  doc.fillColor('#374151').fontSize(7).font('Helvetica')
     .text(`This official invoice is recorded on the STYLE STREET Merchant Compliance Register.\nScan QR Code with any smartphone or barcode reader to verify invoice authenticity.\nVerification URL: ${verificationUrl}\nOrder Reference: ${receipt.orderNumber}  |  GSTIN Verification: VERIFIED ACTIVE`, 132, y + 23, { width: 250, lineGap: 2 });

  // Authorized Signatory Block (Right)
  doc.fillColor(darkCharcoal).fontSize(7.5).font('Helvetica-Bold')
     .text('AUTHORIZED SIGNATORY', 400, y + 10, { align: 'center', width: 140 });
  doc.font('Courier-Bold').fontSize(8).fillColor(primaryGold)
     .text('✓ DIGITALLY SIGNED', 400, y + 36, { align: 'center', width: 140 });
  doc.font('Helvetica').fontSize(6.5).fillColor('#6B7280')
     .text(`For ${seller.shopName || 'Style Street'}\nSystem Generated Document`, 400, y + 48, { align: 'center', width: 140 });

  // ── FOOTER STATUTORY NOTICE ─────────────────────────────────────────────────
  doc.fontSize(6).font('Helvetica').fillColor('#9CA3AF')
     .text('STYLE STREET Marketplace • Tax Invoice generated under Section 31 of CGST Act, 2017 • E-Commerce Fulfilment Platform', 36, 792, { align: 'center', width: 523 });

  doc.end();
}
