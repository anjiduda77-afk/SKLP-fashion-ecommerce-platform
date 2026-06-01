import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { 
  FiTruck, FiCheckCircle, FiTrendingUp, FiMapPin, FiPhone, 
  FiKey, FiClock, FiCheckSquare, FiMap, FiFileText, FiSearch, FiZap
} from 'react-icons/fi'
import { toast } from 'react-toastify'

const initialDeliveries = [
  { id: 'del_301', customer: 'Priya Reddy', phone: '9848022338', address: 'Flat 402, Golden Heights, Jubilee Hills, Hyderabad', item: 'Royal Banarasi Silk Saree', status: 'Pending Pickup', otp: '482910' },
  { id: 'del_302', customer: 'Venkatesh Rao', phone: '9000188223', address: 'Plot 12, VIP Colony, Gachibowli, Hyderabad', item: 'Premium Velvet Evening Blazer', status: 'Out for Delivery', otp: '109283' }
]

const initialHistory = [
  { id: 'del_298', customer: 'Anjali Sen', address: 'Banjara Hills, Hyd', item: 'Italian Chelsea Boots', date: '2026-05-24', status: 'Completed' },
  { id: 'del_299', customer: 'Suresh Kumar', address: 'Kukatpally, Hyd', item: 'Gold Trim Classic Hoodie', date: '2026-05-24', status: 'Completed' }
]

function DeliveryDashboard() {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks', 'routes', 'verify', 'history'
  
  // Local state
  const [deliveries, setDeliveries] = useState(initialDeliveries)
  const [history, setHistory] = useState(initialHistory)
  const [otpInput, setOtpInput] = useState({ id: 'del_302', code: '' })

  // Update Status to Out for Delivery
  const handleStartTransit = (delId) => {
    setDeliveries(deliveries.map(d => d.id === delId ? { ...d, status: 'Out for Delivery' } : d))
    toast.success(`Shipment #${delId} is marked as Out for Delivery!`)
  }

  // OTP Verification Submit
  const handleVerifyOTP = (e) => {
    e.preventDefault()
    const activeDel = deliveries.find(d => d.id === otpInput.id)
    
    if (!activeDel) {
      toast.error('Invalid delivery shipment reference.')
      return
    }

    if (otpInput.code !== activeDel.otp) {
      toast.error(' door verification code is incorrect.')
      return
    }

    // Success: Remove from pending and move to completed history
    setDeliveries(deliveries.filter(d => d.id !== otpInput.id))
    setHistory([{
      id: activeDel.id,
      customer: activeDel.customer,
      address: activeDel.address.split(',')[2] || activeDel.address,
      item: activeDel.item,
      date: new Date().toISOString().split('T')[0],
      status: 'Completed'
    }, ...history])

    setOtpInput({ id: '', code: '' })
    toast.success(`Delivery #${activeDel.id} successfully verified and closed! 🚚`)
    setActiveTab('tasks')
  }

  return (
    <div className="min-h-screen py-10">
      <div className="container-custom">
        
        {/* Banner Welcome Panel */}
        <div className={`rounded-[2rem] border p-6 md:p-8 mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm
          ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-luxury-gold/25 text-luxury-darkBlack'}`}
        >
          <div>
            <div className="flex items-center gap-2 text-luxury-gold mb-1">
              <FiZap className="animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-gold">SKLP Logistics Node</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-black uppercase">Courier Dispatch Console</h1>
            <p className="text-xs opacity-70 mt-1">Hello, <strong>{user?.firstName || 'Delivery Partner'}</strong>. Ready for custom couture dispatches.</p>
          </div>

          <div className="flex gap-2">
            <span className="px-4 py-2 bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 rounded-full text-xs font-bold uppercase tracking-wider">
              Fleet Status: Active
            </span>
          </div>
        </div>

        {/* Outer Tab Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT NAVBAR */}
          <div className="space-y-3">
            {[
              { id: 'tasks', name: 'Assigned Shipments', icon: <FiTruck /> },
              { id: 'routes', name: 'Optimized Routes', icon: <FiMap /> },
              { id: 'verify', name: 'OTP Handshake', icon: <FiKey /> },
              { id: 'history', name: 'Delivery Log', icon: <FiCheckSquare /> }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all duration-300
                  ${activeTab === item.id 
                    ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow scale-[1.02]' 
                    : isDarkMode 
                      ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' 
                      : 'bg-white border-black/5 text-slate-700 hover:bg-luxury-gold/10'}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {/* RIGHT VIEWPORT */}
          <div className="lg:col-span-3">
            
            {/* VIEW 1: ASSIGNED TASKS */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                
                {/* Stats Panel */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { title: 'Pending Shipments', val: deliveries.length, icon: <FiTruck />, color: 'text-yellow-500' },
                    { title: 'Completed Today', val: history.length, icon: <FiCheckCircle />, color: 'text-green-500' },
                    { title: 'Est. Earnings', val: `₹${(history.length * 150).toLocaleString()}`, icon: <FiTrendingUp />, color: 'text-luxury-gold' }
                  ].map((stat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between
                        ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">{stat.title}</span>
                      <p className="text-lg font-bold text-luxury-gold mt-2">{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {deliveries.length > 0 ? (
                    deliveries.map((d) => (
                      <div 
                        key={d.id}
                        className={`p-5 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm
                          ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
                      >
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center text-[10px] uppercase font-bold text-luxury-gold">
                            <FiFileText />
                            <span>Shipment #{d.id}</span>
                            <span className="opacity-50">| {d.item}</span>
                          </div>

                          <h3 className="text-sm font-bold">{d.customer}</h3>
                          
                          <div className="flex gap-2 items-start text-xs opacity-75">
                            <FiMapPin className="text-luxury-gold mt-0.5 shrink-0" />
                            <span>{d.address}</span>
                          </div>

                          <div className="flex gap-2 items-center text-xs opacity-75">
                            <FiPhone className="text-luxury-gold shrink-0" />
                            <span>+91 {d.phone}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 items-end w-full md:w-auto">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold self-start md:self-auto
                            ${d.status === 'Pending Pickup' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500 animate-pulse'}`}>
                            {d.status}
                          </span>

                          <div className="flex gap-2 w-full md:w-auto justify-end">
                            {d.status === 'Pending Pickup' ? (
                              <button
                                onClick={() => handleStartTransit(d.id)}
                                className="px-4 py-2 bg-luxury-gold text-black rounded-lg text-[10px] uppercase tracking-wider font-extrabold shadow-glow active:scale-95 transition"
                              >
                                Pick up Shipment
                              </button>
                            ) : (
                              <button
                                onClick={() => { setOtpInput({ id: d.id, code: '' }); setActiveTab('verify') }}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-[10px] uppercase tracking-wider font-extrabold hover:bg-green-600 active:scale-95 transition"
                              >
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
                      <p className="text-sm font-bold uppercase tracking-widest text-luxury-gold">All Deliveries Dispatched</p>
                      <p className="text-xs opacity-60">You are clear for the day! Enjoy your break.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* VIEW 2: OPTIMIZED ROUTE MAPS */}
            {activeTab === 'routes' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Optimized Dispatch Sequence</h3>
                
                {/* Mock map graphic */}
                <div className="w-full h-56 rounded-2xl border border-current/10 bg-current/5 flex items-center justify-center flex-col gap-2.5 mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.06)_10%,transparent_80%)]" />
                  <FiMapPin className="text-luxury-gold animate-bounce" size={32} />
                  <p className="text-xs font-bold uppercase tracking-widest">Interactive Dispatch Map</p>
                  <p className="text-[10px] opacity-60">GPS optimized routing enabled</p>
                </div>

                <div className="space-y-4">
                  {deliveries.map((d, index) => (
                    <div key={d.id} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase">{d.customer} <span className="text-[10px] opacity-50 lowercase tracking-normal">({d.item})</span></h4>
                        <p className="text-[11px] opacity-75 mt-0.5">{d.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: OTP HANDSHAKE PANEL */}
            {activeTab === 'verify' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm max-w-md mx-auto
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold text-center">Doorstep Signature Verification</h3>
                
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-2">Select Active Shipment</label>
                    <select
                      value={otpInput.id}
                      onChange={(e) => setOtpInput({ ...otpInput, id: e.target.value })}
                      className={`text-xs p-3.5 rounded-xl border border-current/10 w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'bg-luxury-black text-white' : 'bg-white text-gray-900 border-gray-300'}`}
                    >
                      <option value="">-- Choose Shipment --</option>
                      {deliveries.filter(d => d.status === 'Out for Delivery').map(d => (
                        <option key={d.id} value={d.id}>{d.id} - {d.customer}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-2">Customer OTP Code</label>
                    <input 
                      type="text" 
                      value={otpInput.code}
                      onChange={(e) => setOtpInput({ ...otpInput, code: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g. 109283"
                      maxLength={6}
                      className={`text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none text-center font-mono tracking-[0.4em] font-extrabold ${isDarkMode ? 'border-current/10 bg-transparent text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest shadow-glow active:scale-95 transition-all"
                  >
                    Verify & Release Package
                  </button>
                </form>

                {/* Developer helper simulation logs (OTP codes are transparent for verification purposes in dev mode) */}
                <div className={`mt-6 p-4 rounded-xl border text-[9px] leading-relaxed
                  ${isDarkMode ? 'bg-white/5 border-white/5 text-white/55' : 'bg-luxury-offWhite border-black/5 text-slate-500'}`}
                >
                  <div className="flex gap-1.5 items-center font-bold text-luxury-gold mb-1.5 uppercase tracking-wider">
                    <FiKey />
                    <span>Door OTP Helper (Simulation)</span>
                  </div>
                  <p>In real flows, OTP codes are texted to the customer. For this testing simulation, active codes are: {deliveries.map(d => `[${d.customer}: ${d.otp}]`).join(', ')}</p>
                </div>
              </div>
            )}

            {/* VIEW 4: DELIVERY LOG HISTORY */}
            {activeTab === 'history' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Completed dispatches</h3>
                <div className="space-y-4">
                  {history.map((h) => (
                    <div 
                      key={h.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-luxury-offWhite border-black/5'}`}
                    >
                      <div>
                        <div className="flex gap-2 items-center text-[10px] uppercase font-bold text-green-500 mb-1">
                          <FiCheckCircle />
                          <span>Delivered</span>
                          <span className="opacity-50">| {h.date}</span>
                        </div>
                        <h4 className="text-sm font-bold">{h.customer}</h4>
                        <p className="text-xs opacity-60 mt-0.5">Item: {h.item} | Area: {h.address}</p>
                      </div>

                      <span className="text-[10px] uppercase tracking-wider font-mono bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 px-3 py-1 rounded-full font-bold">
                        Earnings: +₹150
                      </span>
                    </div>
                  ))}
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
