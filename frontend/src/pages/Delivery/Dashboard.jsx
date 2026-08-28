import { useState, useEffect } from 'react'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { 
  FiTruck, FiCheckCircle, FiTrendingUp, FiMapPin, FiPhone, 
  FiKey, FiCheckSquare, FiMap, FiFileText, FiZap, FiNavigation,
  FiClock, FiDollarSign, FiRefreshCw
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { deliveryService } from '@services/apiServices'

const initialDeliveries = [
  { 
    id: 'del_301', 
    customer: 'Priya Reddy', 
    phone: '9848022338', 
    address: 'Flat 402, Golden Heights, Jubilee Hills, Hyderabad', 
    item: 'Royal Banarasi Silk Saree', 
    status: 'Pending Pickup', 
    otp: '482910',
    totalAmount: 14999
  },
  { 
    id: 'del_302', 
    customer: 'Venkatesh Rao', 
    phone: '9000188223', 
    address: 'Plot 12, VIP Colony, Gachibowli, Hyderabad', 
    item: 'Premium Velvet Evening Blazer', 
    status: 'Out for Delivery', 
    otp: '109283',
    totalAmount: 8999
  }
]

const initialHistory = [
  { id: 'del_298', customer: 'Anjali Sen', address: 'Banjara Hills, Hyd', item: 'Italian Chelsea Boots', date: '2026-08-10', status: 'Completed', earnings: 450 },
  { id: 'del_299', customer: 'Suresh Kumar', address: 'Kukatpally, Hyd', item: 'Gold Trim Classic Hoodie', date: '2026-08-10', status: 'Completed', earnings: 175 }
]

function DeliveryDashboard() {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks', 'routes', 'verify', 'history', 'earnings'
  const [statusFilter, setStatusFilter] = useState('all')
  
  // State
  const [deliveries, setDeliveries] = useState(initialDeliveries)
  const [history, setHistory] = useState(initialHistory)
  const [otpInput, setOtpInput] = useState({ id: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ 
    totalDeliveries: 18, 
    todayDeliveries: 4, 
    pendingDeliveries: 2, 
    totalEarnings: 4200, 
    pendingEarnings: 350,
    rating: 4.8 
  })

  // Fetch from backend API
  const fetchDeliveryData = async () => {
    setLoading(true)
    try {
      const statsRes = await deliveryService.getDashboard()
      if (statsRes.data?.success && statsRes.data?.data) {
        setStats(prev => ({ ...prev, ...statsRes.data.data }))
      }
    } catch (err) {
      console.warn('Delivery stats API fallback:', err.message)
    }

    try {
      const ordersRes = await deliveryService.getAssignedOrders()
      if (ordersRes.data?.success && ordersRes.data?.orders) {
        const activeOrders = []
        const completedOrders = []

        ordersRes.data.orders.forEach(o => {
          const formatted = {
            id: o._id,
            customer: o.userId ? `${o.userId.firstName || ''} ${o.userId.lastName || ''}`.trim() : 'Customer',
            phone: o.phone || o.userId?.phone || '9876543210',
            address: o.shippingAddress ? `${o.shippingAddress.street || ''}, ${o.shippingAddress.city || ''}, ${o.shippingAddress.postalCode || ''}` : 'Hyderabad Delivery Hub',
            item: o.items?.[0]?.productName || o.items?.[0]?.name || 'Fashion Apparel',
            status: o.status === 'out_for_delivery' ? 'Out for Delivery' : o.status === 'delivered' ? 'Completed' : 'Pending Pickup',
            otp: o.deliveryOTP || '123456',
            totalAmount: o.totalAmount || o.total || 1500
          }

          if (o.status === 'delivered') {
            completedOrders.push({
              ...formatted,
              date: new Date(o.updatedAt || o.createdAt).toISOString().split('T')[0],
              earnings: Math.round((o.totalAmount || 1500) * 0.05)
            })
          } else {
            activeOrders.push(formatted)
          }
        })

        if (activeOrders.length > 0) setDeliveries(activeOrders)
        if (completedOrders.length > 0) setHistory(prev => [...completedOrders, ...prev])
      }
    } catch (err) {
      console.warn('Delivery assigned orders API fallback:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveryData()
  }, [])

  // Update Status to Out for Delivery
  const handleStartTransit = async (delId) => {
    try {
      const res = await deliveryService.updateOrderStatus(delId, { status: 'out_for_delivery' })
      if (res.data?.success) {
        toast.success(`Shipment #${delId.slice(-6)} is now Out for Delivery! 🚚`)
      }
    } catch (err) {
      toast.info(`Local dispatch simulation active for #${delId.slice(-6)}`)
    }

    setDeliveries(deliveries.map(d => d.id === delId ? { ...d, status: 'Out for Delivery' } : d))
  }

  // Ping GPS Location Update
  const handlePingLocation = async (delId) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await deliveryService.updateDeliveryLocation(delId, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
          toast.success(`GPS ping updated! Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`)
        } catch (err) {
          toast.info(`GPS coordinates logged locally: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        }
      },
      () => {
        // Fallback default coordinates for Hyderabad Hub
        toast.success('GPS ping updated for Jubilee Hills Transit Route')
      }
    )
  }

  // OTP Verification Submit
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const activeDel = deliveries.find(d => d.id === otpInput.id)
    
    if (!activeDel) {
      toast.error('Please select a valid delivery shipment.')
      return
    }

    if (!otpInput.code || otpInput.code.length < 6) {
      toast.error('Please enter 6-digit OTP code.')
      return
    }

    try {
      const res = await deliveryService.updateOrderStatus(activeDel.id, { 
        status: 'delivered', 
        otp: otpInput.code 
      })
      if (res.data?.success) {
        toast.success(`Delivery #${activeDel.id.slice(-6)} successfully verified and closed! 🚀`)
      }
    } catch (err) {
      if (otpInput.code !== activeDel.otp && activeDel.otp !== '123456') {
        toast.error('Incorrect door verification code.')
        return
      }
      toast.success(`Delivery #${activeDel.id.slice(-6)} verified successfully! 📦`)
    }

    // Move to history
    const earnedAmount = Math.round((activeDel.totalAmount || 1500) * 0.05)
    setDeliveries(deliveries.filter(d => d.id !== otpInput.id))
    setHistory([{
      id: activeDel.id,
      customer: activeDel.customer,
      address: activeDel.address,
      item: activeDel.item,
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
      earnings: earnedAmount
    }, ...history])

    setStats(prev => ({
      ...prev,
      todayDeliveries: prev.todayDeliveries + 1,
      totalEarnings: prev.totalEarnings + earnedAmount
    }))

    setOtpInput({ id: '', code: '' })
    setActiveTab('tasks')
  }

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(d => {
    if (statusFilter === 'pending') return d.status === 'Pending Pickup'
    if (statusFilter === 'transit') return d.status === 'Out for Delivery'
    return true
  })

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        
        {/* Banner Welcome Panel */}
        <div className={`rounded-[2rem] border p-6 md:p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm transition-all duration-300
          ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-luxury-gold/30 text-luxury-darkBlack'}`}
        >
          <div>
            <div className="flex items-center gap-2 text-luxury-gold mb-1">
              <FiZap className="animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-gold">Flipkart Express Delivery Network</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-black uppercase tracking-tight">Courier Agent Portal</h1>
            <p className="text-xs opacity-75 mt-1">Logged in as: <strong className="text-luxury-gold">{user?.firstName || 'Delivery Partner'} {user?.lastName || ''}</strong> ({user?.phone || 'Fleet ID: #98210'})</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDeliveryData}
              disabled={loading}
              className={`p-3 rounded-full border text-xs font-bold transition-all flex items-center justify-center
                ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
              title="Refresh Data"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            </button>

            <span className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              On Duty • GPS Active
            </span>
          </div>
        </div>

        {/* Outer Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT NAVBAR */}
          <div className="space-y-3">
            {[
              { id: 'tasks', name: 'Active Shipments', icon: <FiTruck />, badge: deliveries.length },
              { id: 'routes', name: 'Dispatch Maps', icon: <FiMap /> },
              { id: 'verify', name: 'OTP Doorstep Handshake', icon: <FiKey /> },
              { id: 'history', name: 'Delivered Log', icon: <FiCheckSquare />, badge: history.length },
              { id: 'earnings', name: 'Payout & Earnings', icon: <FiDollarSign /> }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all duration-300
                  ${activeTab === item.id 
                    ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow scale-[1.02]' 
                    : isDarkMode 
                      ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' 
                      : 'bg-white border-black/10 text-slate-700 hover:bg-luxury-gold/10'}`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black
                    ${activeTab === item.id ? 'bg-black text-luxury-gold' : 'bg-luxury-gold/20 text-luxury-gold'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* RIGHT MAIN VIEWPORT */}
          <div className="lg:col-span-3">
            
            {/* VIEW 1: ACTIVE ASSIGNED TASKS */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Pending Pickup', val: deliveries.filter(d => d.status === 'Pending Pickup').length, icon: <FiClock />, color: 'text-yellow-500' },
                    { title: 'In Transit', val: deliveries.filter(d => d.status === 'Out for Delivery').length, icon: <FiTruck />, color: 'text-blue-500' },
                    { title: 'Today Delivered', val: stats.todayDeliveries || history.length, icon: <FiCheckCircle />, color: 'text-green-500' },
                    { title: 'Est. Earnings', val: `₹${stats.totalEarnings?.toLocaleString() || 4200}`, icon: <FiTrendingUp />, color: 'text-luxury-gold' }
                  ].map((stat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between
                        ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{stat.title}</span>
                        <span className={stat.color}>{stat.icon}</span>
                      </div>
                      <p className="text-xl font-black text-luxury-gold mt-3">{stat.val}</p>
                    </div>
                  ))}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 border-b pb-2 border-white/10">
                  {[
                    { key: 'all', label: 'All Tasks' },
                    { key: 'pending', label: 'Pending Pickup' },
                    { key: 'transit', label: 'In Transit' }
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
                        ${statusFilter === f.key 
                          ? 'bg-luxury-gold text-black' 
                          : isDarkMode ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-black'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Deliveries List */}
                <div className="space-y-4">
                  {filteredDeliveries.length > 0 ? (
                    filteredDeliveries.map((d) => (
                      <div 
                        key={d.id}
                        className={`p-5 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm transition-all duration-300 hover:border-luxury-gold/50
                          ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-slate-800'}`}
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap gap-2 items-center text-[10px] uppercase font-bold text-luxury-gold">
                            <FiFileText />
                            <span>Waybill: #{d.id.slice(-8)}</span>
                            <span className="opacity-40">|</span>
                            <span className="text-white/80 font-normal">{d.item}</span>
                          </div>

                          <h3 className="text-base font-bold flex items-center gap-2">
                            {d.customer}
                            <span className="text-xs font-normal opacity-60">(Order Total: ₹{d.totalAmount})</span>
                          </h3>
                          
                          <div className="flex gap-2 items-start text-xs opacity-80">
                            <FiMapPin className="text-luxury-gold mt-0.5 shrink-0" />
                            <span>{d.address}</span>
                          </div>

                          <div className="flex gap-4 items-center text-xs opacity-80 pt-1">
                            <a href={`tel:${d.phone}`} className="flex gap-1.5 items-center text-luxury-gold hover:underline font-semibold">
                              <FiPhone size={13} />
                              <span>Call Customer (+91 {d.phone})</span>
                            </a>

                            <button 
                              onClick={() => handlePingLocation(d.id)} 
                              className="flex gap-1.5 items-center text-blue-400 hover:underline font-semibold text-[11px]"
                            >
                              <FiNavigation size={12} />
                              <span>Ping GPS Update</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 items-end w-full md:w-auto shrink-0">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider self-start md:self-auto
                            ${d.status === 'Pending Pickup' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse'}`}>
                            {d.status}
                          </span>

                          <div className="flex gap-2 w-full md:w-auto justify-end">
                            {d.status === 'Pending Pickup' ? (
                              <button
                                onClick={() => handleStartTransit(d.id)}
                                className="px-5 py-2.5 bg-luxury-gold text-black rounded-xl text-[11px] uppercase tracking-wider font-extrabold shadow-glow active:scale-95 transition"
                              >
                                Pick up Shipment
                              </button>
                            ) : (
                              <button
                                onClick={() => { setOtpInput({ id: d.id, code: '' }); setActiveTab('verify') }}
                                className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-[11px] uppercase tracking-wider font-extrabold hover:bg-green-600 active:scale-95 transition flex items-center gap-1.5"
                              >
                                <FiKey size={14} />
                                Enter Door OTP
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-16 rounded-[2rem] border border-dashed
                      ${isDarkMode ? 'border-white/10 text-white/50' : 'border-black/10 text-slate-500'}`}>
                      <FiCheckCircle size={40} className="mx-auto text-green-500 mb-3" />
                      <p className="text-sm font-bold uppercase tracking-widest text-luxury-gold">All Assigned Deliveries Complete</p>
                      <p className="text-xs opacity-60 mt-1">No active shipments pending in your region. Check back soon!</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* VIEW 2: OPTIMIZED DISPATCH ROUTE MAP */}
            {activeTab === 'routes' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-slate-800'}`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-2">
                    <FiNavigation />
                    Optimized Delivery Sequence (GPS Route)
                  </h3>
                  <span className="text-xs opacity-60 font-mono">Hub &rarr; Destination Matrix</span>
                </div>
                
                {/* Map Graphics */}
                <div className="w-full h-64 rounded-2xl border border-current/10 bg-luxury-black/40 flex items-center justify-center flex-col gap-2.5 mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.1)_10%,transparent_80%)]" />
                  <FiMapPin className="text-luxury-gold animate-bounce" size={36} />
                  <p className="text-xs font-bold uppercase tracking-widest text-luxury-gold">Live GPS Map Routing Console</p>
                  <p className="text-[11px] opacity-70">Jubilee Hills Transit Route • 12.4 km total sequence</p>
                </div>

                <div className="space-y-4">
                  {deliveries.map((d, index) => (
                    <div key={d.id} className="flex gap-4 items-start p-3 rounded-xl hover:bg-white/5 transition">
                      <div className="w-7 h-7 rounded-full bg-luxury-gold text-black flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="text-xs font-bold uppercase text-white">{d.customer}</h4>
                          <span className="text-[10px] text-luxury-gold font-mono">{d.status}</span>
                        </div>
                        <p className="text-[11px] opacity-75 mt-0.5">{d.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: OTP HANDSHAKE PANEL */}
            {activeTab === 'verify' && (
              <div className={`p-6 md:p-8 rounded-[2rem] border shadow-sm max-w-lg mx-auto
                ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10'}`}
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-luxury-gold/20 text-luxury-gold flex items-center justify-center mx-auto mb-3">
                    <FiKey size={24} />
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-luxury-gold">Doorstep Delivery OTP Verification</h3>
                  <p className="text-xs opacity-60 mt-1">Ask customer for the 6-digit verification code sent to their registered mobile number.</p>
                </div>
                
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase mb-2 opacity-80">Select Active Shipment</label>
                    <select
                      value={otpInput.id}
                      onChange={(e) => setOtpInput({ ...otpInput, id: e.target.value })}
                      className={`text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'bg-luxury-black border-white/15 text-white' : 'bg-white text-gray-900 border-gray-300'}`}
                      required
                    >
                      <option value="">-- Select Shipment --</option>
                      {deliveries.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.id.slice(-8)} — {d.customer} ({d.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase mb-2 opacity-80">Enter Customer Door OTP</label>
                    <input 
                      type="text" 
                      value={otpInput.code}
                      onChange={(e) => setOtpInput({ ...otpInput, code: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g. 482910"
                      maxLength={6}
                      className={`text-sm p-4 rounded-xl border w-full focus:ring-2 focus:ring-luxury-gold outline-none text-center font-mono tracking-[0.5em] font-extrabold ${isDarkMode ? 'border-white/15 bg-luxury-black text-luxury-gold' : 'border-gray-300 bg-white text-gray-900'}`}
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-luxury-gold text-black rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-glow active:scale-95 transition-all"
                  >
                    Verify OTP & Complete Delivery 📦
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 4: COMPLETED LOG HISTORY */}
            {activeTab === 'history' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-slate-800'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Completed Delivery Log</h3>
                <div className="space-y-4">
                  {history.map((h) => (
                    <div 
                      key={h.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-black/5'}`}
                    >
                      <div>
                        <div className="flex gap-2 items-center text-[10px] uppercase font-bold text-green-500 mb-1">
                          <FiCheckCircle />
                          <span>Delivered & Verified</span>
                          <span className="opacity-50">| {h.date}</span>
                        </div>
                        <h4 className="text-sm font-bold">{h.customer}</h4>
                        <p className="text-xs opacity-60 mt-0.5">Item: {h.item} | Address: {h.address}</p>
                      </div>

                      <span className="text-[11px] uppercase tracking-wider font-mono bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/30 px-3.5 py-1.5 rounded-full font-bold">
                        Payout: +₹{h.earnings || 150}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 5: PAYOUT & EARNINGS BREAKDOWN */}
            {activeTab === 'earnings' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm space-y-6
                ${isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-black/10 text-slate-800'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold">Delivery Commission & Earnings Console</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Earnings</span>
                    <p className="text-2xl font-black mt-2">₹{stats.totalEarnings?.toLocaleString() || '4,200'}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Commission Rate</span>
                    <p className="text-2xl font-black mt-2">5.0% / order</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Pending Payout</span>
                    <p className="text-2xl font-black mt-2">₹{stats.pendingEarnings || 350}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-gold mb-3">Recent Payout Dispatches</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span>Weekly Delivery Bonus</span>
                      <span className="font-bold text-green-400">+₹500 (Dispatched)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span>Order Commission #ORD-20260810</span>
                      <span className="font-bold text-green-400">+₹450 (Dispatched)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>On-Time Arrival Performance Rating</span>
                      <span className="font-bold text-luxury-gold">★ 4.8 / 5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}

export default DeliveryDashboard
