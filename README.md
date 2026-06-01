# SKLP - Premium AI-Powered Fashion Ecommerce Platform

A luxury, enterprise-level full-stack ecommerce platform for fashion and footwear built with modern technologies.

## 🎨 Features

### Customer Features
- **Authentication**: Google Login, OTP Mobile Login, Email Signup
- **Product Discovery**: AI-powered smart search, recommendations, similar products
- **Shopping**: Wishlist, advanced cart, secure checkout, order tracking
- **Community**: Reviews, ratings, recently viewed, trending products
- **Support**: AI chatbot, customer service, returns/refunds
- **Payments**: COD, UPI, Razorpay, PhonePe, Google Pay, Paytm
- **Personalization**: Dark/Bright modes, multiple languages (EN, TE, HI)

### Admin Features
- **Dashboard**: Real-time analytics, sales monitoring, customer insights
- **Inventory**: Product management, low-stock alerts, bulk operations
- **Orders**: Management workflow, tracking, returns/refunds
- **Marketing**: Banners, coupons, discounts, offer management
- **Moderation**: Fake product detection, content moderation
- **Support**: Customer management, issue tracking
- **Reports**: Advanced analytics, business intelligence

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS + custom animations
- **State**: Context API + custom hooks
- **Internationalization**: i18next
- **Payment**: Razorpay, PhonePe integration

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT, bcrypt
- **Cache**: Redis (optional)
- **File Upload**: Cloudinary/AWS S3

### Security
- CORS with restricted origins
- Rate limiting
- Bot protection
- CSRF tokens
- Secure headers
- Environment-based configuration
- Cloudflare-ready architecture

## 📁 Project Structure

```
sklp-ecommerce/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # Context API
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   ├── i18n/            # Internationalization
│   │   └── styles/          # Global styles
│   └── package.json
├── backend/                  # Express.js application
│   ├── config/              # Configuration files
│   ├── models/              # Database models
│   ├── controllers/         # Request handlers
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── validations/         # Input validation
│   └── package.json
├── .env.example             # Environment variables template
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 16
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sklp-ecommerce
```

2. **Setup environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Install backend dependencies**
```bash
cd backend
npm install
```

4. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

5. **Start backend server**
```bash
cd backend
npm run dev
```

6. **Start frontend development server**
```bash
cd frontend
npm run dev
```

## 📝 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend
BACKEND_PORT=5000
MONGODB_URI=your_mongodb_atlas_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d

# Frontend
VITE_API_URL=http://localhost:5000/api

# Third-party APIs
GOOGLE_CLIENT_ID=your_google_client_id
RAZORPAY_KEY_ID=your_razorpay_key
```

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- bcrypt password hashing
- Role-based access control (RBAC)
- Rate limiting on sensitive endpoints
- CORS configuration
- Secure HTTP headers
- MongoDB injection prevention
- XSS protection
- CSRF token validation

## 📊 API Documentation

API endpoints are organized by resource:

- `/api/auth` - Authentication endpoints
- `/api/products` - Product management
- `/api/cart` - Shopping cart
- `/api/orders` - Order management
- `/api/users` - User profiles
- `/api/admin` - Admin dashboard (protected)

## 🎯 Performance

- Lazy loading for images and components
- Code splitting with route-based chunks
- Server-side caching headers
- Database query optimization
- CDN-ready asset serving
- Lighthouse score targets: 90+

## 🌍 Internationalization

Supported languages:
- English (EN)
- Telugu (TE)
- Hindi (HI)

Language selection is persistent in local storage.

## 🎨 Design System

- **Color Palette**: 
  - Dark Mode: Yellow (#FFD700) + Black (#000000)
  - Light Mode: Yellow (#FFD700) + White (#FFFFFF)
- **Components**: Glassmorphism, modern animations
- **Typography**: Premium, clean fonts
- **Spacing**: Consistent margin/padding system

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## 🤝 Contributing

Contribution guidelines coming soon.

## 📄 License

Proprietary - SKLP Exclusive

## 📞 Support

For support, contact: support@sklp.com

---

Built with ❤️ for fashion enthusiasts
