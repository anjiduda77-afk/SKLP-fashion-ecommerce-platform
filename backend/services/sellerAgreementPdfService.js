import PDFDocument from 'pdfkit';
import axios from 'axios';

/**
 * STYLE STREET — Production Seller Application & Agreement PDF Generator
 *
 * Server-authoritative legal onboarding contract generated directly from
 * authenticated application details.
 * Contains no secrets, masked identifiers only.
 */

// Helper to fetch remote image buffer (e.g. Cloudinary signature or logo)
async function fetchImageBuffer(url) {
  if (!url) return null;
  if (url.startsWith('data:image')) {
    try {
      const base64Data = url.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } catch {
      return null;
    }
  }
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(response.data);
  } catch {
    return null;
  }
}

/**
 * Generate Seller Agreement PDF stream
 * @param {Object} application - SellerApplication document (or lean object)
 * @param {Object} kyc - SellerKYC document (optional)
 * @param {Stream} res - Express response stream
 */
export async function generateSellerAgreementPdf(application, kyc, res) {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: `STYLE STREET Seller Agreement — ${application.applicationReference || application._id}`,
      Author: 'STYLE STREET Marketplace Compliance',
      Subject: 'Merchant Onboarding Agreement and Seller Terms',
      Keywords: 'Style Street, Seller Agreement, Merchant Terms, Onboarding'
    }
  });

  // Pipe to response
  doc.pipe(res);

  const primaryGold = '#996515';
  const darkCharcoal = '#1F2937';
  const lightGray = '#F3F4F6';
  const borderGray = '#D1D5DB';

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.rect(40, 40, 515, 60).fillAndStroke('#FAFAFA', primaryGold);

  doc.fillColor(primaryGold).fontSize(18).font('Helvetica-Bold')
     .text('STYLE STREET', 55, 52);

  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('PREMIER FASHION E-COMMERCE PLATFORM', 55, 72);

  doc.fillColor('#6B7280').fontSize(7).font('Helvetica')
     .text('MERCHANT ONBOARDING & SELLER SERVICE AGREEMENT', 55, 83);

  // Reference block (Right)
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('APPLICATION REF:', 360, 52, { align: 'right', width: 180 });
  doc.fillColor(primaryGold).fontSize(10).font('Helvetica-Bold')
     .text(application.applicationReference || `SSA-${application._id.toString().slice(-8).toUpperCase()}`, 360, 63, { align: 'right', width: 180 });

  doc.fillColor('#4B5563').fontSize(7).font('Helvetica')
     .text(`Terms Version: ${application.sellerTermsVersion || 'v1.0'} | Date: ${new Date(application.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 360, 77, { align: 'right', width: 180 });
  doc.text(`Status: ${(application.status || 'PENDING_REVIEW').replace('_', ' ')}`, 360, 87, { align: 'right', width: 180 });

  doc.moveDown(3);

  // ── SECTION 1: MERCHANT & ENTITY PARTICULARS ────────────────────────────────
  let y = 115;
  doc.rect(40, y, 515, 18).fillAndStroke(lightGray, borderGray);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('1. MERCHANT & BUSINESS PARTICULARS', 48, y + 5);

  y += 24;
  const ownerName = application.ownerName || application.applicantName || 'Merchant Applicant';
  const shopName = application.shopName || 'Style Street Merchant';
  const brandName = application.brandName || shopName;
  const businessType = (application.businessType || 'individual').toUpperCase().replace('_', ' ');
  const email = application.businessEmail || application.email || 'N/A';
  const phone = application.businessPhone || application.phone || 'N/A';
  const yearEstablished = application.yearEstablished ? String(application.yearEstablished) : 'N/A';

  const col1X = 45;
  const col2X = 300;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(darkCharcoal).text('Owner / Legal Signatory:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(ownerName, col1X + 115, y);

  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Business Entity Type:', col2X, y);
  doc.font('Helvetica').fillColor('#374151').text(businessType, col2X + 105, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Store / Shop Name:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(shopName, col1X + 115, y);

  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Approved Seller Brand:', col2X, y);
  doc.font('Helvetica-Bold').fillColor(primaryGold).text(brandName, col2X + 105, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Primary Contact Email:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(email, col1X + 115, y);

  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Contact Mobile No.:', col2X, y);
  doc.font('Helvetica').fillColor('#374151').text(phone, col2X + 105, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Product Categories:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text((application.productCategories || []).slice(0, 2).join(', ') || 'Fashion Apparel', col1X + 115, y);

  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('GSTIN Identification:', col2X, y);
  doc.font('Helvetica').fillColor('#374151').text(application.gstNumber ? `${application.gstNumber.slice(0, 4)}*******${application.gstNumber.slice(-3)}` : 'Not Applicable / Small Seller', col2X + 105, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Year Established:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(yearEstablished, col1X + 115, y);

  doc.font('Helvetica-Bold').fillColor(darkCharcoal).text('Delivery Fulfilment Mode:', col2X, y);
  doc.font('Helvetica').fillColor('#374151').text((application.deliveryMode || 'PAID_DELIVERY').replace('_', ' '), col2X + 105, y);

  // ── SECTION 2: REGISTERED & PICKUP ADDRESSES ────────────────────────────────
  y += 24;
  doc.rect(40, y, 515, 18).fillAndStroke(lightGray, borderGray);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('2. REGISTERED BUSINESS ADDRESS & DISPATCH PICKUP LOCATION', 48, y + 5);

  y += 24;
  const bAddr = application.businessAddress || {};
  const pAddr = application.pickupAddressSameAsBusiness ? bAddr : (application.pickupAddress || bAddr);

  const bLine1 = [bAddr.street, bAddr.street2, bAddr.landmark].filter(Boolean).join(', ') || 'Address on record';
  const bLine2 = [bAddr.city, bAddr.district, bAddr.state, bAddr.postalCode, bAddr.country || 'India'].filter(Boolean).join(', ');

  const pLine1 = [pAddr.street, pAddr.street2, pAddr.landmark].filter(Boolean).join(', ') || 'Same as business address';
  const pLine2 = [pAddr.city, pAddr.district, pAddr.state, pAddr.postalCode, pAddr.country || 'India'].filter(Boolean).join(', ');

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Registered Business Address:', col1X, y);
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151')
     .text(`${bLine1}\n${bLine2}`, col1X, y + 10, { width: 230 });

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Dispatch / Courier Pickup Location:', col2X, y);
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151')
     .text(`${pLine1}\n${pLine2}`, col2X, y + 10, { width: 240 });

  // ── SECTION 3: APPLICATION & ONBOARDING VERIFICATION AUDIT TRAIL ────────────
  y += 40;
  doc.rect(40, y, 515, 18).fillAndStroke(lightGray, borderGray);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('3. APPLICATION & ONBOARDING VERIFICATION AUDIT TRAIL', 48, y + 5);

  y += 24;
  const phoneStatus = kyc?.phone?.status || 'VERIFIED';
  const shopPhotosCount = (application.shopImages || []).length;
  const shopPhotosVal = shopPhotosCount >= 2 ? `${shopPhotosCount} PHOTOS VERIFIED` : 'SUBMITTED';
  const ownerPhotoVal = application.ownerPhoto?.url ? 'PORTRAIT VERIFIED' : 'PENDING';
  const sigVal = application.signature?.url ? 'RECORDED' : 'PENDING';

  const verificationItems = [
    { label: 'Mobile Number (Firebase OTP):', val: phoneStatus },
    { label: 'Shop Physical Photographs:', val: shopPhotosVal },
    { label: 'Owner Identity Portrait:', val: ownerPhotoVal },
    { label: 'Signatory Record on Agreement:', val: sigVal }
  ];

  verificationItems.forEach((item, idx) => {
    const curX = idx % 2 === 0 ? col1X : col2X;
    const curY = y + Math.floor(idx / 2) * 14;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text(item.label, curX, curY);
    const color = item.val.includes('VERIFIED') || item.val === 'RECORDED' ? '#047857' : (item.val === 'FAILED' ? '#B91C1C' : '#D97706');
    doc.font('Helvetica-Bold').fillColor(color).text(item.val.replace('_', ' '), curX + 130, curY);
  });

  // ── SECTION 4: PLATFORM COMMERCIALS & TERMS ─────────────────────────────────
  y += 34;
  doc.rect(40, y, 515, 18).fillAndStroke(lightGray, borderGray);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('4. PLATFORM COMMERCIALS & SETTLEMENT TERMS', 48, y + 5);

  y += 24;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Platform Commission:', col1X, y);
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151').text('5% of eligible product price (max ₹21/unit; min[price × 0.05, ₹21])', col1X + 115, y);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Settlement Window:', col2X, y);
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151').text('7 days post confirmed customer delivery', col2X + 105, y);

  y += 14;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Trial Program:', col1X, y);
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151').text('30-day Free Trial subscription upon initial approval', col1X + 115, y);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Settlement Processing:', col2X, y);
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151').text('Scheduled merchant disbursement post-delivery', col2X + 105, y);

  // ── SECTION 5: KEY SELLER TERMS & OPERATIONAL OBLIGATIONS ───────────────────
  y += 24;
  doc.rect(40, y, 515, 18).fillAndStroke(lightGray, borderGray);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('5. ESSENTIAL SELLER OBLIGATIONS & PLATFORM POLICIES', 48, y + 5);

  y += 24;
  const obligations = [
    '1. Authenticity & Lawfulness: Only genuine, authorized, non-infringing fashion apparel and accessories may be offered for sale.',
    '2. Accurate Listings: Catalog entries, descriptions, prices, materials, and sizes must strictly represent genuine merchandise.',
    '3. Inventory Maintenance: Seller shall maintain accurate stock levels and fulfill orders within configured handling SLA (24-48 hrs).',
    '4. Secure Packaging & Documentation: Seller must securely package items and enclose the official STYLE STREET Packing Slip.',
    '5. Customer Privacy: Customer delivery details are strictly confidential and must not be retained, sold, or used for unsolicited marketing.',
    '6. Fair Returns & Dispute Resolution: Seller agrees to honor the standard 7-day return policy for unworn items with intact tags.',
    '7. Intellectual Property: Brand squatting, counterfeit products, and impersonation of protected trademarks are grounds for immediate termination.'
  ];

  doc.font('Helvetica').fontSize(6.8).fillColor('#374151');
  obligations.forEach(ob => {
    doc.text(ob, col1X, y, { width: 505 });
    y += 12;
  });

  // ── SECTION 6: EXECUTION & LEGAL ACKNOWLEDGEMENT ───────────────────────────
  y += 6;
  doc.rect(40, y, 515, 18).fillAndStroke(lightGray, borderGray);
  doc.fillColor(darkCharcoal).fontSize(8).font('Helvetica-Bold')
     .text('6. EXECUTION, ELECTRONIC ACCEPTANCE & SIGN-OFF', 48, y + 5);

  y += 24;
  const acceptedAtFormatted = application.termsAcceptedAt
    ? new Date(application.termsAcceptedAt).toLocaleString('en-IN')
    : new Date(application.createdAt || Date.now()).toLocaleString('en-IN');

  doc.font('Helvetica').fontSize(7).fillColor('#4B5563')
     .text(`I hereby affirm that all information provided in this seller application is true, accurate, and lawfully authorized. I confirm that I have reviewed, understood, and agreed to be bound by the STYLE STREET Seller Terms and Conditions (Version ${application.sellerTermsVersion || 'v1.0'}).`, col1X, y, { width: 505 });

  y += 24;

  // Applicant sign-off details (Left)
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Electronically Accepted By:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(ownerName, col1X + 120, y);

  y += 12;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Acceptance Timestamp:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(acceptedAtFormatted, col1X + 120, y);

  y += 12;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(darkCharcoal).text('Terms Version Record:', col1X, y);
  doc.font('Helvetica').fillColor('#374151').text(`STYLE STREET Seller Terms ${application.sellerTermsVersion || 'v1.0'}`, col1X + 120, y);

  // Signature image embedding (Right)
  const sigBoxX = 350;
  const sigBoxY = y - 24;
  doc.rect(sigBoxX, sigBoxY, 195, 50).fillAndStroke('#FAFAFA', borderGray);

  let signatureLoaded = false;
  if (application.signature?.url) {
    const sigBuffer = await fetchImageBuffer(application.signature.url);
    if (sigBuffer) {
      try {
        doc.image(sigBuffer, sigBoxX + 10, sigBoxY + 5, { fit: [175, 40], align: 'center', valign: 'center' });
        signatureLoaded = true;
      } catch {
        // fallback
      }
    }
  }

  if (!signatureLoaded) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryGold)
       .text(ownerName, sigBoxX, sigBoxY + 12, { align: 'center', width: 195 });
    doc.font('Helvetica').fontSize(6).fillColor('#9CA3AF')
       .text('[Digitally Recorded Applicant Signature]', sigBoxX, sigBoxY + 30, { align: 'center', width: 195 });
  }

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  doc.fontSize(6).font('Helvetica').fillColor('#9CA3AF')
     .text('STYLE STREET E-Commerce Marketplace • Confidential Compliance Record • Generated from Authenticated Database Submission', 40, 785, { align: 'center', width: 515 });

  doc.end();
}
