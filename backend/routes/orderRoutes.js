import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import * as orderController from '../controllers/orderController.js'
import { verifyRazorpayPayment } from '../controllers/paymentController.js'
import * as receiptController from '../controllers/receiptController.js'

const router = express.Router()

// Public verification route for scanned QR codes (Packing slips & Tax invoices)
router.get('/verify-document', asyncHandler(receiptController.verifyOrderDocument))

router.use(verifyToken)
router.post('/', asyncHandler(orderController.createOrder))
router.post('/verify-payment', asyncHandler(verifyRazorpayPayment))
router.get('/', asyncHandler(orderController.getOrders))
router.get('/:id', asyncHandler(orderController.getOrderById))
router.get('/:id/track', asyncHandler(orderController.trackOrder))
router.get('/:orderId/receipt', asyncHandler(receiptController.getCustomerOrderReceipt))
router.get('/:orderId/invoice-pdf', asyncHandler(receiptController.getCustomerTaxInvoicePdf))
router.put('/:id/cancel', asyncHandler(orderController.cancelOrder))
router.post('/:id/return', asyncHandler(orderController.requestReturn))
router.get('/:id/return-status', asyncHandler(orderController.getReturnStatus))

export default router
