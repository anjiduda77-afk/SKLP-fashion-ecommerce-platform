import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { 
  FiShoppingBag, FiDollarSign, FiInbox, FiCheckSquare, 
  FiPlusCircle, FiList, FiTruck, FiMessageSquare, FiSettings, 
  FiEdit, FiTrash2, FiZap, FiCheckCircle, FiFileText 
} from 'react-icons/fi'
import { toast } from 'react-toastify'

const initialProducts = [
  { id: 's_p1', name: 'Raw Silk Evening Sherwani', price: 18999, category: 'Men', stock: 5, status: 'Active', sku: 'SHR-M-5928' },
  { id: 's_p2', name: 'Royal Banarasi Silk Saree', price: 14999, category: 'Women', stock: 12, status: 'Active', sku: 'SAR-W-9811' },
  { id: 's_p3', name: 'Italian Leather Chelsea Boots', price: 9999, category: 'Footwear', stock: 3, status: 'Active', sku: 'BOT-F-4310' },
  { id: 's_p4', name: 'Gold Trim Classic Hoodie', price: 3499, category: 'Men', stock: 2, status: 'Low Stock', sku: 'HOD-M-2194' }
]

const initialOrders = [
  { id: 'ord_101', customer: 'Ramesh Naidu', item: 'Royal Banarasi Silk Saree', price: 14999, status: 'Pending Dispatch', date: '2026-05-24' },
  { id: 'ord_102', customer: 'Pooja Sharma', item: 'Italian Leather Chelsea Boots', price: 9999, status: 'Dispatched', date: '2026-05-23' },
  { id: 'ord_103', customer: 'Amit Varma', item: 'Gold Trim Classic Hoodie', price: 3499, status: 'Delivered', date: '2026-05-22' }
]

function SellerDashboard() {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'inventory', 'upload', 'orders', 'delivery', 'chat'
  
  // Local state
  const [products, setProducts] = useState(initialProducts)
  const [orders, setOrders] = useState(initialOrders)
  const [earnings, setEarnings] = useState(254890)
  
  // Upload product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: 'Men',
    stock: '',
    description: ''
  })

  // Handle new item upload
  const handleUploadSubmit = (e) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      toast.error('Please enter all required product specifications.')
      return
    }

    const item = {
      id: 's_p_' + Date.now(),
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      category: newProduct.category,
      stock: parseInt(newProduct.stock),
      status: parseInt(newProduct.stock) > 0 ? 'Active' : 'Out of Stock',
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000)
    }

    setProducts([item, ...products])
    setNewProduct({ name: '', price: '', category: 'Men', stock: '', description: '' })
    toast.success(`${item.name} successfully listed to inventory!`)
    setActiveTab('inventory')
  }

  // Handle Order Status Dispatch
  const handleDispatchOrder = (orderId) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'Dispatched' } : o))
    toast.success(`Order #${orderId} marked as Dispatched!`)
  }

  // Handle Product delete
  const handleDeleteProduct = (prodId) => {
    setProducts(products.filter(p => p.id !== prodId))
    toast.info('Garment listing removed from catalog.')
  }

  const tabItems = [
    { id: 'overview', name: 'Console Overview', icon: <FiList /> },
    { id: 'inventory', name: 'Garment Inventory', icon: <FiShoppingBag /> },
    { id: 'upload', name: 'Publish Couture', icon: <FiPlusCircle /> },
    { id: 'orders', name: 'Order Logs', icon: <FiInbox /> },
    { id: 'delivery', name: 'Courier Settings', icon: <FiTruck /> },
    { id: 'chat', name: 'Client Inquiries', icon: <FiMessageSquare /> }
  ]

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
              <span className="text-[10px] uppercase font-bold tracking-widest">SKLP Partner Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-black uppercase">Seller Studio</h1>
            <p className="text-xs opacity-70 mt-1">Manage listings, analytics, and dispatch logistics for <strong>{user?.firstName || 'Premium House'}</strong></p>
          </div>
          
          <div className="flex gap-2">
            <span className="px-4 py-2 bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 rounded-full text-xs font-bold uppercase tracking-wider">
              Verification: Certified
            </span>
          </div>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR: Nav Items */}
          <div className="space-y-3">
            {tabItems.map((item) => (
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

          {/* RIGHT VIEWPORT: Tab Views */}
          <div className="lg:col-span-3">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Total Revenue', value: `₹${earnings.toLocaleString()}`, icon: <FiDollarSign />, color: 'text-green-500' },
                    { title: 'Items Catalog', value: products.length, icon: <FiShoppingBag />, color: 'text-luxury-gold' },
                    { title: 'Pending Orders', value: orders.filter(o => o.status === 'Pending Dispatch').length, icon: <FiInbox />, color: 'text-yellow-500' },
                    { title: 'Courier Ships', value: orders.filter(o => o.status === 'Dispatched').length, icon: <FiTruck />, color: 'text-blue-500' }
                  ].map((stat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between
                        ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{stat.title}</span>
                        <span className={`${stat.color} text-lg`}>{stat.icon}</span>
                      </div>
                      <p className="text-xl font-extrabold tracking-wide text-luxury-gold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Earnings Timeline Graph Mock */}
                <div className={`p-6 rounded-[2rem] border shadow-sm
                  ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Weekly Earnings Timeline</h3>
                  <div className="h-48 flex items-end gap-3 pt-6 border-b border-current/10">
                    {[
                      { day: 'Mon', val: 'h-[30%]', amt: '₹14K' },
                      { day: 'Tue', val: 'h-[55%]', amt: '₹28K' },
                      { day: 'Wed', val: 'h-[40%]', amt: '₹19K' },
                      { day: 'Thu', val: 'h-[80%]', amt: '₹42K' },
                      { day: 'Fri', val: 'h-[65%]', amt: '₹31K' },
                      { day: 'Sat', val: 'h-[95%]', amt: '₹55K' },
                      { day: 'Sun', val: 'h-[20%]', amt: '₹9K' }
                    ].map((col, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                        <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity font-bold text-luxury-gold">{col.amt}</span>
                        <div className={`w-full ${col.val} bg-luxury-gold rounded-t-lg group-hover:bg-luxury-darkGold transition-all`} />
                        <span className="text-[10px] opacity-60 font-mono mt-1">{col.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INVENTORY TABLE */}
            {activeTab === 'inventory' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm overflow-x-auto
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold">Live Catalog Listings</h3>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-glow"
                  >
                    Add New
                  </button>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-current/10 text-[10px] uppercase tracking-wider opacity-60">
                      <th className="pb-3">Sku</th>
                      <th className="pb-3">Garment Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Stock</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-current/5 hover:bg-current/5 transition-colors">
                        <td className="py-4 font-mono font-bold text-luxury-gold">{p.sku}</td>
                        <td className="py-4 font-semibold">{p.name}</td>
                        <td className="py-4">{p.category}</td>
                        <td className="py-4 font-bold">₹{p.price.toLocaleString()}</td>
                        <td className="py-4 font-mono">{p.stock} units</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold
                            ${p.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button className="p-2 hover:text-luxury-gold transition"><FiEdit size={14} /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:text-red-500 transition"><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: PUBLISH COUTURE */}
            {activeTab === 'upload' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Publish Premium Listing</h3>
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-2">Product Name</label>
                      <input 
                        type="text" 
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="e.g. Silk Zari Saree"
                        className={`text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'border-current/10 bg-transparent text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-2">Price (INR)</label>
                      <input 
                        type="number" 
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="e.g. 12999"
                        className={`text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'border-current/10 bg-transparent text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-2">Category</label>
                      <select 
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className={`text-xs p-3.5 rounded-xl border border-current/10 w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'bg-luxury-black text-white' : 'bg-white text-gray-900 border-gray-300'}`}
                      >
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Kids">Kids</option>
                        <option value="Footwear">Footwear</option>
                        <option value="Accessories">Accessories</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-2">Initial Stock (Units)</label>
                      <input 
                        type="number" 
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        placeholder="e.g. 10"
                        className={`text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'border-current/10 bg-transparent text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-2">Design Story Description</label>
                    <textarea 
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Detail the fabric, weave styles, and couture alignments..."
                      rows={4}
                      className={`text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none ${isDarkMode ? 'border-current/10 bg-transparent text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest shadow-glow active:scale-95 transition-all"
                  >
                    Publish Listing
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: ORDERS & DISPATCH */}
            {activeTab === 'orders' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Active Store Orders</h3>
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div 
                      key={o.id}
                      className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-luxury-offWhite border-black/5'}`}
                    >
                      <div>
                        <div className="flex gap-2 items-center text-[10px] uppercase font-bold text-luxury-gold mb-1">
                          <FiFileText />
                          <span>Order #{o.id}</span>
                          <span className="opacity-50">| {o.date}</span>
                        </div>
                        <h4 className="text-sm font-bold">{o.item}</h4>
                        <p className="text-xs opacity-60 mt-0.5">Purchaser: {o.customer}</p>
                      </div>

                      <div className="flex gap-3 items-center w-full md:w-auto justify-between md:justify-end">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold
                          ${o.status === 'Pending Dispatch' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : o.status === 'Dispatched' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                          {o.status}
                        </span>
                        
                        {o.status === 'Pending Dispatch' && (
                          <button
                            onClick={() => handleDispatchOrder(o.id)}
                            className="px-4 py-2 bg-luxury-gold text-black rounded-lg text-[10px] uppercase tracking-wider font-extrabold active:scale-95 transition-all shadow-glow"
                          >
                            Dispatch Item
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: DELIVERY SETTINGS */}
            {activeTab === 'delivery' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Courier Dispatch Configurations</h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center py-3 border-b border-current/10">
                    <div>
                      <p className="text-xs font-bold uppercase">Default Delivery Provider</p>
                      <p className="text-[10px] opacity-65 mt-0.5">Assigned to courier partner API</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-luxury-gold">SKLP Air Cargo</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-current/10">
                    <div>
                      <p className="text-xs font-bold uppercase">Bespoke Priority Packaging</p>
                      <p className="text-[10px] opacity-65 mt-0.5">Items wrapped in custom luxury velvet boxes</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-green-500 uppercase">Enabled</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-current/10">
                    <div>
                      <p className="text-xs font-bold uppercase">Cash on Delivery (COD)</p>
                      <p className="text-[10px] opacity-65 mt-0.5">Allows premium buyer checks upon arrival</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-luxury-gold uppercase">Restricted</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: CHAT SIMULATOR */}
            {activeTab === 'chat' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-luxury-gold">Active Client Conversations</h3>
                <div className="space-y-4">
                  {[
                    { sender: 'Pooja S.', text: 'Will this sherwani size be customizable before shipment?', time: '10 mins ago' },
                    { sender: 'Ramesh N.', text: 'Please wrap the banarasi saree in the velvet gift box.', time: '1 hour ago' }
                  ].map((c, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all flex gap-3
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-luxury-offWhite border-black/5'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold text-xs shrink-0">
                        {c.sender[0]}
                      </div>
                      <div>
                        <div className="flex gap-2 items-center mb-1">
                          <span className="font-bold text-xs">{c.sender}</span>
                          <span className="text-[9px] opacity-50">{c.time}</span>
                        </div>
                        <p className="text-xs opacity-75">{c.text}</p>
                      </div>
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

export default SellerDashboard
