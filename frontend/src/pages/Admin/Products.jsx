import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiSave,
  FiImage, FiChevronUp, FiChevronDown, FiPackage, FiAlertTriangle,
  FiUploadCloud, FiStar, FiCheck, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { uploadService } from '../../services/apiServices'
import adminService from '../../services/adminService'

const CATEGORIES = ['shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear']
const GENDERS = ['men', 'women', 'kids', 'unisex']

const EMPTY_FORM = {
  name: '', category: 'shirts', gender: 'men', price: '', originalPrice: '',
  discount: '', stock: '', description: '', shortDescription: '', brand: '', tags: ''
}

// ── Image Upload Zone ──────────────────────────────────────────────────────────
function ImageUploadZone({ images, setImages, isDarkMode }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type)) {
        toast.error(`Invalid file type: ${f.name}`)
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
        toast.success(`${newImages.length} image(s) uploaded!`)
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
        console.warn('Failed to delete from cloud:', err)
      }
    }
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // If main image was removed, set first as main
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
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-luxury-gold bg-luxury-gold/5 scale-[1.01]'
            : isDarkMode
              ? 'border-luxury-darkGray hover:border-luxury-gold/50'
              : 'border-gray-300 hover:border-luxury-gold/50'
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
            <div className="w-8 h-8 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-luxury-gold' : 'text-luxury-darkGold'}`}>
              Uploading... {uploadProgress}%
            </p>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-luxury-darkGray' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-luxury-gold rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <FiUploadCloud size={28} className={`mx-auto mb-2 ${isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-400'}`} />
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'}`}>
              Drop images here or click to browse
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-luxury-mediumGray/60' : 'text-gray-400'}`}>
              JPG, PNG, WebP • Max 5MB each • Up to 5 images
            </p>
          </>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`relative group w-20 h-20 rounded-lg overflow-hidden border-2 transition-all
                ${img.isMain
                  ? 'border-luxury-gold shadow-glow'
                  : isDarkMode
                    ? 'border-luxury-darkGray'
                    : 'border-gray-200'
                }`}
            >
              <img src={img.url} alt={img.alt || `Product ${idx + 1}`} className="w-full h-full object-cover" />

              {/* Main badge */}
              {img.isMain && (
                <span className="absolute top-0.5 left-0.5 bg-luxury-gold text-black text-[8px] font-bold px-1 rounded">
                  MAIN
                </span>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {!img.isMain && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMainImage(idx) }}
                    className="p-1 bg-luxury-gold rounded text-black hover:bg-luxury-darkGold"
                    title="Set as main"
                  >
                    <FiStar size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(idx) }}
                  className="p-1 bg-red-500 rounded text-white hover:bg-red-600"
                  title="Remove"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const { isDarkMode } = useTheme()
  const [form, setForm] = useState(
    product
      ? {
          name: product.name, category: product.category, gender: product.gender,
          price: product.price, originalPrice: product.originalPrice || '',
          discount: product.discount || '', stock: product.stock,
          description: product.description || '', shortDescription: product.shortDescription || '',
          brand: product.brand || '', tags: (product.tags || []).join(', ')
        }
      : EMPTY_FORM
  )
  const [images, setImages] = useState(product?.images || [])
  const [saving, setSaving] = useState(false)

  const inputCls = `w-full border text-sm p-2.5 rounded-lg transition-colors focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold outline-none ${isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`
  const labelCls = `block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-600'}`

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock || !form.description) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const productData = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : Number(form.price),
        discount: form.discount ? Number(form.discount) : 0,
        stock: Number(form.stock),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images,
      }
      await onSave(productData, product?._id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl animate-fade-in ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}><FiX /></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={labelCls}>Product Name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Silk Kurta Set" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category *</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender *</label>
              <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                {GENDERS.map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Price (₹) *</label>
              <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Original Price (₹)</label>
              <input name="originalPrice" type="number" value={form.originalPrice} onChange={handleChange} placeholder="MRP" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Discount %</label>
              <input name="discount" type="number" value={form.discount} onChange={handleChange} placeholder="0" min="0" max="100" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Stock *</label>
              <input name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. SKLP" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Product description (min 10 chars)..." className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Short Description</label>
            <input name="shortDescription" value={form.shortDescription} onChange={handleChange} placeholder="Brief one-liner..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tags (comma separated)</label>
            <input name="tags" value={form.tags} onChange={handleChange} placeholder="e.g. silk, premium, festive" className={inputCls} />
          </div>

          {/* Image Upload */}
          <div>
            <label className={labelCls}>Product Images</label>
            <ImageUploadZone images={images} setImages={setImages} isDarkMode={isDarkMode} />
          </div>
        </div>

        {/* Footer */}
        <div className={`flex gap-3 px-6 py-4 border-t ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          <button onClick={onClose} className={`flex-1 py-2.5 border rounded-xl font-semibold text-sm transition-colors ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:text-white hover:border-luxury-mediumGray' : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-500'}`}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
            {saving ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : <FiSave size={15} />}
            {product ? 'Update' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ product, onConfirm, onClose }) {
  const { isDarkMode } = useTheme()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className={`w-full max-w-sm rounded-2xl border p-6 animate-fade-in text-center ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <FiAlertTriangle size={24} className="text-red-400" />
        </div>
        <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Deactivate Product?</h3>
        <p className={`text-sm mb-6 ${isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'}`}>
          Are you sure you want to deactivate <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>"{product?.name}"</span>? It will be hidden from the store.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className={`flex-1 py-2.5 border rounded-xl font-semibold text-sm transition-colors ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all text-sm">Deactivate</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
function AdminProducts() {
  const { isDarkMode } = useTheme()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteProduct, setDeleteProduct] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })

  useEffect(() => {
    fetchProducts()
  }, [currentPage])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await adminService.getProducts({ page: currentPage, limit: 20 })
      if (res.data.success) {
        setProducts(res.data.products)
        if (res.data.pagination) setPagination(res.data.pagination)
      }
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  const rowHover = isDarkMode ? 'hover:bg-luxury-darkGray/20' : 'hover:bg-gray-50'

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = products
    .filter((p) => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()))
    .filter((p) => categoryFilter === 'All' || p.category === categoryFilter)
    .filter((p) => {
      if (statusFilter === 'All') return true
      if (statusFilter === 'active') return p.isActive === true
      if (statusFilter === 'inactive') return p.isActive === false
      return true
    })
    .sort((a, b) => {
      const av = sortField === 'price' || sortField === 'stock' ? Number(a[sortField]) : (a[sortField] || '')
      const bv = sortField === 'price' || sortField === 'stock' ? Number(b[sortField]) : (b[sortField] || '')
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  const handleSave = async (formData, productId) => {
    try {
      if (productId) {
        const res = await adminService.updateProduct(productId, formData)
        if (res.data.success) {
          setProducts((prev) => prev.map((p) => p._id === productId ? res.data.product : p))
          toast.success('Product updated!')
        }
      } else {
        const res = await adminService.createProduct(formData)
        if (res.data.success) {
          setProducts((prev) => [res.data.product, ...prev])
          toast.success('Product added!')
        }
      }
      setShowModal(false)
      setEditProduct(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product')
    }
  }

  const handleDelete = async () => {
    try {
      const res = await adminService.deleteProduct(deleteProduct._id)
      if (res.data.success) {
        setProducts((prev) => prev.map((p) => p._id === deleteProduct._id ? { ...p, isActive: false } : p))
        toast.success('Product deactivated')
      }
    } catch (error) {
      toast.error('Failed to deactivate product')
    }
    setDeleteProduct(null)
  }

  // Bulk operations
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(p => p._id))
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      toast.warning('Select at least one product')
      return
    }
    try {
      const res = await adminService.bulkUpdateProducts(selectedIds, action)
      if (res.data.success) {
        toast.success(res.data.message)
        setSelectedIds([])
        fetchProducts()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk action failed')
    }
  }

  const SortIcon = ({ field }) => sortField === field
    ? (sortDir === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />)
    : <FiChevronUp size={14} className="opacity-20" />

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Products</h2>
          <p className={`text-sm mt-0.5 ${textSecondary}`}>{pagination.total || products.length} total products</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowModal(true) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow text-sm"
        >
          <FiPlus size={17} /> Add Product
        </button>
      </div>

      {/* Filters + Bulk Actions */}
      <div className={`rounded-xl border p-4 space-y-3 ${cardBg}`}>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <FiSearch size={15} className={`absolute left-3 top-3 ${textSecondary}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className={`w-full pl-9 py-2 border text-sm rounded-lg ${inputBg}`}
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`border text-sm px-3 py-2 rounded-lg min-w-32 ${inputBg}`}>
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`border text-sm px-3 py-2 rounded-lg min-w-28 ${inputBg}`}>
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDarkMode ? 'bg-luxury-gold/5 border-luxury-gold/20' : 'bg-luxury-gold/5 border-luxury-gold/20'}`}>
            <span className="text-sm font-semibold text-luxury-gold">{selectedIds.length} selected</span>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => handleBulkAction('activate')} className="px-3 py-1.5 bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-bold rounded-lg hover:bg-green-500/20 transition-colors">Activate</button>
              <button onClick={() => handleBulkAction('deactivate')} className="px-3 py-1.5 bg-gray-500/10 text-gray-500 border border-gray-500/20 text-xs font-bold rounded-lg hover:bg-gray-500/20 transition-colors">Deactivate</button>
              <button onClick={() => handleBulkAction('feature')} className="px-3 py-1.5 bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 text-xs font-bold rounded-lg hover:bg-luxury-gold/20 transition-colors">Feature</button>
              <button onClick={() => setSelectedIds([])} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${isDarkMode ? 'text-luxury-mediumGray hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}>Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-luxury-black/30 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
                <th className="px-4 py-3.5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                  />
                </th>
                <th className={`px-4 py-3.5 text-left text-xs uppercase tracking-wider ${textSecondary}`}>Product</th>
                {[
                  { key: 'category', label: 'Category' },
                  { key: 'price', label: 'Price' },
                  { key: 'stock', label: 'Stock' },
                  { key: 'isActive', label: 'Status' },
                ].map(({ key, label }) => (
                  <th key={key} className={`px-4 py-3.5 text-left text-xs uppercase tracking-wider cursor-pointer transition-colors ${textSecondary} hover:text-luxury-gold`} onClick={() => handleSort(key)}>
                    <span className="flex items-center gap-1">{label} <SortIcon field={key} /></span>
                  </th>
                ))}
                <th className={`px-4 py-3.5 text-right text-xs uppercase tracking-wider ${textSecondary}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-12 text-center ${textSecondary}`}>
                    <FiPackage size={32} className="mx-auto mb-3 opacity-30" />
                    No products found
                  </td>
                </tr>
              ) : filtered.map((product) => (
                <tr key={product._id} className={`transition-colors group ${rowHover}`}>
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product._id)}
                      onChange={() => toggleSelect(product._id)}
                      className="w-4 h-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden ${isDarkMode ? 'bg-luxury-darkGray text-luxury-gold' : 'bg-gray-100 text-gray-600'}`}>
                        {product.images?.[0]?.url ? (
                          <img src={product.images[0].url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          product.name?.charAt(0)?.toUpperCase() || 'P'
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${textPrimary}`}>{product.name}</p>
                        <p className={`text-xs font-mono ${textSecondary}`}>{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 text-sm capitalize ${textSecondary}`}>{product.category}</td>
                  <td className="px-4 py-3.5">
                    <p className={`text-sm font-semibold ${textPrimary}`}>₹{Number(product.price).toLocaleString('en-IN')}</p>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <p className={`text-xs line-through ${textSecondary}`}>₹{Number(product.originalPrice).toLocaleString('en-IN')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-sm font-semibold ${product.stock === 0 ? 'text-red-500' : product.stock < 10 ? 'text-orange-500' : textPrimary}`}>
                      {product.stock === 0 ? 'Out of stock' : product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      product.isActive
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`}>
                      {product.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditProduct(product); setShowModal(true) }}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-luxury-gold/10 text-luxury-mediumGray hover:text-luxury-gold' : 'hover:bg-luxury-gold/10 text-gray-400 hover:text-luxury-gold'}`}
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteProduct(product)}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-900/20 text-luxury-mediumGray hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          <span className={`text-xs ${textSecondary}`}>
            Showing {filtered.length} of {pagination.total || products.length} products
          </span>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <FiChevronLeft size={16} />
              </button>
              <span className={`text-xs font-semibold ${textPrimary}`}>
                {currentPage} / {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && <ProductModal product={editProduct} onSave={handleSave} onClose={() => { setShowModal(false); setEditProduct(null) }} />}
      {deleteProduct && <DeleteConfirm product={deleteProduct} onConfirm={handleDelete} onClose={() => setDeleteProduct(null)} />}
    </div>
  )
}

export default AdminProducts
