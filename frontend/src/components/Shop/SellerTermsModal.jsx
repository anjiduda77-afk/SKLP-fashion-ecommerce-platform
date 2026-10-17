import { FiX, FiShield, FiCheck } from 'react-icons/fi'

/**
 * STYLE STREET — Official Seller Terms & Conditions Modal
 * Covers all 24 statutory e-commerce marketplace clauses.
 */
export default function SellerTermsModal({ isOpen, onClose, isDarkMode, onAccept, accepted }) {
  if (!isOpen) return null

  const cardBg = isDarkMode ? 'bg-[#18181b] border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600'
  const headerBg = isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col ${cardBg}`}>
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <FiShield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">STYLE STREET Seller Terms & Conditions</h2>
              <p className="text-xs text-amber-500 font-medium">Agreement Version 1.0 (Effective 2026)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/10 transition-colors text-gray-400 hover:text-gray-200"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
            Please carefully review the STYLE STREET Merchant Agreement before accepting. Acceptance creates a binding legal framework governing your merchant store operations on STYLE STREET.
          </div>

          {/* Section 1 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">1. ELIGIBILITY</h3>
            <p className={textSecondary}>
              To qualify as a merchant, you must be a legally registered business or sole proprietor capable of entering into binding contracts under Indian law. All information and identification documents provided must be accurate, current, and genuine.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">2. SELLER INFORMATION</h3>
            <p className={textSecondary}>
              Sellers are solely responsible for maintaining up-to-date business records, contact details, dispatch pickup addresses, bank accounts, and tax registrations. Providing misleading or false information may lead to account review, restriction, or suspension.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">3. PRODUCT AUTHENTICITY</h3>
            <p className={textSecondary}>
              Only authentic, lawful, and original fashion merchandise may be listed. Counterfeit, replica, stolen, or unauthorized branded items are strictly prohibited. The merchant guarantees full legal authorization to retail listed items.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">4. PRODUCT LISTING ACCURACY</h3>
            <p className={textSecondary}>
              Product titles, descriptions, materials, colors, sizes, variant attributes, and care instructions must strictly represent the actual merchandise. Deliberate misrepresentation constitutes a material violation.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">5. PRODUCT IMAGES</h3>
            <p className={textSecondary}>
              Merchants must own the rights or hold proper licenses for all uploaded catalog photographs. Images must clearly and honestly portray the product without deceptive filters or unrelated imagery.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">6. INVENTORY</h3>
            <p className={textSecondary}>
              Merchants must maintain accurate stock quantities in the Seller Hub. Accepting orders for out-of-stock items or frequent order cancellations will adversely affect merchant fulfillment scores.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">7. PRICING</h3>
            <p className={textSecondary}>
              Merchants are solely responsible for setting lawful retail prices, inclusive of applicable goods and services taxes. Artificially inflating base prices to fabricate deceptive discounts is strictly prohibited.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">8. ORDER ACCEPTANCE AND PROCESSING</h3>
            <p className={textSecondary}>
              Orders must be confirmed, packed, and marked ready for dispatch within the platform SLA (standard 24 to 48 hours). Repeated unfulfilled orders will trigger an operational review.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">9. PACKAGING</h3>
            <p className={textSecondary}>
              Merchants are responsible for secure, durable packaging to prevent transit damage. Fragile items must include adequate protective material. Each shipment must be securely sealed and have the generated STYLE STREET Packing Slip attached externally. Including third-party marketing inserts or another customer's invoice is strictly prohibited.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">10. SHIPPING AND DELIVERY</h3>
            <p className={textSecondary}>
              Fulfilment must follow the approved delivery method (Platform Delivery Partner or Authorised Self-Delivery). Status updates must accurately reflect the real physical status of the parcel.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">11. CUSTOMER INFORMATION</h3>
            <p className={textSecondary}>
              Customer delivery information provided for order fulfillment is strictly confidential. Merchants must never retain, sell, rent, or use customer phone numbers or addresses for unsolicited marketing or unauthorized communication.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">12. RETURNS, REFUNDS AND CANCELLATIONS</h3>
            <p className={textSecondary}>
              Merchants agree to honor the platform's standard 7-day return policy for eligible unworn apparel with intact tags. Merchants must cooperate promptly with customer return inspections and dispute resolutions.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">13. PRODUCT QUALITY</h3>
            <p className={textSecondary}>
              Merchandise must meet acceptable consumer quality standards. Supplying defective, stained, torn, or used goods will result in immediate customer refund liability and merchant penalty points.
            </p>
          </section>

          {/* Section 14 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">14. PROHIBITED PRODUCTS</h3>
            <p className={textSecondary}>
              Listing hazardous items, regulated substances, offensive material, or items restricted under Indian penal and e-commerce regulations is strictly prohibited and results in immediate termination.
            </p>
          </section>

          {/* Section 15 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">15. INTELLECTUAL PROPERTY</h3>
            <p className={textSecondary}>
              Merchants must respect registered trademarks, industrial designs, copyrights, and brand identities. Creating confusingly similar brand names or unauthorized replicas of designer collections will trigger brand squatting protections.
            </p>
          </section>

          {/* Section 16 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">16. PLATFORM FEES & COMMISSION</h3>
            <p className={textSecondary}>
              STYLE STREET charges a transparent, flat platform fee of <strong>5%</strong> on successfully fulfilled orders. New approved merchants receive a <strong>30-Day Free Trial</strong> with zero subscription charge. Applicable fee schedules are visible in the merchant dashboard.
            </p>
          </section>

          {/* Section 17 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">17. PAYMENTS AND SETTLEMENTS</h3>
            <p className={textSecondary}>
              Order payouts are calculated based on net product sales minus applicable commission and verified customer returns. Payouts are credited to the verified merchant bank account within <strong>7 days</strong> following confirmed delivery.
            </p>
          </section>

          {/* Section 18 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">18. TAX RESPONSIBILITY</h3>
            <p className={textSecondary}>
              Merchants are solely responsible for declaring, collecting, and remitting GST and other statutory taxes. Invoices generated on the platform utilize verified seller tax numbers (GSTIN/PAN).
            </p>
          </section>

          {/* Section 19 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">19. FRAUD PREVENTION</h3>
            <p className={textSecondary}>
              Self-ordering, artificial review inflation, delivery manipulation, fake documents, or payment collusion will result in immediate escrow freeze, account termination, and legal reporting.
            </p>
          </section>

          {/* Section 20 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">20. ACCOUNT SUSPENSION / TERMINATION</h3>
            <p className={textSecondary}>
              STYLE STREET reserves the right to review, limit, suspend, or terminate seller privileges for repeated policy breaches, customer complaints, or fraudulent activities. Detailed audit records are preserved.
            </p>
          </section>

          {/* Section 21 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">21. PRIVACY AND SECURITY</h3>
            <p className={textSecondary}>
              Merchants must maintain strict password and account security. Merchants must never solicit customer passwords, OTPs, or payment credentials.
            </p>
          </section>

          {/* Section 22 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">22. DISPUTE RESOLUTION</h3>
            <p className={textSecondary}>
              Merchants agree to participate in good faith in platform dispute mediation for customer complaints. The platform's compliance determination on verified return claims is final.
            </p>
          </section>

          {/* Section 23 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">23. AMENDMENTS TO TERMS</h3>
            <p className={textSecondary}>
              STYLE STREET may revise seller terms with appropriate prior notification. Material revisions require re-acceptance before continued listing access.
            </p>
          </section>

          {/* Section 24 */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-sm text-amber-500">24. CONTACT & SUPPORT</h3>
            <p className={textSecondary}>
              For merchant compliance queries, onboarding assistance, or dispute escalations, contact STYLE STREET Merchant Support at <span className="font-semibold text-amber-500">support@stylestreet.in</span>.
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between ${headerBg}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border ${isDarkMode ? 'border-gray-700 hover:bg-white/5' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            Close
          </button>
          {onAccept && (
            <button
              onClick={() => {
                onAccept()
                onClose()
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors flex items-center gap-1.5"
            >
              <FiCheck /> {accepted ? 'Terms Accepted' : 'Agree to Terms'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
