import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { 
  FiShoppingBag, FiDollarSign, FiInbox, 
  FiPlusCircle, FiList, FiTruck, FiMessageSquare, 
  FiEdit, FiTrash2, FiZap, FiFileText, FiUploadCloud, 
  FiStar, FiChevronLeft, FiChevronRight, FiSearch, 
  FiX, FiSettings
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { sellerService, uploadService } from '@services/apiServices'

const CATEGORIES = ['shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear']
const GENDERS = ['men', 'women', 'kids', 'unisex']

const EMPTY_FORM = {
  name: '', price: '', originalPrice: '', discount: '', category: 'shirts', 
  gender: 'men', stock: '', lowStockThreshold: 10, brand: '', tags: '', 
  shortDescription: '', description: ''
}

// ── Image Upload Zone Component ──────────────────────────────────────────────
function ImageUploadZone({ images, setImages, isDarkMode }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type)) {
        toast.error(`Invalid file type: ${f.name}. Only JPG, PNG, WebP allowed.`)
        return false
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File too large: ${f.name} (max 5MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return
    if (images.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed per product')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const res = await uploadService.uploadImages(validFiles, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploadProgress(percent)
      })

      if (res.data?.success) {
        const newImages = res.data.images.map((img, i) => ({
          url: img.url,
          publicId: img.publicId,
          isMain: images.length === 0 && i === 0,
          alt: '',
        }))
        setImages(prev => [...prev, ...newImages])
        toast.success(`${newImages.length} image(s) uploaded successfully!`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Image upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeImage = async (index) => {
    const img = images[index]
    if (img.publicId && !img.publicId.startsWith('local_')) {
      try {
        await uploadService.deleteImage(img.publicId)
      } catch (err) {
        console.warn('Failed to delete image from Cloudinary:', err)
      }
    }
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      if (img.isMain && updated.length > 0) {
        updated[0].isMain = true
      }
      return updated
    })
  }

  const setMainImage = (index) => {
    setImages(prev => prev.map((img, i) => ({ ...img, isMain: i === index })))
  }

  return (
    <div className="space-y-4">
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Couture Imagery (Max 5)</label>
      
      {/* Dropzone Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
          ${dragOver 
            ? 'border-luxury-gold bg-luxury-gold/10 scale-[1.01]' 
            : isDarkMode 
              ? 'border-white/10 hover:border-luxury-gold/50 bg-white/5' 
              : 'border-slate-200 hover:border-luxury-gold/50 bg-slate-50'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/jpeg,image/png,image/webp" 
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {uploading ? (
          <div className="space-y-3">
            <div className="w-10 h-10 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-luxury-gold">Uploading Couture Images... {uploadProgress}%</p>
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div 
                className="h-full bg-luxury-gold rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <FiUploadCloud size={32} className={`mx-auto ${isDarkMode ? 'text-luxury-gold/70' : 'text-slate-400'}`} />
            <p className="text-xs font-bold uppercase tracking-wider">Drag & Drop Couture Files</p>
            <p className="text-[10px] opacity-60">JPG, PNG, WebP (Max 5MB each)</p>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap pt-2">
          {images.map((img, idx) => (
            <div 
              key={idx}
              className={`relative group w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300
                ${img.isMain 
                  ? 'border-luxury-gold shadow-glow' 
                  : isDarkMode ? 'border-white/10' : 'border-slate-200'
                }`}
            >
              <img src={img.url} alt="Couture Preview" className="w-full h-full object-cover" />
              {img.isMain && (
                <span className="absolute top-1 left-1 bg-luxury-gold text-black text-[7px] font-black px-1 py-0.5 rounded tracking-widest uppercase">
                  Main
                </span>
              )}
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                {!img.isMain && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMainImage(idx) }}
                    className="p-1.5 bg-luxury-gold rounded-lg text-black hover:bg-luxury-darkGold"
                    title="Set as main"
                  >
                    <FiStar size={11} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(idx) }}
                  className="p-1.5 bg-red-500 rounded-lg text-white hover:bg-red-600"
                  title="Delete"
                >
                  <FiTrash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SellerDashboard() {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)

  // Overview metrics state
  const [metrics, setMetrics] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])

  // Inventory state
  const [products, setProducts] = useState([])
  const [inventoryParams, setInventoryParams] = useState({ page: 1, limit: 10, search: '', category: '', status: '' })
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 })

  // Order Logs state
  const [orders, setOrders] = useState([])
  const [orderParams, setOrderParams] = useState({ page: 1, limit: 10, status: '' })
  const [ordersPagination, setOrdersPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 })
  const [dispatchingOrderId, setDispatchingOrderId] = useState(null)
  const [dispatchData, setDispatchData] = useState({ carrier: 'SKLP Cargo', trackingNumber: '' })

  // Product Form state (Create/Edit)
  const [form, setForm] = useState(EMPTY_FORM)
  const [images, setImages] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [savingProduct, setSavingProduct] = useState(false)

  // Seller Profile state
  const [sellerProfile, setSellerProfile] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    storeName: '', storeDescription: '', gstNumber: '', panNumber: '',
    bankDetails: { bankName: '', accountHolder: '', accountNumber: '', ifscCode: '' }
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Courier settings state
  const [courierSettings, setCourierSettings] = useState({
    defaultCarrier: 'SKLP Air Cargo',
    bespokePackaging: true,
    codRestricted: true
  })

  // Chat simulator state
  const [chatRooms, setChatRooms] = useState([
    { id: 1, name: 'Pooja Sharma', lastMessage: 'Will this sherwani size be customizable?', time: '10 mins ago', messages: [
      { sender: 'client', text: 'Hi! I saw the Sherwani catalog. Will this sherwani size be customizable before shipment?', time: '10 mins ago' }
    ] },
    { id: 2, name: 'Ramesh Naidu', lastMessage: 'Please wrap the banarasi saree in the velvet gift box.', time: '1 hour ago', messages: [
      { sender: 'client', text: 'Please wrap the banarasi saree in the velvet gift box. It is a wedding gift.', time: '1 hour ago' }
    ] }
  ])
  const [activeChatId, setActiveChatId] = useState(1)
  const [chatReplyText, setChatReplyText] = useState('')

  // ── Data Fetching Functions ────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      const res = await sellerService.getDashboard()
      if (res.data?.success) {
        setMetrics(res.data.dashboard.metrics)
        setTopProducts(res.data.dashboard.topProducts || [])
        setRecentOrders(res.data.dashboard.recentOrders || [])
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sellerService.getProducts(inventoryParams)
      if (res.data?.success) {
        setProducts(res.data.products)
        setPagination(res.data.pagination)
      }
    } catch (err) {
      toast.error('Failed to load inventory products')
    } finally {
      setLoading(false)
    }
  }, [inventoryParams])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sellerService.getOrders(orderParams)
      if (res.data?.success) {
        setOrders(res.data.orders)
        setOrdersPagination(res.data.pagination)
      }
    } catch (err) {
      toast.error('Failed to load order logs')
    } finally {
      setLoading(false)
    }
  }, [orderParams])

  const loadProfile = useCallback(async () => {
    try {
      const res = await sellerService.getProfile()
      if (res.data?.success) {
        const p = res.data.profile
        setSellerProfile({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          email: p.email || '',
          phone: p.phone || '',
          storeName: p.sellerProfile?.storeName || '',
          storeDescription: p.sellerProfile?.storeDescription || '',
          gstNumber: p.sellerProfile?.gstNumber || '',
          panNumber: p.sellerProfile?.panNumber || '',
          bankDetails: {
            bankName: p.sellerProfile?.bankDetails?.bankName || '',
            accountHolder: p.sellerProfile?.bankDetails?.accountHolder || '',
            accountNumber: p.sellerProfile?.bankDetails?.accountNumber || '',
            ifscCode: p.sellerProfile?.bankDetails?.ifscCode || ''
          }
        })
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }, [])

  // Hook trigger for tab changes
  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboard()
    } else if (activeTab === 'inventory') {
      loadProducts()
    } else if (activeTab === 'orders') {
      loadOrders()
    } else if (activeTab === 'profile') {
      loadProfile()
    }
  }, [activeTab, loadDashboard, loadProducts, loadOrders, loadProfile])

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.stock || !form.description) {
      toast.error('Please complete all required product fields.')
      return
    }

    setSavingProduct(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : Number(form.price),
        discount: form.discount ? Number(form.discount) : 0,
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images
      }

      let res
      if (editingProduct) {
        res = await sellerService.updateProduct(editingProduct._id, payload)
        if (res.data?.success) {
          toast.success('Garment listing successfully updated!')
        }
      } else {
        res = await sellerService.createProduct(payload)
        if (res.data?.success) {
          toast.success('New couture listing successfully published!')
        }
      }

      // Reset state
      setForm(EMPTY_FORM)
      setImages([])
      setEditingProduct(null)
      setActiveTab('inventory')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to list product')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleEditProduct = (prod) => {
    setEditingProduct(prod)
    setForm({
      name: prod.name || '',
      price: prod.price || '',
      originalPrice: prod.originalPrice || '',
      discount: prod.discount || '',
      category: prod.category || 'shirts',
      gender: prod.gender || 'men',
      stock: prod.stock || '',
      lowStockThreshold: prod.lowStockThreshold || 10,
      brand: prod.brand || '',
      tags: (prod.tags || []).join(', '),
      shortDescription: prod.shortDescription || '',
      description: prod.description || ''
    })
    setImages(prod.images || [])
    setActiveTab('upload')
  }

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to remove this catalog listing?')) return
    try {
      const res = await sellerService.deleteProduct(id)
      if (res.data?.success) {
        toast.info('Listing removed from inventory catalog')
        loadProducts()
      }
    } catch (err) {
      toast.error('Failed to delete listing')
    }
  }

  const handleDispatchSubmit = async (e, orderId) => {
    e.preventDefault()
    if (!dispatchData.trackingNumber) {
      toast.error('Please enter a carrier tracking number')
      return
    }

    try {
      const res = await sellerService.dispatchOrder(orderId, dispatchData)
      if (res.data?.success) {
        toast.success(`Order #${orderId} marked as dispatched!`)
        setDispatchingOrderId(null)
        setDispatchData({ carrier: 'SKLP Cargo', trackingNumber: '' })
        loadOrders()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch order')
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await sellerService.updateProfile(sellerProfile)
      if (res.data?.success) {
        toast.success('Store profile information saved successfully!')
        loadProfile()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save store profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSendChatMessage = (e) => {
    e.preventDefault()
    if (!chatReplyText.trim()) return

    setChatRooms(prev => prev.map(room => {
      if (room.id === activeChatId) {
        return {
          ...room,
          lastMessage: chatReplyText,
          time: 'Just now',
          messages: [
            ...room.messages,
            { sender: 'seller', text: chatReplyText, time: 'Just now' }
          ]
        }
      }
      return room
    }))
    setChatReplyText('')

    // Simulation auto response after 1.5 seconds
    setTimeout(() => {
      setChatRooms(prev => prev.map(room => {
        if (room.id === activeChatId) {
          return {
            ...room,
            lastMessage: 'Thank you for your response!',
            time: 'Just now',
            messages: [
              ...room.messages,
              { sender: 'client', text: 'Thank you! Let me place the order now.', time: 'Just now' }
            ]
          }
        }
        return room
      }))
    }, 1500)
  }

  const activeChat = chatRooms.find(r => r.id === activeChatId)

  // Navigation Items
  const tabItems = [
    { id: 'overview', name: 'Console Overview', icon: <FiList /> },
    { id: 'inventory', name: 'Garment Inventory', icon: <FiShoppingBag /> },
    { id: 'upload', name: editingProduct ? 'Edit Couture' : 'Publish Couture', icon: <FiPlusCircle /> },
    { id: 'orders', name: 'Order Logs', icon: <FiInbox /> },
    { id: 'profile', name: 'Store Settings', icon: <FiSettings /> },
    { id: 'delivery', name: 'Courier Settings', icon: <FiTruck /> },
    { id: 'chat', name: 'Client Inquiries', icon: <FiMessageSquare /> }
  ]

  // Dynamic Theme Helpers
  const cardCls = `rounded-[2rem] border p-6 md:p-8 mb-8 shadow-sm transition-all duration-300
    ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white shadow-dark-glow' : 'bg-white border-luxury-gold/25 text-luxury-darkBlack shadow-hover'}`
  const inputCls = `text-xs p-3.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none transition-all
    ${isDarkMode ? 'border-white/10 bg-transparent text-white focus:border-luxury-gold' : 'border-gray-200 bg-white text-gray-900 focus:border-luxury-gold'}`
  const labelCls = `block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`

  return (
    <div className="min-h-screen py-10">
      <div className="container-custom">
        
        {/* Banner Welcome Panel */}
        <div className={`rounded-[2rem] border p-6 md:p-8 mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm transition-all duration-300
          ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white shadow-dark-glow' : 'bg-white border-luxury-gold/25 text-luxury-darkBlack shadow-hover'}`}
        >
          <div>
            <div className="flex items-center gap-2 text-luxury-gold mb-1">
              <FiZap className="animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest">SKLP Partner Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-black uppercase tracking-wide">Seller Studio</h1>
            <p className="text-xs opacity-70 mt-1">
              Manage listings, analytics, and dispatch logistics for <strong>{sellerProfile.storeName || user?.firstName || 'Premium House'}</strong>
            </p>
          </div>
          
          <div className="flex gap-2">
            <span className={`px-4 py-2 border rounded-full text-xs font-bold uppercase tracking-wider transition-colors
              ${sellerProfile.gstNumber 
                ? 'bg-green-500/10 text-green-500 border-green-500/25' 
                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25 animate-pulse'}`}>
              GST: {sellerProfile.gstNumber ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
        </div>

        {/* Outer Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR: Nav Items */}
          <div className="space-y-3">
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id !== 'upload' && editingProduct) {
                    // reset editing state when switching tabs
                    setEditingProduct(null)
                    setForm(EMPTY_FORM)
                    setImages([])
                  }
                  setActiveTab(item.id)
                }}
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
                    { title: 'Total Revenue', value: `₹${(metrics?.totalRevenue || 0).toLocaleString('en-IN')}`, icon: <FiDollarSign />, color: 'text-green-500' },
                    { title: 'Items Catalog', value: metrics?.totalProducts || 0, icon: <FiShoppingBag />, color: 'text-luxury-gold' },
                    { title: 'Pending Orders', value: metrics?.pendingOrders || 0, icon: <FiInbox />, color: 'text-yellow-500' },
                    { title: 'Dispatched Ships', value: metrics?.dispatchedOrders || 0, icon: <FiTruck />, color: 'text-blue-500' }
                  ].map((stat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300
                        ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">{stat.title}</span>
                        <span className={`${stat.color} text-base`}>{stat.icon}</span>
                      </div>
                      <p className="text-xl font-extrabold tracking-wide text-luxury-gold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Earnings Timeline Graph */}
                <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                  ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-luxury-gold">Weekly Revenue Flow</h3>
                    <span className="text-xs font-bold opacity-75">Weekly Total: ₹{(metrics?.weeklyRevenue || 0).toLocaleString('en-IN')}</span>
                  </div>
                  
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
                        <div className={`w-full ${col.val} bg-luxury-gold rounded-t-lg group-hover:bg-luxury-darkGold transition-all duration-300`} />
                        <span className="text-[10px] opacity-60 font-mono mt-1">{col.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Double Column Grid: Top Products & Recent Orders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Top Products */}
                  <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                    ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-luxury-gold">Top Selling Couture</h3>
                    <div className="space-y-3">
                      {topProducts.length === 0 ? (
                        <p className="text-xs opacity-50 py-4 text-center">No sales recorded yet.</p>
                      ) : (
                        topProducts.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-current/5 last:border-0 text-xs">
                            <span className="font-semibold truncate max-w-[150px]">{p.name}</span>
                            <div className="text-right">
                              <p className="font-bold text-luxury-gold">₹{p.revenue.toLocaleString('en-IN')}</p>
                              <p className="text-[9px] opacity-65">{p.quantity} units</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                    ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-luxury-gold">Recent Dashboard Orders</h3>
                    <div className="space-y-3">
                      {recentOrders.length === 0 ? (
                        <p className="text-xs opacity-50 py-4 text-center">No recent orders.</p>
                      ) : (
                        recentOrders.map((o, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-current/5 last:border-0 text-xs">
                            <div>
                              <p className="font-bold text-luxury-gold">#{o.orderNumber || o.id.toString().slice(-6)}</p>
                              <p className="text-[9px] opacity-60">{new Date(o.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold
                                ${o.status === 'shipped' || o.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                {o.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: INVENTORY TABLE */}
            {activeTab === 'inventory' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5'}`}
              >
                {/* Toolbar Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                      <FiSearch className="absolute left-3 top-3.5 opacity-60 text-xs" />
                      <input 
                        type="text"
                        placeholder="Search SKU or product..."
                        value={inventoryParams.search}
                        onChange={(e) => setInventoryParams(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                        className={`text-xs pl-9 pr-4 py-2.5 rounded-xl border w-full focus:ring-1 focus:ring-luxury-gold outline-none
                          ${isDarkMode ? 'border-white/10 bg-transparent text-white' : 'border-slate-200 bg-white'}`}
                      />
                    </div>
                    
                    <select
                      value={inventoryParams.category}
                      onChange={(e) => setInventoryParams(prev => ({ ...prev, category: e.target.value, page: 1 }))}
                      className={`text-xs p-2.5 rounded-xl border focus:ring-1 focus:ring-luxury-gold outline-none
                        ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-white border-slate-200'}`}
                    >
                      <option value="">All Categories</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                      ))}
                    </select>

                    <select
                      value={inventoryParams.status}
                      onChange={(e) => setInventoryParams(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                      className={`text-xs p-2.5 rounded-xl border focus:ring-1 focus:ring-luxury-gold outline-none
                        ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-white border-slate-200'}`}
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => { setEditingProduct(null); setForm(EMPTY_FORM); setImages([]); setActiveTab('upload') }}
                    className="px-4 py-2.5 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-glow whitespace-nowrap active:scale-95 transition-all"
                  >
                    Add Couture
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-16 opacity-50">
                    <FiShoppingBag size={48} className="mx-auto mb-3 text-luxury-gold/50" />
                    <p className="text-xs uppercase font-bold tracking-wider">No inventory listed.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-current/10 text-[10px] uppercase tracking-wider opacity-60">
                          <th className="pb-3">Couture</th>
                          <th className="pb-3">SKU</th>
                          <th className="pb-3">Category</th>
                          <th className="pb-3">Price</th>
                          <th className="pb-3">Stock</th>
                          <th className="pb-3">Moderation</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p._id} className="border-b border-current/5 hover:bg-current/5 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 border
                                  ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                  {p.images?.[0] ? (
                                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-luxury-gold uppercase text-[10px]">
                                      {p.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold line-clamp-1">{p.name}</p>
                                  <p className="text-[10px] opacity-60 capitalize">{p.gender}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 font-mono font-bold text-luxury-gold uppercase">{p.sku}</td>
                            <td className="py-4 capitalize">{p.category}</td>
                            <td className="py-4 font-bold">
                              <div>₹{p.price.toLocaleString('en-IN')}</div>
                              {p.originalPrice && p.originalPrice > p.price && (
                                <div className="text-[10px] line-through opacity-55">₹{p.originalPrice.toLocaleString('en-IN')}</div>
                              )}
                            </td>
                            <td className="py-4">
                              <span className={`font-mono ${p.stock <= p.lowStockThreshold ? 'text-red-500 font-bold' : ''}`}>
                                {p.stock} units
                              </span>
                            </td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest
                                ${p.moderationStatus === 'approved' 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : p.moderationStatus === 'rejected' 
                                    ? 'bg-red-500/10 text-red-500' 
                                    : 'bg-yellow-500/10 text-yellow-500'}`}>
                                {p.moderationStatus || 'pending'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex gap-1.5 justify-end">
                                <button 
                                  onClick={() => handleEditProduct(p)}
                                  className={`p-2 rounded-lg hover:text-luxury-gold hover:bg-luxury-gold/10 transition-all`}
                                  title="Edit Couture"
                                >
                                  <FiEdit size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p._id)}
                                  className={`p-2 rounded-lg hover:text-red-500 hover:bg-red-500/10 transition-all`}
                                  title="Remove Listing"
                                >
                                  <FiTrash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-current/5">
                    <span className="text-[10px] opacity-60">
                      Showing page {pagination.page} of {pagination.pages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setInventoryParams(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={inventoryParams.page === 1}
                        className={`p-1.5 rounded-lg border text-xs transition disabled:opacity-30
                          ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <FiChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => setInventoryParams(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                        disabled={inventoryParams.page === pagination.pages}
                        className={`p-1.5 rounded-lg border text-xs transition disabled:opacity-30
                          ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <FiChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PUBLISH COUTURE */}
            {activeTab === 'upload' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-luxury-gold/25'}`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold">
                    {editingProduct ? 'Edit Premium Couture Listing' : 'Publish Premium Couture Listing'}
                  </h3>
                  {editingProduct && (
                    <button 
                      onClick={() => { setEditingProduct(null); setForm(EMPTY_FORM); setImages([]); setActiveTab('inventory') }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5
                        ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <FiX size={12} /> Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleProductSubmit} className="space-y-6">
                  {/* Cloudinary Image Dropzone */}
                  <ImageUploadZone images={images} setImages={setImages} isDarkMode={isDarkMode} />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Couture Name *</label>
                      <input 
                        type="text" 
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Royal Banarasi Zari Silk Saree"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Selling Price (INR) *</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="e.g. 14999"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>Original Price (INR)</label>
                      <input 
                        type="number" 
                        min={0}
                        value={form.originalPrice}
                        onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                        placeholder="e.g. 19999"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Discount %</label>
                      <input 
                        type="number" 
                        min={0}
                        max={100}
                        value={form.discount}
                        onChange={(e) => setForm({ ...form, discount: e.target.value })}
                        placeholder="e.g. 25"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Stock (Units) *</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        placeholder="e.g. 15"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Category *</label>
                      <select 
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className={inputCls}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Gender Alignment *</label>
                      <select 
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className={inputCls}
                      >
                        {GENDERS.map(g => (
                          <option key={g} value={g}>{g.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Brand House</label>
                      <input 
                        type="text" 
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        placeholder="e.g. Sabyasachi, Manish Malhotra"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Low Stock Threshold Alert</label>
                      <input 
                        type="number" 
                        min={1}
                        value={form.lowStockThreshold}
                        onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Search tags (comma separated)</label>
                    <input 
                      type="text" 
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="e.g. bridal, banarasi, silk, handloom"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Short Description (Max 500 chars)</label>
                    <input 
                      type="text" 
                      value={form.shortDescription}
                      onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                      placeholder="e.g. Hand-woven Banarasi silk saree with authentic gold zari border details."
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Design Story & Fabric Description *</label>
                    <textarea 
                      required
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Detail the complete heritage, fabric weaves, patterns, necklines, fittings, and care instructions..."
                      rows={5}
                      className={inputCls}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={savingProduct}
                    className="w-full py-4 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest shadow-glow active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {savingProduct ? 'Saving Couture...' : editingProduct ? 'Update Listing' : 'Publish Listing'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: ORDERS & DISPATCH */}
            {activeTab === 'orders' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold">Active Store Orders</h3>
                  
                  <select
                    value={orderParams.status}
                    onChange={(e) => setOrderParams(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                    className={`text-xs p-2.5 rounded-xl border focus:ring-1 focus:ring-luxury-gold outline-none
                      ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-white border-slate-200'}`}
                  >
                    <option value="">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 opacity-50">
                    <FiInbox size={48} className="mx-auto mb-3 text-luxury-gold/50" />
                    <p className="text-xs uppercase font-bold tracking-wider">No matching store orders found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => (
                      <div 
                        key={o._id}
                        className={`p-5 rounded-2xl border flex flex-col gap-4 transition-all duration-300
                          ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200/50'}`}
                      >
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <div className="flex gap-2 items-center text-[10px] uppercase font-bold text-luxury-gold mb-1">
                              <FiFileText />
                              <span>Order #{o.orderNumber || o._id.toString().slice(-8)}</span>
                              <span className="opacity-50">| {new Date(o.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-bold">Buyer: {o.userId?.firstName} {o.userId?.lastName} ({o.userId?.email})</p>
                          </div>
                          
                          <div className="text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider
                              ${o.status === 'pending' || o.status === 'confirmed' 
                                ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' 
                                : o.status === 'shipped' 
                                  ? 'bg-blue-500/10 text-blue-500' 
                                  : o.status === 'cancelled' 
                                    ? 'bg-red-500/10 text-red-500' 
                                    : 'bg-green-500/10 text-green-500'}`}>
                              {o.status}
                            </span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="space-y-2 border-t border-b border-current/5 py-3">
                          {o.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <div>
                                <span className="font-semibold">{item.productName || item.name}</span>
                                {item.variant && (
                                  <span className="text-[9px] uppercase tracking-wider text-luxury-gold ml-2 border border-luxury-gold/25 px-1 rounded">
                                    {item.variant.type}: {item.variant.name}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono">
                                {item.quantity} x ₹{(item.finalPrice || item.price).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Dispatch Tracking Section */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <p className="text-xs font-bold">Total Items Sum: ₹{o.items.reduce((acc, i) => acc + (i.finalPrice || i.price) * i.quantity, 0).toLocaleString('en-IN')}</p>
                          
                          {(o.status === 'pending' || o.status === 'confirmed') && (
                            <div className="w-full sm:w-auto text-right">
                              {dispatchingOrderId === o._id ? (
                                <form onSubmit={(e) => handleDispatchSubmit(e, o._id)} className="flex flex-col sm:flex-row gap-2 mt-2">
                                  <input 
                                    type="text" 
                                    value={dispatchData.carrier}
                                    onChange={(e) => setDispatchData({ ...dispatchData, carrier: e.target.value })}
                                    placeholder="Carrier (e.g. DHL)"
                                    className={`text-[10px] p-2 rounded-lg border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10' : 'bg-white'}`}
                                    required
                                  />
                                  <input 
                                    type="text" 
                                    value={dispatchData.trackingNumber}
                                    onChange={(e) => setDispatchData({ ...dispatchData, trackingNumber: e.target.value })}
                                    placeholder="Tracking Number"
                                    className={`text-[10px] p-2 rounded-lg border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10' : 'bg-white'}`}
                                    required
                                  />
                                  <div className="flex gap-1.5">
                                    <button type="submit" className="px-3 py-1 bg-green-500 text-black text-[9px] uppercase font-bold rounded-lg hover:bg-green-600 transition">Confirm</button>
                                    <button type="button" onClick={() => setDispatchingOrderId(null)} className="px-3 py-1 bg-red-500 text-white text-[9px] uppercase font-bold rounded-lg hover:bg-red-600 transition">Cancel</button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => { setDispatchingOrderId(o._id); setDispatchData({ carrier: 'SKLP Air Cargo', trackingNumber: '' }) }}
                                  className="px-4 py-2 bg-luxury-gold text-black rounded-lg text-[10px] uppercase tracking-wider font-extrabold active:scale-95 transition-all shadow-glow"
                                >
                                  Dispatch Shipment
                                </button>
                              )}
                            </div>
                          )}

                          {o.status === 'shipped' && o.trackingNumber && (
                            <div className="text-[10px] opacity-75 font-mono text-right w-full sm:w-auto">
                              Carrier: <strong>{o.carrier || 'SKLP Cargo'}</strong> | Tracking: <strong>{o.trackingNumber}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {ordersPagination.pages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-current/5">
                    <span className="text-[10px] opacity-60">
                      Showing page {ordersPagination.page} of {ordersPagination.pages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOrderParams(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={orderParams.page === 1}
                        className={`p-1.5 rounded-lg border text-xs transition disabled:opacity-30
                          ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <FiChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => setOrderParams(prev => ({ ...prev, page: Math.min(ordersPagination.pages, prev.page + 1) }))}
                        disabled={orderParams.page === ordersPagination.pages}
                        className={`p-1.5 rounded-lg border text-xs transition disabled:opacity-30
                          ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <FiChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: STORE SETTINGS / PROFILE */}
            {activeTab === 'profile' && (
              <div className={cardCls}>
                <div className="flex items-center gap-3 text-luxury-gold mb-6 border-b border-current/10 pb-4">
                  <FiSettings size={20} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Store Config & Verification</h3>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-6">
                  {/* Two columns: Store details and Personal contact */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    
                    {/* Column 1: Store Setup */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-luxury-gold mb-1">Company Setup</h4>
                      
                      <div>
                        <label className={labelCls}>Store Name *</label>
                        <input 
                          type="text" 
                          required
                          value={sellerProfile.storeName}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, storeName: e.target.value })}
                          placeholder="e.g. Sabyasachi Couture Studio"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Store Description</label>
                        <textarea 
                          value={sellerProfile.storeDescription}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, storeDescription: e.target.value })}
                          placeholder="Tell customers about your craftsmanship history and values..."
                          rows={4}
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>GST Number (15-digit)</label>
                        <input 
                          type="text" 
                          value={sellerProfile.gstNumber}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, gstNumber: e.target.value.toUpperCase() })}
                          placeholder="29AAAAA1111A1Z1"
                          maxLength={15}
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>PAN Number (10-digit)</label>
                        <input 
                          type="text" 
                          value={sellerProfile.panNumber}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, panNumber: e.target.value.toUpperCase() })}
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Column 2: Bank details & Contact info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-luxury-gold mb-1">Settlement Account</h4>

                      <div>
                        <label className={labelCls}>Bank Name</label>
                        <input 
                          type="text" 
                          value={sellerProfile.bankDetails.bankName}
                          onChange={(e) => setSellerProfile({ 
                            ...sellerProfile, 
                            bankDetails: { ...sellerProfile.bankDetails, bankName: e.target.value } 
                          })}
                          placeholder="HDFC Bank, ICICI Bank"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Account Holder Name</label>
                        <input 
                          type="text" 
                          value={sellerProfile.bankDetails.accountHolder}
                          onChange={(e) => setSellerProfile({ 
                            ...sellerProfile, 
                            bankDetails: { ...sellerProfile.bankDetails, accountHolder: e.target.value } 
                          })}
                          placeholder="Full account name"
                          className={inputCls}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Account Number</label>
                          <input 
                            type="text" 
                            value={sellerProfile.bankDetails.accountNumber}
                            onChange={(e) => setSellerProfile({ 
                              ...sellerProfile, 
                              bankDetails: { ...sellerProfile.bankDetails, accountNumber: e.target.value.replace(/\D/g, '') } 
                            })}
                            placeholder="Bank Account Number"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>IFSC Code</label>
                          <input 
                            type="text" 
                            value={sellerProfile.bankDetails.ifscCode}
                            onChange={(e) => setSellerProfile({ 
                              ...sellerProfile, 
                              bankDetails: { ...sellerProfile.bankDetails, ifscCode: e.target.value.toUpperCase() } 
                            })}
                            placeholder="HDFC0000123"
                            maxLength={11}
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <h4 className="text-xs font-bold uppercase tracking-widest text-luxury-gold pt-2 mb-1">Point of Contact</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>First Name</label>
                          <input 
                            type="text" 
                            value={sellerProfile.firstName}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, firstName: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Last Name</label>
                          <input 
                            type="text" 
                            value={sellerProfile.lastName}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, lastName: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Mobile Contact</label>
                        <input 
                          type="tel" 
                          value={sellerProfile.phone}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          className={inputCls}
                        />
                      </div>
                    </div>

                  </div>

                  <button 
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-4 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest shadow-glow active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving Config...' : 'Save Store Settings'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 6: COURIER SETTINGS */}
            {activeTab === 'delivery' && (
              <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                <div className="flex items-center gap-3 text-luxury-gold mb-6 border-b border-current/10 pb-4">
                  <FiTruck size={20} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Courier Dispatch Configurations</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center py-4 border-b border-current/10">
                    <div>
                      <p className="text-xs font-bold uppercase">Default Delivery Provider</p>
                      <p className="text-[10px] opacity-65 mt-0.5">Assigned automatically to generate tracking APIs</p>
                    </div>
                    <select
                      value={courierSettings.defaultCarrier}
                      onChange={(e) => setCourierSettings({ ...courierSettings, defaultCarrier: e.target.value })}
                      className={`text-xs p-2 rounded-lg border outline-none ${isDarkMode ? 'bg-luxury-black border-white/10 text-white' : 'bg-white'}`}
                    >
                      <option value="SKLP Air Cargo">SKLP Air Cargo (Default)</option>
                      <option value="Delhivery Priority">Delhivery Priority</option>
                      <option value="DHL Express International">DHL Express International</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center py-4 border-b border-current/10">
                    <div>
                      <p className="text-xs font-bold uppercase">Bespoke Priority Packaging</p>
                      <p className="text-[10px] opacity-65 mt-0.5">Wrap all items in custom luxury velvet boxes and golden seals</p>
                    </div>
                    <button
                      onClick={() => setCourierSettings({ ...courierSettings, bespokePackaging: !courierSettings.bespokePackaging })}
                      className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold border transition-colors
                        ${courierSettings.bespokePackaging 
                          ? 'bg-green-500/10 text-green-500 border-green-500/25' 
                          : 'bg-red-500/10 text-red-500 border-red-500/25'}`}
                    >
                      {courierSettings.bespokePackaging ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-4 border-b border-current/10">
                    <div>
                      <p className="text-xs font-bold uppercase">Cash on Delivery (COD) Limitation</p>
                      <p className="text-[10px] opacity-65 mt-0.5">Restrict COD transactions for high-value designer garments</p>
                    </div>
                    <button
                      onClick={() => setCourierSettings({ ...courierSettings, codRestricted: !courierSettings.codRestricted })}
                      className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold border transition-colors
                        ${courierSettings.codRestricted 
                          ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/25' 
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/25'}`}
                    >
                      {courierSettings.codRestricted ? 'Restricted' : 'Allowed'}
                    </button>
                  </div>

                  <button 
                    onClick={() => toast.success('Courier logistic rules saved successfully!')}
                    className="w-full py-4 bg-luxury-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest shadow-glow active:scale-[0.98] transition-all"
                  >
                    Save Logistics Config
                  </button>
                </div>
              </div>
            )}

            {/* TAB 7: CHAT SIMULATOR */}
            {activeTab === 'chat' && (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 rounded-[2rem] border overflow-hidden transition-all duration-300
                ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-black/5 text-slate-800'}`}
              >
                
                {/* Rooms List */}
                <div className={`md:col-span-1 border-r ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                  <div className="p-4 border-b border-current/10">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-luxury-gold">Active Inquiries</h3>
                  </div>
                  <div className="divide-y divide-current/5">
                    {chatRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setActiveChatId(room.id)}
                        className={`w-full text-left p-4 hover:bg-current/5 transition flex flex-col gap-1
                          ${activeChatId === room.id ? 'bg-luxury-gold/10' : ''}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-xs">{room.name}</span>
                          <span className="text-[9px] opacity-50">{room.time}</span>
                        </div>
                        <p className="text-[10px] opacity-60 line-clamp-1">{room.lastMessage}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation Viewport */}
                <div className="md:col-span-2 flex flex-col h-[400px]">
                  {activeChat ? (
                    <>
                      {/* Active Header */}
                      <div className="p-4 border-b border-current/10 flex items-center justify-between">
                        <span className="text-xs font-bold">{activeChat.name}</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" title="Client is online" />
                      </div>

                      {/* Messages scrollarea */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeChat.messages.map((m, idx) => (
                          <div 
                            key={idx}
                            className={`flex ${m.sender === 'seller' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs flex flex-col gap-1
                              ${m.sender === 'seller' 
                                ? 'bg-luxury-gold text-black rounded-tr-none' 
                                : isDarkMode 
                                  ? 'bg-white/5 border border-white/5 rounded-tl-none text-white' 
                                  : 'bg-slate-100 border border-slate-100 rounded-tl-none text-slate-800'
                              }`}
                            >
                              <p className="leading-relaxed">{m.text}</p>
                              <span className="text-[8px] opacity-55 text-right self-end mt-0.5">{m.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Reply box */}
                      <form onSubmit={handleSendChatMessage} className="p-4 border-t border-current/10 flex gap-2">
                        <input 
                          type="text" 
                          value={chatReplyText}
                          onChange={(e) => setChatReplyText(e.target.value)}
                          placeholder="Type couture custom details to reply..."
                          className={`text-xs p-3 rounded-xl border flex-1 outline-none focus:ring-1 focus:ring-luxury-gold
                            ${isDarkMode ? 'border-white/10 bg-transparent text-white' : 'border-slate-200 bg-white'}`}
                        />
                        <button 
                          type="submit"
                          className="px-4 py-2.5 bg-luxury-gold text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-luxury-darkGold shadow-glow active:scale-95 transition-all"
                        >
                          Send
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                      <FiMessageSquare size={36} />
                      <p className="text-xs uppercase font-bold tracking-wider mt-2">Select an inquiry to view</p>
                    </div>
                  )}
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
