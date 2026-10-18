import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import {
  FiCheckCircle, FiAlertCircle, FiClock,
  FiBriefcase, FiShoppingBag,
  FiArrowRight, FiArrowLeft, FiCheck, FiUpload,
  FiTrash2, FiFileText, FiEye, FiDownload, FiInfo, FiEdit3, FiSmartphone, FiUser
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../config/firebase'
import kycService from '../services/kycService'
import { sellerApplicationService, uploadService } from '@services/apiServices'
import SellerTermsModal from '../components/Shop/SellerTermsModal'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
]

const FASHION_CATEGORIES = [
  'Men Fashion', 'Women Fashion', 'Ethnic Wear', 'Western Wear',
  'Footwear', 'Accessories & Jewelry', 'Luxury & Designer', 'Kids Fashion'
]

export default function BecomeSeller() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { isDarkMode } = useTheme()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [appStatus, setAppStatus] = useState(null)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // Firebase Phone Verification State
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneStep, setPhoneStep] = useState(1) // 1: idle/input, 2: enter otp
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)
  const recaptchaVerifierRef = useRef(null)

  // Shop & Brand Name Availability State
  const [checkingShopName, setCheckingShopName] = useState(false)
  const [shopNameResult, setShopNameResult] = useState(null)
  const [checkingBrandName, setCheckingBrandName] = useState(false)
  const [brandNameResult, setBrandNameResult] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Owner Details
    ownerName: '',
    dob: '',
    email: '',
    phone: '',
    altPhone: '',
    businessType: 'individual',

    // Step 2: Shop Details
    shopName: '',
    brandName: '',
    productCategories: ['Men Fashion', 'Women Fashion'],
    storeDescription: '',
    businessEmail: '',
    businessPhone: '',
    yearEstablished: '',
    gstNumber: '',
    deliveryMode: 'PAID_DELIVERY',

    // Step 3: Address
    businessAddress: {
      street: '',
      street2: '',
      landmark: '',
      city: '',
      district: '',
      state: 'Telangana',
      postalCode: '',
      country: 'India'
    },
    pickupAddressSameAsBusiness: true,
    pickupAddress: {
      street: '',
      street2: '',
      landmark: '',
      city: '',
      district: '',
      state: 'Telangana',
      postalCode: '',
      country: 'India'
    },

    // Step 4: Shop Photos (min 2, max 4)
    shopImages: [],

    // Step 5: Owner Photo
    ownerPhoto: null,

    // Step 6: Signature
    signature: null,

    // Terms Acceptance
    termsAccepted: false,
    sellerTermsVersion: 'v1.0'
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/become-a-seller')
      return
    }

    if (user) {
      const resolvedName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || ''
      setFormData(prev => ({
        ...prev,
        ownerName: prev.ownerName || resolvedName,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }))
      if (user.isPhoneVerified) {
        setPhoneVerified(true)
      }
    }

    fetchStatus()
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    // Check genuine KYC phone status from backend
    if (isAuthenticated) {
      kycService.getMyKycStatus()
        .then(res => {
          if (res.data?.kyc?.phone?.status === 'VERIFIED') {
            setPhoneVerified(true)
          }
        })
        .catch(() => {})
    }
  }, [isAuthenticated])

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear() } catch (_e) { /* ignore */ }
        recaptchaVerifierRef.current = null
      }
    }
  }, [])

  // Firebase Phone OTP Handlers
  const handleSendPhoneOtp = async () => {
    const raw = formData.phone || ''
    const digits = raw.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.')
      return
    }

    setPhoneLoading(true)
    const e164 = `+91${digits}`

    try {
      if (!auth) throw new Error('Secure phone verification service is initializing. Please try again.')

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'seller-phone-recaptcha-container', {
          size: 'invisible',
          callback: () => {}
        })
      }

      const confirmation = await signInWithPhoneNumber(auth, e164, recaptchaVerifierRef.current)
      setConfirmResult(confirmation)
      setPhoneStep(2)
      toast.success(`Verification code sent to ${e164}`)
    } catch (err) {
      console.error('[Phone OTP] Send failed:', err)
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear() } catch (_e) { /* ignore */ }
        recaptchaVerifierRef.current = null
      }
      toast.error(err.message || 'Failed to dispatch SMS verification code.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyPhoneOtp = async () => {
    const cleanOtp = phoneOtp.trim()
    if (!cleanOtp || cleanOtp.length < 6) {
      toast.error('Please enter the 6-digit SMS verification code.')
      return
    }
    if (!confirmResult) {
      toast.error('Verification session expired. Please resend code.')
      setPhoneStep(1)
      return
    }

    setPhoneLoading(true)
    try {
      const credential = await confirmResult.confirm(cleanOtp)
      const idToken = await credential.user.getIdToken(true)

      const res = await kycService.verifyPhone(idToken, formData.phone)
      if (res.data?.success) {
        toast.success('Mobile number verified successfully!')
        setPhoneVerified(true)
        setPhoneStep(1)
      } else {
        toast.error(res.data?.message || 'Phone verification failed on server.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid SMS verification code.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await sellerApplicationService.getStatus()
      if (res.data?.success) {
        setAppStatus(res.data)
        if (res.data.application) {
          const app = res.data.application
          // Populate form data from previous application
          setFormData(prev => ({
            ...prev,
            ownerName: app.ownerName || app.applicantName || prev.ownerName,
            dob: app.dob || prev.dob,
            email: app.email || prev.email,
            phone: app.phone || prev.phone,
            altPhone: app.altPhone || prev.altPhone,
            shopName: app.shopName || prev.shopName,
            brandName: app.brandName || prev.brandName,
            businessType: app.businessType || prev.businessType,
            productCategories: app.productCategories?.length ? app.productCategories : prev.productCategories,
            storeDescription: app.storeDescription || prev.storeDescription,
            businessEmail: app.businessEmail || prev.businessEmail,
            businessPhone: app.businessPhone || prev.businessPhone,
            yearEstablished: app.yearEstablished || prev.yearEstablished,
            gstNumber: app.gstNumber || prev.gstNumber,
            deliveryMode: app.deliveryMode || prev.deliveryMode,
            businessAddress: { ...prev.businessAddress, ...(app.businessAddress || {}) },
            pickupAddressSameAsBusiness: app.pickupAddressSameAsBusiness !== false,
            pickupAddress: { ...prev.pickupAddress, ...(app.pickupAddress || {}) },
            shopImages: app.shopImages || [],
            ownerPhoto: app.ownerPhoto || null,
            signature: app.signature || null
          }))
          if (app.shopName) {
            setShopNameResult({ available: true, slug: app.shopName.toLowerCase().replace(/[^a-z0-9]/g, '-') })
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch application status:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Shop Name Availability Check
  const handleCheckShopName = async (name) => {
    setFormData(prev => ({ ...prev, shopName: name }))
    setShopNameResult(null)
    if (!name || name.trim().length < 3) return

    setCheckingShopName(true)
    try {
      const res = await sellerApplicationService.checkShopName(name.trim())
      setShopNameResult(res.data)
    } catch (err) {
      setShopNameResult({
        available: false,
        reason: err.response?.data?.message || 'Error checking shop name.'
      })
    } finally {
      setCheckingShopName(false)
    }
  }

  // Brand Name Availability & Uniqueness Check
  const handleCheckBrandName = async (name) => {
    setFormData(prev => ({ ...prev, brandName: name }))
    setBrandNameResult(null)
    if (!name || name.trim().length < 3) return

    setCheckingBrandName(true)
    try {
      const res = await sellerApplicationService.checkShopName(name.trim())
      setBrandNameResult(res.data)
    } catch (err) {
      setBrandNameResult({
        available: false,
        reason: err.response?.data?.message || 'Error validating brand name.'
      })
    } finally {
      setCheckingBrandName(false)
    }
  }

  // Generic File Upload Helper
  const uploadSingleFile = async (file) => {
    if (!file) return null
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return null
    }
    const res = await uploadService.uploadImages([file])
    if (res.data?.success && res.data.images?.[0]) {
      return res.data.images[0]
    }
    throw new Error('Upload failed')
  }

  // Shop Photos Upload
  const handleShopImagesUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (formData.shopImages.length + files.length > 4) {
      toast.error('A maximum of 4 shop images is permitted.')
      return
    }

    try {
      toast.info(`Uploading ${files.length} shop image(s)...`)
      const res = await uploadService.uploadImages(files)
      if (res.data?.success && res.data.images) {
        const newImages = res.data.images.map(img => ({
          url: img.url,
          publicId: img.publicId,
          imageType: 'shop_exterior',
          uploadedAt: new Date()
        }))
        setFormData(prev => ({
          ...prev,
          shopImages: [...prev.shopImages, ...newImages].slice(0, 4)
        }))
        toast.success('Shop image(s) uploaded successfully!')
      }
    } catch {
      toast.error('Failed to upload shop image(s). Please try again.')
    }
  }

  const removeShopImage = (index) => {
    setFormData(prev => ({
      ...prev,
      shopImages: prev.shopImages.filter((_, idx) => idx !== index)
    }))
  }

  // Owner Photo Upload
  const handleOwnerPhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      toast.info('Uploading owner photograph...')
      const uploaded = await uploadSingleFile(file, 'avatars')
      if (uploaded) {
        setFormData(prev => ({
          ...prev,
          ownerPhoto: {
            url: uploaded.url,
            publicId: uploaded.publicId,
            uploadedAt: new Date()
          }
        }))
        toast.success('Owner photograph uploaded successfully!')
      }
    } catch {
      toast.error('Failed to upload owner photograph.')
    }
  }

  // Signature Upload
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      toast.info('Uploading signature...')
      const uploaded = await uploadSingleFile(file, 'signatures')
      if (uploaded) {
        setFormData(prev => ({
          ...prev,
          signature: {
            url: uploaded.url,
            publicId: uploaded.publicId,
            uploadedAt: new Date()
          }
        }))
        toast.success('Signature uploaded successfully!')
      }
    } catch {
      toast.error('Failed to upload signature.')
    }
  }

  // Download Server Agreement PDF
  const handleDownloadAgreementPdf = async () => {
    try {
      setDownloadingPdf(true)
      toast.info('Generating official Seller Agreement PDF...')
      const response = await sellerApplicationService.downloadAgreementPdf()
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const ref = appStatus?.application?.applicationReference || 'Agreement'
      link.href = url
      link.setAttribute('download', `StyleStreet_Seller_Agreement_${ref}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Seller Agreement PDF downloaded!')
    } catch (err) {
      console.error('PDF download error:', err)
      toast.error('Could not download agreement PDF. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Submit Application
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    if (formData.shopImages.length < 2) {
      toast.error('Please upload at least 2 shop images.')
      setStep(4)
      return
    }

    if (!formData.ownerPhoto?.url) {
      toast.error('Please upload an owner photograph.')
      setStep(5)
      return
    }

    if (!formData.signature?.url) {
      toast.error('Please upload your signature.')
      setStep(6)
      return
    }

    if (!formData.termsAccepted) {
      toast.error('You must accept the Seller Terms & Conditions.')
      setStep(7)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        applicantName: formData.ownerName.trim(),
        ownerName: formData.ownerName.trim(),
        dob: formData.dob,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        altPhone: formData.altPhone.trim(),
        shopName: formData.shopName.trim(),
        brandName: (formData.brandName || formData.shopName).trim(),
        businessType: formData.businessType,
        productCategories: formData.productCategories,
        storeDescription: formData.storeDescription,
        businessEmail: formData.businessEmail || formData.email,
        businessPhone: formData.businessPhone || formData.phone,
        yearEstablished: formData.yearEstablished,
        businessAddress: formData.businessAddress,
        pickupAddressSameAsBusiness: formData.pickupAddressSameAsBusiness,
        pickupAddress: formData.pickupAddressSameAsBusiness ? formData.businessAddress : formData.pickupAddress,
        deliveryMode: formData.deliveryMode || 'PAID_DELIVERY',
        shopImages: formData.shopImages,
        ownerPhoto: formData.ownerPhoto,
        signature: formData.signature,
        gstNumber: formData.gstNumber ? formData.gstNumber.toUpperCase() : '',
        termsAccepted: true,
        sellerTermsVersion: formData.sellerTermsVersion || 'v1.0'
      }

      const res = await sellerApplicationService.submitApplication(payload)
      if (res.data?.success) {
        toast.success(res.data.message || 'Application submitted successfully!')
        await fetchStatus()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit seller application.')
    } finally {
      setSubmitting(false)
    }
  }

  const cardBg = isDarkMode ? 'bg-[#18181b] border-gray-800' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-black/40 border-gray-700 text-white focus:border-amber-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-amber-500'

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className={`text-xs uppercase font-bold tracking-widest ${textSecondary}`}>Loading Seller Hub...</p>
      </div>
    )
  }

  // ── 1. ACTIVE SELLER APPROVED SCREEN ──────────────────────────────────────
  if (appStatus?.isApprovedSeller || appStatus?.application?.status === 'APPROVED') {
    const app = appStatus.application || {}
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className={`rounded-3xl border p-5 sm:p-8 space-y-5 sm:space-y-6 text-center ${cardBg} shadow-2xl`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/10 border-2 border-green-500/30 text-green-500 rounded-full flex items-center justify-center mx-auto text-3xl sm:text-4xl shadow-glow">
            <FiCheckCircle />
          </div>
          <h2 className={`text-2xl sm:text-3xl font-serif font-bold ${textPrimary}`}>
            Welcome to STYLE STREET Merchant Network
          </h2>
          <p className={`text-xs sm:text-sm max-w-lg mx-auto ${textSecondary}`}>
            Your store <strong className="text-amber-500 font-bold">{app.shopName || appStatus.seller?.shopName}</strong> is verified and approved. Your <span className="text-green-500 font-bold">30-Day Free Trial</span> is active with standard 5% platform commission.
          </p>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Application Reference:</span>
              <span className="font-mono font-bold text-amber-500">{app.applicationReference || `SSA-${app._id?.slice(-8)}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Approved Brand:</span>
              <span className="font-bold text-white">{app.brandName || app.shopName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Agreement Status:</span>
              <span className="font-semibold text-green-500">Executed & Verified ({app.sellerTermsVersion || 'v1.0'})</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            <Link
              to="/seller/dashboard"
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 touch-target"
            >
              <FiShoppingBag /> Go to Seller Dashboard
            </Link>
            <button
              onClick={handleDownloadAgreementPdf}
              disabled={downloadingPdf}
              className={`w-full sm:w-auto px-5 py-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 touch-target ${isDarkMode ? 'border-gray-700 hover:bg-white/5 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-800'}`}
            >
              <FiDownload /> {downloadingPdf ? 'Downloading...' : 'Download Agreement PDF'}
            </button>
            {appStatus.seller?.shopSlug && (
              <Link
                to={`/shop/${appStatus.seller.shopSlug}`}
                className={`w-full sm:w-auto px-5 py-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 touch-target ${isDarkMode ? 'border-gray-700 hover:bg-white/5 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-800'}`}
              >
                <FiEye /> View Public Shop
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 2. PENDING REVIEW SCREEN ──────────────────────────────────────────────
  if (appStatus?.hasApplication && appStatus.application?.status === 'PENDING_REVIEW') {
    const app = appStatus.application
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className={`rounded-3xl border p-5 sm:p-8 space-y-5 sm:space-y-6 text-center ${cardBg} shadow-2xl`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl sm:text-4xl">
            <FiClock />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-widest">
              Application Under Review
            </span>
            <h2 className={`text-xl sm:text-2xl font-serif font-bold ${textPrimary}`}>
              Application Submitted Successfully
            </h2>
            <p className={`text-xs sm:text-sm max-w-md mx-auto ${textSecondary}`}>
              Your application for <strong className="text-amber-500">{app.shopName}</strong> has been received and is currently under compliance review by the STYLE STREET administration.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/20 border border-white/10 text-left text-xs space-y-2 max-w-md mx-auto">
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Application Reference:</span>
              <span className="font-mono font-bold text-amber-500 text-sm">
                {app.applicationReference || `SSA-${app._id?.slice(-8)}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Owner Full Name:</span>
              <span className="font-semibold text-white">{app.ownerName || app.applicantName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Current Status:</span>
              <span className="font-bold text-amber-400">PENDING REVIEW</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={textSecondary}>Submission Date:</span>
              <span className={textSecondary}>{new Date(app.updatedAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            <button
              onClick={handleDownloadAgreementPdf}
              disabled={downloadingPdf}
              className="w-full sm:w-auto px-5 py-3 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 touch-target"
            >
              <FiDownload /> {downloadingPdf ? 'Generating PDF...' : 'Download Agreement PDF'}
            </button>
            <button
              onClick={() => setAppStatus(null)}
              className={`w-full sm:w-auto px-4 py-3 border rounded-xl text-xs font-semibold touch-target ${isDarkMode ? 'border-gray-700 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}
            >
              Update Information
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 3. CORRECTION REQUIRED / REJECTED SCREEN ──────────────────────────────
  if (appStatus?.hasApplication && (appStatus.application?.status === 'NEEDS_CORRECTION' || appStatus.application?.status === 'REQUEST_CHANGES' || appStatus.application?.status === 'REJECTED')) {
    const app = appStatus.application
    const isCorrection = app.status === 'NEEDS_CORRECTION' || app.status === 'REQUEST_CHANGES'
    const reasonText = app.correctionReason || app.rejectionReason || app.adminNotes || 'Please correct the business information as requested.'

    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className={`rounded-3xl border p-5 sm:p-8 space-y-5 sm:space-y-6 text-center ${cardBg} shadow-2xl`}>
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto text-3xl sm:text-4xl ${isCorrection ? 'bg-orange-500/10 border-2 border-orange-500/30 text-orange-500' : 'bg-red-500/10 border-2 border-red-500/30 text-red-500'}`}>
            <FiAlertCircle />
          </div>

          <div className="space-y-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isCorrection ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
              {isCorrection ? 'Application Requires Correction' : 'Application Needs Correction'}
            </span>
            <h2 className={`text-xl sm:text-2xl font-serif font-bold ${textPrimary}`}>
              {isCorrection ? 'Action Required on Your Application' : 'Application Update'}
            </h2>
            <p className={`text-xs sm:text-sm max-w-md mx-auto ${textSecondary}`}>
              The compliance team reviewed your application for <strong className="text-amber-500">{app.shopName}</strong> and provided the following instructions.
            </p>
          </div>

          {/* Admin Reason Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-left space-y-1.5 max-w-md mx-auto">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
              Compliance Reviewer Instructions:
            </span>
            <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
              "{reasonText}"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => setAppStatus(null)}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 touch-target"
            >
              <FiEdit3 /> Edit & Resubmit Application
            </button>
            <button
              onClick={handleDownloadAgreementPdf}
              disabled={downloadingPdf}
              className={`w-full sm:w-auto px-4 py-3 border rounded-xl text-xs font-semibold touch-target ${isDarkMode ? 'border-gray-700 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}
            >
              <FiDownload /> {downloadingPdf ? 'Downloading...' : 'Download Submitted Agreement'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 4. MULTI-STEP SELLER ONBOARDING WIZARD ────────────────────────────────
  const stepsList = [
    { num: 1, title: 'Owner Details' },
    { num: 2, title: 'Shop Details' },
    { num: 3, title: 'Address' },
    { num: 4, title: 'Shop Photos' },
    { num: 5, title: 'Owner Photo' },
    { num: 6, title: 'Signature' },
    { num: 7, title: 'Terms & Agreement' },
    { num: 8, title: 'Review & Submit' }
  ]

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 md:py-12">
      {/* Header Banner */}
      <div className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
          <FiBriefcase size={13} /> STYLE STREET Merchant Portal
        </span>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-serif font-bold ${textPrimary}`}>
          Seller Onboarding & Merchant Application
        </h1>
        <p className={`text-xs sm:text-sm max-w-xl mx-auto ${textSecondary}`}>
          Complete the professional seller registration to retail on STYLE STREET. Enjoy a <strong className="text-amber-500">30-day Free Trial</strong> and transparent 5% platform commission.
        </p>
      </div>

      {/* Mobile Step Progress Indicator (Interactive compact bar for screens under md) */}
      <div className="md:hidden mb-4 p-3.5 rounded-2xl border bg-black/20 border-white/10 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-amber-500">Step {step} of 8</span>
          <span className="font-semibold text-white/90 truncate max-w-[200px]">{stepsList[step - 1]?.title}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>
      </div>

      {/* Progress Steps Navigator */}
      <div className="overflow-x-auto pb-3 mb-6 sm:mb-8 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 min-w-[700px] justify-between">
          {stepsList.map((s) => {
            const isActive = step === s.num
            const isDone = step > s.num
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border touch-target ${
                  isActive
                    ? 'bg-amber-500 text-black border-amber-500 shadow-md'
                    : isDone
                    ? 'bg-green-500/10 text-green-500 border-green-500/30'
                    : isDarkMode ? 'bg-black/30 border-gray-800 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                {isDone ? <FiCheck size={12} /> : <span>{s.num}.</span>}
                <span className="truncate max-w-[90px]">{s.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <div className={`rounded-3xl border p-4 sm:p-6 md:p-8 ${cardBg} shadow-2xl`}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

          {/* ── STEP 1: OWNER DETAILS ────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 1: Owner Details</h3>
                <p className={`text-xs ${textSecondary}`}>Provide the primary business owner / legal signatory particulars.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Owner Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="As appearing on official ID"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit primary mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
              </div>

              {/* Firebase Phone OTP Verification Panel */}
              <div className="p-3.5 rounded-2xl border bg-black/20 border-white/10 space-y-2.5">
                <div id="seller-phone-recaptcha-container"></div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FiSmartphone className="text-amber-500" size={16} />
                    <div>
                      <span className="text-xs font-bold text-white">Secure Mobile Phone OTP Verification</span>
                      <p className={`text-[11px] ${textSecondary}`}>Verified identity confirmation for merchant onboarding.</p>
                    </div>
                  </div>
                  {phoneVerified ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/30 flex items-center gap-1.5">
                      <FiCheckCircle size={13} /> Verified & Secured
                    </span>
                  ) : phoneStep === 1 ? (
                    <button
                      type="button"
                      disabled={phoneLoading || formData.phone.length < 10}
                      onClick={handleSendPhoneOtp}
                      className="px-4 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-all shadow-sm"
                    >
                      {phoneLoading ? 'Sending SMS…' : 'Send Phone OTP'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setPhoneStep(1); setPhoneOtp('') }}
                      className={`text-xs ${textSecondary} hover:underline`}
                    >
                      Change Number / Resend
                    </button>
                  )}
                </div>

                {!phoneVerified && phoneStep === 2 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit SMS OTP"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                      className={`py-2 px-3.5 rounded-xl border text-sm tracking-widest font-mono ${inputBg} flex-1 max-w-xs`}
                    />
                    <button
                      type="button"
                      disabled={phoneLoading || phoneOtp.length < 6}
                      onClick={handleVerifyPhoneOtp}
                      className="px-5 py-2 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 disabled:opacity-40 transition-all flex items-center gap-1"
                    >
                      {phoneLoading ? 'Verifying…' : 'Verify Code'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Alternative Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Secondary contact number"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value.replace(/\D/g, '') })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Business / Owner Type *</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm capitalize ${inputBg}`}
                  >
                    <option value="individual">Individual / Proprietor</option>
                    <option value="proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership Firm</option>
                    <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
                    <option value="other">Other Registered Entity</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.ownerName.trim() || !formData.email.trim() || formData.phone.length < 10) {
                      toast.error('Please complete required owner fields.')
                      return
                    }
                    setStep(2)
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Shop Details <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: SHOP DETAILS ─────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 2: Shop Details & Brand Name</h3>
                <p className={`text-xs ${textSecondary}`}>Choose your shop name, controlled brand identity, and commercial categories.</p>
              </div>

              {/* Shop Name with live validation */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                  Shop / Business Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.shopName}
                    onChange={(e) => handleCheckShopName(e.target.value)}
                    placeholder="e.g. Royal Silks, Street Weave, Anji Fashion"
                    className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold ${inputBg}`}
                  />
                  {checkingShopName && (
                    <span className="absolute right-3 top-3.5 text-xs text-amber-500 animate-pulse">Checking…</span>
                  )}
                </div>

                {shopNameResult && (
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${shopNameResult.available ? 'text-green-500' : 'text-red-500'}`}>
                    {shopNameResult.available ? <FiCheckCircle /> : <FiAlertCircle />}
                    {shopNameResult.reason}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Seller Brand Name</label>
                    <span className="text-[10px] text-luxury-gold uppercase font-mono">Must be unique</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Default is shop name"
                      value={formData.brandName}
                      onChange={(e) => handleCheckBrandName(e.target.value)}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                    {checkingBrandName && (
                      <span className="absolute right-3 top-3 text-xs text-amber-500 animate-pulse">Checking…</span>
                    )}
                  </div>
                  {brandNameResult && (
                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${brandNameResult.available ? 'text-green-500' : 'text-red-500'}`}>
                      {brandNameResult.available ? <FiCheckCircle /> : <FiAlertCircle />}
                      {brandNameResult.reason}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Year Established (Optional)</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2018"
                    value={formData.yearEstablished}
                    onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Product Categories</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {FASHION_CATEGORIES.map(cat => {
                    const isSelected = formData.productCategories.includes(cat)
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            productCategories: isSelected
                              ? prev.productCategories.filter(c => c !== cat)
                              : [...prev.productCategories, cat]
                          }))
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-500'
                            : isDarkMode ? 'border-gray-800 text-gray-400 hover:border-gray-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {isSelected && <FiCheck className="inline mr-1" size={12} />}
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Business Description */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Business Description</label>
                <textarea
                  rows={3}
                  placeholder="Tell customers about your apparel collections, materials, and fashion heritage..."
                  value={formData.storeDescription}
                  onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
                  className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              {/* Tax Numbers */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>GSTIN (Optional / Where applicable)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 36AAAAA0000A1Z5 (Optional for small sellers)"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                  className={`w-full py-2.5 px-3.5 rounded-xl border text-sm uppercase ${inputBg}`}
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.shopName.trim() || formData.shopName.length < 3) {
                      toast.error('Please enter a valid shop name.')
                      return
                    }
                    setStep(3)
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Address <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: BUSINESS & PICKUP ADDRESS ───────────────────────────── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 3: Business & Pickup Address</h3>
                <p className={`text-xs ${textSecondary}`}>Enter your registered business premises and courier pickup location.</p>
              </div>

              {/* Registered Address */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Registered Business Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="col-span-full space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>Address Line 1 (Street / Building) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Door no, Building name, Street"
                      value={formData.businessAddress.street}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, street: e.target.value }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      placeholder="Floor, Suite, Unit"
                      value={formData.businessAddress.street2}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, street2: e.target.value }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="Near landmark"
                      value={formData.businessAddress.landmark}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, landmark: e.target.value }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>Village / Town / City *</label>
                    <input
                      type="text"
                      required
                      placeholder="City or Town"
                      value={formData.businessAddress.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, city: e.target.value }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>District *</label>
                    <input
                      type="text"
                      required
                      placeholder="District"
                      value={formData.businessAddress.district}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, district: e.target.value }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>State *</label>
                    <select
                      value={formData.businessAddress.state}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, state: e.target.value }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    >
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${textSecondary}`}>PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="6-digit PIN"
                      value={formData.businessAddress.postalCode}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, postalCode: e.target.value.replace(/\D/g, '') }
                      })}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Address Checkbox */}
              <div className="pt-2 border-t border-gray-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pickupAddressSameAsBusiness}
                    onChange={(e) => setFormData({ ...formData, pickupAddressSameAsBusiness: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className={`text-xs font-bold ${textPrimary}`}>
                    Pickup address is the same as business address
                  </span>
                </label>
              </div>

              {/* Separate Pickup Address If Unchecked */}
              {!formData.pickupAddressSameAsBusiness && (
                <div className="space-y-3 p-4 rounded-2xl bg-black/20 border border-white/10 animate-fade-in">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Courier Dispatch / Pickup Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="col-span-full space-y-1">
                      <label className={`text-[11px] font-bold ${textSecondary}`}>Address Line 1 *</label>
                      <input
                        type="text"
                        required
                        value={formData.pickupAddress.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          pickupAddress: { ...formData.pickupAddress, street: e.target.value }
                        })}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${textSecondary}`}>City *</label>
                      <input
                        type="text"
                        required
                        value={formData.pickupAddress.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          pickupAddress: { ...formData.pickupAddress, city: e.target.value }
                        })}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${textSecondary}`}>State *</label>
                      <select
                        value={formData.pickupAddress.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          pickupAddress: { ...formData.pickupAddress, state: e.target.value }
                        })}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                      >
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${textSecondary}`}>PIN Code *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formData.pickupAddress.postalCode}
                        onChange={(e) => setFormData({
                          ...formData,
                          pickupAddress: { ...formData.pickupAddress, postalCode: e.target.value.replace(/\D/g, '') }
                        })}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = formData.businessAddress
                    if (!b.street || !b.city || !b.postalCode || b.postalCode.length !== 6) {
                      toast.error('Please complete valid business address with 6-digit PIN.')
                      return
                    }
                    if (!formData.pickupAddressSameAsBusiness) {
                      const p = formData.pickupAddress
                      if (!p.street || !p.city || !p.postalCode || p.postalCode.length !== 6) {
                        toast.error('Please complete valid pickup address with 6-digit PIN.')
                        return
                      }
                    }
                    setStep(4)
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Shop Photos <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: SHOP PHOTOS ─────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 4: Shop Photographs</h3>
                <p className={`text-xs ${textSecondary}`}>Upload minimum 2 and maximum 4 photographs showing your physical shop, boutique front, or warehouse.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-center gap-2">
                <FiInfo size={16} />
                <span>Required: Minimum 2 images, Maximum 4 images (JPG, PNG, WebP up to 5MB each).</span>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-gray-700 rounded-2xl p-6 text-center hover:border-amber-500 transition-colors">
                <input
                  type="file"
                  id="shop-images-input"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleShopImagesUpload}
                  className="hidden"
                />
                <label htmlFor="shop-images-input" className="cursor-pointer space-y-2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl">
                    <FiUpload />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-500 hover:underline">Click to upload shop photos</span>
                    <p className={`text-[11px] ${textSecondary}`}>Upload exterior facade, interior racks, or store signage.</p>
                  </div>
                </label>
              </div>

              {/* Photos Preview Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {formData.shopImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video">
                    <img src={img.url} alt={`Shop ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeShopImage(idx)}
                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        title="Remove photo"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-black/80 text-white font-mono">
                      Photo {idx + 1}/4
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.shopImages.length < 2) {
                      toast.error('Please upload at least 2 shop images.')
                      return
                    }
                    setStep(5)
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Owner Photo <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: OWNER PHOTOGRAPH ────────────────────────────────────── */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 5: Owner Photograph</h3>
                <p className={`text-xs ${textSecondary}`}>Upload one clear photograph of the legal owner/applicant.</p>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-2 text-xs">
                <p className="font-bold text-amber-500 uppercase tracking-wider text-[11px]">Photograph Guidelines:</p>
                <ul className={`list-disc pl-5 space-y-1 ${textSecondary}`}>
                  <li>Face should be clearly visible and front-facing</li>
                  <li>Use adequate, clear lighting (avoid heavy shadows)</li>
                  <li>Do not use heavily filtered or edited photos</li>
                  <li>Use a recent waist-up or half-body portrait</li>
                </ul>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
                {formData.ownerPhoto?.url ? (
                  <div className="relative group w-40 h-48 rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-black">
                    <img src={formData.ownerPhoto.url} alt="Owner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ownerPhoto: null })}
                        className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold flex items-center gap-1"
                      >
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-40 h-48 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-4 text-center">
                    <FiUser className="text-3xl text-gray-500 mb-2" />
                    <span className={`text-[10px] ${textSecondary}`}>No photo uploaded</span>
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                    {formData.ownerPhoto?.url ? 'Replace Owner Photograph' : 'Upload Owner Photograph *'}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleOwnerPhotoUpload}
                    className="text-xs file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-amber-500 file:text-black file:font-bold file:text-xs file:cursor-pointer"
                  />
                  <p className={`text-[11px] ${textSecondary}`}>Supported formats: JPEG, PNG, WebP (Max 5MB)</p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.ownerPhoto?.url) {
                      toast.error('Please upload an owner photograph.')
                      return
                    }
                    setStep(6)
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Signature <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 6: SIGNATURE ───────────────────────────────────────────── */}
          {step === 6 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 6: Signature Upload</h3>
                <p className={`text-xs ${textSecondary}`}>Upload a clear photograph or scan of your handwritten signature on plain white paper.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                Note: Uploaded signatures are recorded as part of your onboarding agreement record and printed on the official Seller Agreement document.
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
                {formData.signature?.url ? (
                  <div className="relative group w-64 h-32 rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-white p-2 flex items-center justify-center">
                    <img src={formData.signature.url} alt="Signature" className="max-w-full max-h-full object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, signature: null })}
                        className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold flex items-center gap-1"
                      >
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-32 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-4 text-center">
                    <FiEdit3 className="text-2xl text-gray-500 mb-1" />
                    <span className={`text-[10px] ${textSecondary}`}>No signature uploaded</span>
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                    {formData.signature?.url ? 'Replace Signature' : 'Upload Signature Image *'}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSignatureUpload}
                    className="text-xs file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-amber-500 file:text-black file:font-bold file:text-xs file:cursor-pointer"
                  />
                  <p className={`text-[11px] ${textSecondary}`}>Sign on plain white paper with blue/black ink. Ensure good lighting and crop tightly.</p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.signature?.url) {
                      toast.error('Please upload your signature image.')
                      return
                    }
                    setStep(7)
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Terms & Agreement <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 7: SELLER TERMS & CONDITIONS ───────────────────────────── */}
          {step === 7 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 7: Seller Terms & Conditions</h3>
                <p className={`text-xs ${textSecondary}`}>Review the 24 statutory operating clauses and platform commercials.</p>
              </div>

              {/* Commercial Summary Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[10px] uppercase font-bold text-amber-500">Platform Commission</span>
                  <p className="text-xl font-bold text-white mt-1">5% Flat</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Applied to eligible net merchandise sales</p>
                </div>
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
                  <span className="text-[10px] uppercase font-bold text-green-500">Free Trial</span>
                  <p className="text-xl font-bold text-white mt-1">30 Days</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Zero recurring fee upon initial approval</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                  <span className="text-[10px] uppercase font-bold text-blue-400">Settlement Payout</span>
                  <p className="text-xl font-bold text-white mt-1">7 Days</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Post confirmed delivery directly to merchant</p>
                </div>
              </div>

              {/* View Full Terms Button */}
              <div className="p-4 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiFileText className="text-amber-500 text-xl" />
                  <div>
                    <p className={`text-xs font-bold ${textPrimary}`}>STYLE STREET Seller Terms & Conditions (v1.0)</p>
                    <p className={`text-[11px] ${textSecondary}`}>Covers product authenticity, inventory, packaging, customer privacy & settlements.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/20"
                >
                  Read Full Terms (24 Clauses)
                </button>
              </div>

              {/* Mandatory Acceptance Checkbox (UNCHECKED BY DEFAULT) */}
              <div className="p-4 rounded-2xl bg-black/30 border border-amber-500/30 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className={`text-xs leading-relaxed font-semibold ${textPrimary}`}>
                    I have read, understood, and agree to the <strong>STYLE STREET Seller Terms & Conditions</strong> and the <strong>Seller Onboarding Agreement</strong>. I certify that all information submitted is genuine and legally authorized.
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  disabled={!formData.termsAccepted}
                  onClick={() => setStep(8)}
                  className="px-6 py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  Review Application <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 8: APPLICATION REVIEW & SUBMIT ─────────────────────────── */}
          {step === 8 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="border-b pb-3 border-gray-800">
                <h3 className={`text-base font-bold ${textPrimary}`}>Step 8: Application Review</h3>
                <p className={`text-xs ${textSecondary}`}>Verify your submitted particulars before final compliance review submission.</p>
              </div>

              {/* Summary Sections */}
              <div className="space-y-4 text-xs">
                {/* 1. Owner & Shop Summary */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="font-bold text-amber-500 uppercase tracking-wider text-[11px]">Owner & Shop Particulars</span>
                    <button type="button" onClick={() => setStep(1)} className="text-amber-500 hover:underline flex items-center gap-1">
                      <FiEdit3 size={11} /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    <div>
                      <span className={textSecondary}>Owner Name:</span>
                      <p className="font-semibold text-white">{formData.ownerName}</p>
                    </div>
                    <div>
                      <span className={textSecondary}>Shop Name:</span>
                      <p className="font-semibold text-white">{formData.shopName}</p>
                    </div>
                    <div>
                      <span className={textSecondary}>Brand Name:</span>
                      <p className="font-semibold text-amber-500">{formData.brandName || formData.shopName}</p>
                    </div>
                    <div>
                      <span className={textSecondary}>Contact:</span>
                      <p className="font-semibold text-white">{formData.phone} {phoneVerified ? '(Verified)' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Addresses Summary */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="font-bold text-amber-500 uppercase tracking-wider text-[11px]">Addresses</span>
                    <button type="button" onClick={() => setStep(3)} className="text-amber-500 hover:underline flex items-center gap-1">
                      <FiEdit3 size={11} /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className={textSecondary}>Registered Business Address:</span>
                      <p className="text-white mt-0.5">{formData.businessAddress.street}, {formData.businessAddress.city}, {formData.businessAddress.state} - {formData.businessAddress.postalCode}</p>
                    </div>
                    <div>
                      <span className={textSecondary}>Pickup Location:</span>
                      <p className="text-white mt-0.5">
                        {formData.pickupAddressSameAsBusiness
                          ? 'Same as registered business address'
                          : `${formData.pickupAddress.street}, ${formData.pickupAddress.city}, ${formData.pickupAddress.state} - ${formData.pickupAddress.postalCode}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Media Summary */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="font-bold text-amber-500 uppercase tracking-wider text-[11px]">Documents & Images</span>
                    <button type="button" onClick={() => setStep(4)} className="text-amber-500 hover:underline flex items-center gap-1">
                      <FiEdit3 size={11} /> Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div>
                      <span className={textSecondary}>Shop Images ({formData.shopImages.length}):</span>
                      <div className="flex gap-1.5 mt-1">
                        {formData.shopImages.map((img, i) => (
                          <img key={i} src={img.url} alt="Shop" className="w-12 h-10 object-cover rounded-lg border border-gray-700" />
                        ))}
                      </div>
                    </div>
                    {formData.ownerPhoto?.url && (
                      <div>
                        <span className={textSecondary}>Owner Photo:</span>
                        <img src={formData.ownerPhoto.url} alt="Owner" className="w-10 h-10 object-cover rounded-lg border border-gray-700 mt-1" />
                      </div>
                    )}
                    {formData.signature?.url && (
                      <div>
                        <span className={textSecondary}>Signature:</span>
                        <img src={formData.signature.url} alt="Signature" className="h-10 bg-white rounded-lg p-1 object-contain border border-gray-700 mt-1" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Terms Acceptance Status */}
                <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <FiCheck /> STYLE STREET Seller Terms Accepted ({formData.sellerTermsVersion})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-green-400">Ready to Submit</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(7)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-800 text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Seller Application'}
                </button>
              </div>
            </motion.div>
          )}

        </form>
      </div>

      {/* Seller Terms Modal */}
      <SellerTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        isDarkMode={isDarkMode}
        accepted={formData.termsAccepted}
        onAccept={() => setFormData(prev => ({ ...prev, termsAccepted: true }))}
      />
    </div>
  )
}
