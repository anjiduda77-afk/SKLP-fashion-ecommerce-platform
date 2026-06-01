import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv to read from backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
import User from '../models/User.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Review from '../models/Review.js';
import Wishlist from '../models/Wishlist.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';

const products = [
  // Men's Products
  {
    name: 'Premium Velvet Blazer',
    sku: 'SKLP-M-BLZ-001',
    description: 'Designed for elite events, this slim-fit luxury velvet blazer offers sharp contours, bespoke satin peak lapels, and double vented structure.',
    shortDescription: 'Luxurious velvet blazer with satin peak lapels.',
    category: 'fashion-wear',
    subcategory: 'blazers',
    gender: 'men',
    brand: 'SKLP Royale',
    price: 8999,
    originalPrice: 12999,
    discount: 30,
    stock: 25,
    lowStockThreshold: 5,
    images: [
      { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Premium Velvet Blazer Front' },
      { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80', isMain: false, alt: 'Premium Velvet Blazer Detail' }
    ],
    variants: [
      { type: 'size', name: 'Size Selection', options: ['S', 'M', 'L', 'XL'], isRequired: true }
    ],
    attributes: { material: 'Velvet / Satin', color: 'Midnight Black', fit: 'Slim Fit', pattern: 'Solid', care: ['Dry clean only', 'Iron on low reverse'] },
    isFeatured: true,
    isTrending: true,
    tags: ['blazer', 'suit', 'party-wear', 'luxury', 'men'],
    translations: {
      hi: { name: 'प्रीमियम मखमली ब्लेज़र', description: 'अभिजात वर्ग के कार्यक्रमों के लिए डिज़ाइन किया गया, यह स्लिम-फिट लक्जरी मखमली ब्लेज़र तीखे रूप प्रदान करता है।' },
      te: { name: 'ప్రీమియం వెల్వెట్ బ్లేజర్', description: 'కులీన ఈవెంట్‌ల కోసం రూపొందించబడిన ఈ స్లిమ్-ఫిట్ లగ్జరీ వెల్వెట్ బ్లేజర్ అద్భుతమైన రూపాన్ని ఇస్తుంది.' }
    }
  },
  {
    name: 'Ultra-Comfort Luxury Hooded Sweatshirt',
    sku: 'SKLP-M-HUD-002',
    description: 'Knitted from organic heavy-weight combed cotton, this premium hoodie features structural kangaroo pockets, a micro-embroidered gold emblem, and rib-knit side gussets.',
    shortDescription: 'Heavy-weight organic cotton hoodie with custom golden branding.',
    category: 'hoodies',
    subcategory: 'sweatshirts',
    gender: 'men',
    brand: 'SKLP Athletics',
    price: 3499,
    originalPrice: 4999,
    discount: 30,
    stock: 45,
    lowStockThreshold: 8,
    images: [
      { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Luxury Hooded Sweatshirt' }
    ],
    variants: [
      { type: 'size', name: 'Size', options: ['M', 'L', 'XL'], isRequired: true }
    ],
    attributes: { material: '100% Organic Cotton', color: 'Gold Mustard', fit: 'Relaxed Fit', pattern: 'Solid with embroidery', care: ['Machine wash cold', 'Tumble dry low'] },
    isFeatured: false,
    isTrending: true,
    tags: ['hoodie', 'athleisure', 'casual', 'warm', 'men'],
    translations: {
      hi: { name: 'शानदार हुडेड स्वेटशर्ट', description: 'ऑर्गेनिक भारी वजन वाले कंघी कपास से बुना हुआ, यह प्रीमियम हुडी आपको असाधारण आराम देता है।' },
      te: { name: 'లగ్జరీ హూడెడ్ స్వెట్‌షర్ట్', description: 'ఆర్గానిక్ హెవీ కాటన్‌తో అల్లిన ఈ ప్రీమియం హూడీ మీకు అసాధారణమైన సౌకర్యాన్ని ఇస్తుంది.' }
    }
  },
  {
    name: 'Italian Leather Oxford Dress Shoes',
    sku: 'SKLP-M-SHO-003',
    description: 'Expertly handcrafted in Florence, Italy, these wholecut Oxfords are carved from full-grain calfskin leather, hand-dyed to a rich cognac amber finish, and set on robust Goodyear-welted leather soles.',
    shortDescription: 'Full-grain wholecut leather Oxfords made in Italy.',
    category: 'shoes',
    subcategory: 'formal-shoes',
    gender: 'men',
    brand: 'SKLP Footwear',
    price: 9999,
    originalPrice: 15999,
    discount: 37,
    stock: 12,
    lowStockThreshold: 3,
    images: [
      { url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Cognac Leather Oxfords' }
    ],
    variants: [
      { type: 'size', name: 'UK Shoe Size', options: ['7', '8', '9', '10'], isRequired: true }
    ],
    attributes: { material: '100% Calfskin Leather', color: 'Cognac Amber', fit: 'D-Width Standard', care: ['Polish regularly', 'Use cedar wood shoe trees'] },
    isFeatured: true,
    isTrending: false,
    tags: ['oxford', 'leather-shoes', 'formal', 'italian', 'footwear', 'men'],
    translations: {
      hi: { name: 'इतालवी चमड़े के ऑक्सफोर्ड जूते', description: 'इटली के फ्लोरेंस में विशेषज्ञ रूप से हस्तनिर्मित, ये ऑक्सफोर्ड बछड़े के चमड़े से बनाए गए हैं।' },
      te: { name: 'ఇటాలియన్ లెదర్ ఆక్స్ఫర్డ్ షూస్', description: 'ఇటలీలోని ఫ్లోరెన్స్‌లో నైపుణ్యంతో చేతితో తయారు చేయబడిన ఈ షూస్ అద్భుతమైన నాణ్యత కలిగి ఉంటాయి.' }
    }
  },

  // Women's Products
  {
    name: 'Royal Heritage Banarasi Katan Silk Saree',
    sku: 'SKLP-W-SAR-004',
    description: 'Handwoven in Varanasi using traditional jacquard looms, this pure Katan silk saree is embellished with opulent metallic Zari vines, a grand pallu, and an unstitched brocade blouse piece.',
    shortDescription: 'Handwoven pure Katan silk saree with gold Zari border.',
    category: 'sarees',
    subcategory: 'banarasi',
    gender: 'women',
    brand: 'SKLP Heritage',
    price: 14999,
    originalPrice: 24900,
    discount: 40,
    stock: 8,
    lowStockThreshold: 2,
    images: [
      { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Heritage Silk Saree' }
    ],
    variants: [],
    attributes: { material: '100% Banarasi Silk', color: 'Royal Crimson Gold', pattern: 'Zari Brocade', care: ['Professional dry clean only', 'Store in a soft cotton muslin bag'] },
    isFeatured: true,
    isTrending: true,
    tags: ['saree', 'traditional', 'wedding', 'silk', 'women'],
    translations: {
      hi: { name: 'शाही विरासत बनारसी कातान रेशमी साड़ी', description: 'पारंपरिक करघों का उपयोग करके बनारस में बुनी गई, यह शुद्ध कातान रेशमी साड़ी विलासिता का प्रतीक है।' },
      te: { name: 'రాయల్ హెరిటేజ్ బనారసి కాటన్ సిల్క్ శారీ', description: 'వారణాసిలో సాంప్రదాయ మగ్గాలను ఉపయోగించి నేయబడిన ఈ ప్యూర్ సిల్క్ చీర విలాసవంతమైనది.' }
    }
  },
  {
    name: 'Sleek Silhouette Trench Coat',
    sku: 'SKLP-W-TRC-005',
    description: 'A classic, wind-resistant double-breasted trench coat with a structured waist tie, premium golden SKLP buttons, and water-repellent performance weave.',
    shortDescription: 'Double-breasted windproof water-repellent trench coat.',
    category: 'fashion-wear',
    subcategory: 'jackets',
    gender: 'women',
    brand: 'SKLP Studio',
    price: 5999,
    originalPrice: 8999,
    discount: 33,
    stock: 18,
    lowStockThreshold: 4,
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Sleek Trench Coat Front' }
    ],
    variants: [
      { type: 'size', name: 'Size', options: ['S', 'M', 'L'], isRequired: true }
    ],
    attributes: { material: 'Waterproof Gabardine Blend', color: 'Ivory Cream', fit: 'Structured Fit', pattern: 'Double-Breasted Solid', care: ['Dry clean recommended', 'Cool iron with cover'] },
    isFeatured: false,
    isTrending: true,
    tags: ['trench-coat', 'outerwear', 'winter-chic', 'women'],
    translations: {
      hi: { name: 'आकर्षक ट्रेंच कोट', description: 'एक क्लासिक, पवन-प्रतिरोधी डबल-ब्रेस्टेड ट्रेंच कोट जो कमर के सुंदर पट्टे के साथ आता है।' },
      te: { name: 'స్లీక్ ట్రెంచ్ కోట్', description: 'బెల్ట్‌తో కూడిన క్లాసిక్, విండ్-రెసిస్టెంట్ డబుల్ బ్రెస్ట్ ట్రెంచ్ కోట్.' }
    }
  },
  {
    name: 'Luxury Velvet Heel Stilettos',
    sku: 'SKLP-W-HEE-006',
    description: 'Elegantly proportioned point-toe stilettos featuring premium velvet wrapped straps, cushioned memory foam insoles, and signature gold-plated SKLP heel bases.',
    shortDescription: 'Pointed velvet stilettos with golden-plated heel caps.',
    category: 'shoes',
    subcategory: 'heels',
    gender: 'women',
    brand: 'SKLP Footwear',
    price: 4999,
    originalPrice: 7999,
    discount: 37,
    stock: 15,
    lowStockThreshold: 3,
    images: [
      { url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Velvet Heels' }
    ],
    variants: [
      { type: 'size', name: 'Euro Shoe Size', options: ['36', '37', '38', '39'], isRequired: true }
    ],
    attributes: { material: 'Velvet Upper / Leather Sole', color: 'Black Gold Accent', fit: 'Slim Stiletto', care: ['Store in dustbag', 'Brush velvet gently'] },
    isFeatured: true,
    isTrending: true,
    tags: ['heels', 'stilettos', 'footwear', 'party', 'women'],
    translations: {
      hi: { name: 'लक्जरी मखमली हील स्टिलेटोस', description: 'मेमोरी फोम इनसोल और गोल्ड-प्लेटेड हील बेस के साथ सुरुचिपूर्ण नुकीले मखमली सैंडल।' },
      te: { name: 'లగ్జరీ వెల్వెట్ హీల్ స్టైలెట్టోస్', description: 'మెమరీ ఫోమ్ ఇన్‌సోల్స్ మరియు గోల్డ్-ప్లేటెడ్ హీల్ బేస్‌లతో కూడిన అద్భుతమైన హై హీల్స్.' }
    }
  },

  // Kids Products
  {
    name: 'Soft Denim dungarees Set',
    sku: 'SKLP-K-DUN-007',
    description: 'Designed for absolute playfulness, this hyper-soft washed organic cotton denim dungarees comes with a striped premium combed cotton inner t-shirt.',
    shortDescription: 'Organic washed denim dungaree with striped t-shirt.',
    category: 'jeans',
    subcategory: 'dungarees',
    gender: 'kids',
    brand: 'SKLP Kids',
    price: 1999,
    originalPrice: 2999,
    discount: 33,
    stock: 30,
    lowStockThreshold: 5,
    images: [
      { url: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Kids Dungaree Set' }
    ],
    variants: [
      { type: 'size', name: 'Age Range', options: ['2-3Y', '3-4Y', '5-6Y'], isRequired: true }
    ],
    attributes: { material: '100% Organic Washed Cotton', color: 'Sky Blue / White', fit: 'Regular playfit', care: ['Machine wash warm', 'Do not bleach'] },
    isFeatured: false,
    isTrending: false,
    tags: ['kids', 'denim', 'dungaree', 'cotton', 'unisex-kids'],
    translations: {
      hi: { name: 'सॉफ्ट डेनिम डंगरी सेट', description: 'पूर्ण खेलकूद के लिए डिज़ाइन किया गया, यह हाइपर-सॉफ्ट ऑर्गेनिक डेनिम बहुत आरामदायक है।' },
      te: { name: 'సాఫ్ట్ డెనిమ్ డంగరీ సెట్', description: 'పూర్తి ఆటపాటల కోసం రూపొందించబడిన ఈ హైపర్-సాఫ్ట్ ఆర్గానిక్ డెనిమ్ చాలా బాగుంటుంది.' }
    }
  },
  {
    name: 'Premium Leather High-Top Sneakers',
    sku: 'SKLP-K-SNK-008',
    description: 'Featuring premium vegan action leather, lightweight athletic rubber cupsoles, and secure gold zippers alongside elastic closures for active youngsters.',
    shortDescription: 'Flexible high-top kids sneakers with zip adjustments.',
    category: 'shoes',
    subcategory: 'sneakers',
    gender: 'kids',
    brand: 'SKLP Kids',
    price: 2499,
    originalPrice: 3999,
    discount: 37,
    stock: 20,
    lowStockThreshold: 4,
    images: [
      { url: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=800&q=80', isMain: true, alt: 'Kids High Top Sneakers' }
    ],
    variants: [
      { type: 'size', name: 'UK Size', options: ['11C', '12C', '1Y', '2Y'], isRequired: true }
    ],
    attributes: { material: 'Vegan Action Leather', color: 'White Golden Stripe', fit: 'Comfort Footbed', care: ['Wipe clean with a damp cloth'] },
    isFeatured: true,
    isTrending: true,
    tags: ['sneakers', 'high-top', 'footwear', 'sports', 'kids'],
    translations: {
      hi: { name: 'प्रीमियम चमड़े के हाई-टॉप स्नीकर्स', description: 'सक्रिय युवाओं के लिए लोचदार क्लोजर के साथ हल्के खेल वाले रबर स्नीकर्स।' },
      te: { name: 'ప్రీమియం లెదర్ హై-టాప్ స్నీకర్స్', description: 'క్రియాశీల పిల్లల కోసం ప్రత్యేకంగా డిజైన్ చేయబడిన సౌకర్యవంతమైన స్నీకర్స్.' }
    }
  }
];

const banners = [
  {
    title: 'THE RENAISSANCE OF GOLD',
    description: 'Explore the Cinematic Summer Couture Collection. Made with handwoven silk and premium cotton fibers wrapped in pure golden luxury.',
    image: { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80', alt: 'Royale Gold Hero Slider' },
    type: 'hero',
    link: '/products?gender=men',
    linkType: 'category',
    cta: { text: 'DISCOVER COLLECTION', style: 'primary' },
    position: 'home-hero',
    displayOrder: 1,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  },
  {
    title: 'SILENCE IN GOLD: WOMEN COUTURE',
    description: 'Chic silhouettes, double-breasted coats, and grand Katan silk Banarasi weaves crafted for ultimate elegance.',
    image: { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80', alt: 'Women Silk Banner' },
    type: 'hero',
    link: '/products?gender=women',
    linkType: 'category',
    cta: { text: 'EXPLORE COUTURE', style: 'outline' },
    position: 'home-hero',
    displayOrder: 2,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  },
  {
    title: 'KIDS LUXE ATHLETICS',
    description: 'Flexible denim dungarees and soft gold-accented leather high-tops for the trendsetting generation.',
    image: { url: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=1200&q=80', alt: 'Kids Luxe banner' },
    type: 'hero',
    link: '/products?gender=kids',
    linkType: 'category',
    cta: { text: 'SHOP PLAYTIME', style: 'secondary' },
    position: 'home-hero',
    displayOrder: 3,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }
];

const coupons = [
  {
    code: 'SKLP20',
    description: 'Save 20% flat on any premium clothing item, valid for standard orders.',
    discountType: 'percentage',
    discountValue: 20,
    minPurchaseAmount: 1999,
    maxDiscountAmount: 2000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days validity
    maxUses: 1000,
    isActive: true
  },
  {
    code: 'LUXURY50',
    description: 'VIP Grand Launch Promo. Save flat ₹5,000 on premium velvet blazers or silks.',
    discountType: 'fixed',
    discountValue: 5000,
    minPurchaseAmount: 9999,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    maxUses: 100,
    isActive: true
  }
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing in backend/.env!');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected. Dropping existing assets...');

    // Delete existing products, banners, coupons, reviews, users
    await Product.deleteMany({});
    await Banner.deleteMany({});
    await Coupon.deleteMany({});
    await Review.deleteMany({});
    await Wishlist.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});
    console.log('🧹 Purged all old collections successfully.');

    // 1. Seed Banners
    console.log('✨ Seeding visual cinematic banners...');
    await Banner.insertMany(banners);
    console.log('✅ Banners populated.');

    // 2. Seed Coupons
    console.log('✨ Seeding discount codes...');
    await Coupon.insertMany(coupons);
    console.log('✅ Coupons populated.');

    // 3. Seed Products
    console.log('✨ Seeding premium clothing & footwear collections...');
    const productsWithSlugs = products.map(p => ({
      ...p,
      slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }));
    const insertedProducts = await Product.insertMany(productsWithSlugs);
    console.log(`✅ Loaded ${insertedProducts.length} items successfully.`);

    // 4. Seed Standard User Accounts (Bcrypt pre-save is automatic)
    console.log('✨ Generating user accounts (Hashing passwords)...');
    
    // Seed Admin Account
    const adminUser = await User.create({
      firstName: 'Anji',
      lastName: 'SKLP Admin',
      email: 'admin@sklp.com',
      phone: '9876543210',
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true
    });

    // Seed Standard Customer Account
    const customerUser = await User.create({
      firstName: 'Rakesh',
      lastName: 'Kumar',
      email: 'customer@sklp.com',
      phone: '9999999999',
      password: 'CustomerPassword123!',
      role: 'customer',
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true,
      addresses: [
        {
          _id: new mongoose.Types.ObjectId(),
          type: 'home',
          street: 'Flat 402, Golden Towers, Gachibowli',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500032',
          country: 'India',
          isDefault: true
        }
      ]
    });

    // Seed Seller Account
    const sellerUser = await User.create({
      firstName: 'Vikram',
      lastName: 'Couture',
      email: 'seller@sklp.com',
      phone: '8888888888',
      password: 'SellerPassword123!',
      role: 'seller',
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true
    });

    // Seed Delivery Account
    const deliveryUser = await User.create({
      firstName: 'Suresh',
      lastName: 'Express',
      email: 'delivery@sklp.com',
      phone: '7777777777',
      password: 'DeliveryPassword123!',
      role: 'delivery',
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true
    });

    console.log(`
================================================================
🎉                   SKLP DATABASE SEED COMPLETE                 
================================================================
👥 Accounts Seeded:
   1. Admin User:
      - Email:    admin@sklp.com
      - Password: AdminPassword123!
      - Role:     Admin Dashboard Controller

   2. Customer User:
      - Email:    customer@sklp.com
      - Password: CustomerPassword123!
      - Role:     Customer Shopping Feed

   3. Seller User:
      - Email:    seller@sklp.com
      - Password: SellerPassword123!
      - Role:     Seller Portal Dashboard

   4. Delivery Partner User:
      - Email:    delivery@sklp.com
      - Password: DeliveryPassword123!
      - Role:     Delivery Driver/Partner Panel

🛍️ Products Seeded:
   - 3 Men collections (Velvet Blazer, Amber Oxfords, Combed Hoodie)
   - 3 Women collections (Banarasi Silk Saree, Trench Coat, Stilettos)
   - 2 Kids collections (Denim Dungarees, High-top sneakers)
================================================================
    `);

    mongoose.connection.close();
    console.log('✅ Connection closed safely.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
