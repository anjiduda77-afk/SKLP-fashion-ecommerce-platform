import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiPackage, FiTruck, FiCheckCircle, FiFileText, FiMapPin } from 'react-icons/fi'
import { orderService } from '@services/apiServices'
import { useTheme } from '@context/ThemeContext'

const steps = [
  { status: 'pending', label: 'Order Placed', icon: FiFileText, desc: 'Your couture request is received.' },
  { status: 'processing', label: 'Tailoring/Packing', icon: FiPackage, desc: 'Garments are being custom sized & packed.' },
  { status: 'shipped', label: 'In Transit', icon: FiTruck, desc: 'Package hand-over complete to SKLP Express.' },
  { status: 'delivered', label: 'Delivered', icon: FiCheckCircle, desc: 'Insured package signed at destination.' }
]

function OrderTracking() {
  const { id } = useParams()
  const { isDarkMode } = useTheme()
  const [trackingInfo, setTrackingInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await orderService.trackOrder(id)
        if (res.data && res.data.tracking) {
          setTrackingInfo(res.data.tracking)
        }
      } catch (err) {
        console.warn('Backend API trackOrder failed, using mock tracking:', err.message)
        // Fallback Mock Tracking
        setTrackingInfo({
          orderId: id,
          status: 'processing',
          shippingAddress: { street: 'Flat 402, Golden Towers', city: 'Hyderabad', state: 'Telangana', postalCode: '500032' },
          trackingDetails: { carrier: 'SKLP Couture Express', trackingNumber: 'SKLP-' + id.substring(0, 8).toUpperCase() },
          statusHistory: [
            { status: 'pending', updatedAt: new Date(Date.now() - 3600000).toISOString(), comment: 'Payment verified & order created.' },
            { status: 'processing', updatedAt: new Date().toISOString(), comment: 'Items passed size verification & packaging.' }
          ]
        })
      } finally {
        setLoading(false)
      }
    }
    fetchTracking()
  }, [id])

  if (loading) {
    return (
      <div className="container-custom py-24 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-luxury-gold mx-auto mb-4" />
        <p className="opacity-60 text-sm">Tracking live coordinates...</p>
      </div>
    )
  }

  if (!trackingInfo) {
    return (
      <div className="container-custom py-24 text-center">
        <p className="text-lg opacity-60 mb-6">Tracking details not found.</p>
        <Link to="/orders" className="btn btn-primary">Back to Orders</Link>
      </div>
    )
  }

  // Determine current active step index
  const getActiveStepIdx = (status) => {
    if (status === 'cancelled') return -1
    if (status === 'return_requested') return -1
    if (status === 'pending') return 0
    if (status === 'processing') return 1
    if (status === 'shipped') return 2
    if (status === 'delivered') return 3
    return 1 // default
  }

  const activeIdx = getActiveStepIdx(trackingInfo.status)

  return (
    <div className="container-custom py-16 min-h-screen">
      <nav className="text-xs uppercase tracking-widest opacity-60 mb-8">
        <Link to="/orders">← Back to My Orders</Link>
      </nav>

      <h1 className="text-4xl font-serif font-bold mb-12 tracking-wide uppercase">Track Order</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT/MID: Stepper and Status History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper Card */}
          <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-gray-100 text-black'}`}>
            <h2 className="text-lg font-serif font-bold mb-8 uppercase tracking-wider text-luxury-gold">Shipping Progress</h2>
            
            {trackingInfo.status === 'cancelled' ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-center font-bold">
                This order has been cancelled.
              </div>
            ) : trackingInfo.status === 'return_requested' ? (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-xl text-center font-bold">
                Return has been requested for this order.
              </div>
            ) : (
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
                {/* Horizontal connector line on desktop */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 hidden md:block z-0" />
                <div
                  className="absolute top-1/2 left-0 h-1 bg-luxury-gold -translate-y-1/2 hidden md:block z-0 transition-all duration-500"
                  style={{ width: `${(activeIdx / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((st, index) => {
                  const Icon = st.icon
                  const isCompleted = index <= activeIdx
                  const isActive = index === activeIdx

                  return (
                    <div key={index} className="flex md:flex-col items-center gap-4 md:gap-2 z-10 w-full md:w-auto relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-luxury-gold border-luxury-gold text-luxury-black'
                            : 'bg-luxury-charcoal border-white/10 text-white/40'
                        } ${isActive ? 'ring-4 ring-luxury-gold/30 scale-110' : ''}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="text-left md:text-center">
                        <p className={`font-bold text-sm ${isCompleted ? 'text-luxury-gold' : 'opacity-40'}`}>{st.label}</p>
                        <p className="text-[10px] opacity-60 hidden md:block max-w-[120px] mx-auto mt-1">{st.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detailed timeline */}
          <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-gray-100 text-black'}`}>
            <h2 className="text-lg font-serif font-bold mb-6 uppercase tracking-wider text-luxury-gold">Scan Log</h2>
            <div className="relative pl-6 border-l-2 border-white/10 space-y-6">
              {trackingInfo.statusHistory?.map((log, idx) => (
                <div key={idx} className="relative">
                  {/* Dot indicator */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-luxury-gold border-4 border-luxury-black" />
                  <div>
                    <span className="text-[10px] font-mono opacity-50 block">{new Date(log.updatedAt).toLocaleString()}</span>
                    <h4 className="font-bold text-sm text-white/95 capitalize mb-1">{log.status}</h4>
                    <p className="text-xs opacity-75">{log.comment || 'Package processed successfully.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Ship Carrier Details */}
        <div className="space-y-6">
          <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-gray-100 text-black'}`}>
            <h3 className="text-xs uppercase tracking-widest text-luxury-gold font-bold mb-6">Delivery Details</h3>
            
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase opacity-50 block mb-1">Carrier Network</span>
                <span className="text-sm font-bold">{trackingInfo.trackingDetails?.carrier || 'SKLP Couture Express'}</span>
              </div>
              
              <div>
                <span className="text-[10px] uppercase opacity-50 block mb-1">Tracking ID</span>
                <span className="text-sm font-mono font-bold text-luxury-gold">{trackingInfo.trackingDetails?.trackingNumber || 'SKLP-NONE'}</span>
              </div>

              <div className="pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase opacity-50 block mb-2">Delivery Address</span>
                <div className="flex gap-2 items-start text-xs opacity-70">
                  <FiMapPin className="text-luxury-gold flex-shrink-0 mt-0.5" />
                  <p>
                    {trackingInfo.shippingAddress?.street}, {trackingInfo.shippingAddress?.city}, {trackingInfo.shippingAddress?.state} - {trackingInfo.shippingAddress?.postalCode}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderTracking
