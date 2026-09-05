# 🚀 SKLP Luxury Fashion E-Commerce — Production Deployment Guide

A step-by-step production deployment guide for deploying **SKLP Fashion** across **Render** (Node.js/Express Backend), **Vercel** (React Vite Frontend), **MongoDB Atlas** (Cloud Database), **Firebase** (Google Auth & Web Push Notifications), and **Razorpay** (Payment Gateway).

---

## 📋 Table of Contents
1. [Architecture & Production Topology](#1-architecture--production-topology)
2. [Step 1: MongoDB Atlas Cloud Database Setup](#2-step-1-mongodb-atlas-cloud-database-setup)
3. [Step 2: Firebase Google Authentication & Web Push (FCM) Setup](#3-step-2-firebase-google-authentication--web-push-fcm-setup)
4. [Step 3: Razorpay Payment Gateway Configuration](#4-step-3-razorpay-payment-gateway-configuration)
5. [Step 4: Push Clean Source Code to GitHub](#5-step-4-push-clean-source-code-to-github)
6. [Step 5: Deploy Backend to Render](#6-step-5-deploy-backend-to-render)
7. [Step 6: Deploy Frontend to Vercel](#7-step-6-deploy-frontend-to-vercel)
8. [Step 7: Link Frontend, Backend & CORS](#8-step-7-link-frontend-backend--cors)
9. [Step 8: SMS & OTP Gateway Configuration (Optional)](#9-step-8-sms--otp-gateway-configuration-optional)
10. [Step 9: Production Verification & Smoke Test Checklist](#10-step-9-production-verification--smoke-test-checklist)
11. [Troubleshooting Common Production Issues](#11-troubleshooting-common-production-issues)

---

## 1. Architecture & Production Topology

```
                               ┌──────────────────────────────────┐
                               │       Vercel (Frontend)          │
                               │   React 18 + Vite + Tailwind     │
                               │   Domain: https://sklp.vercel.app │
                               └─────────────────┬────────────────┘
                                                 │
                                     HTTPS REST API / JSON
                                                 │
                                                 ▼
 ┌───────────────────────────┐ ┌──────────────────────────────────┐ ┌───────────────────────────┐
 │   Razorpay Payment API    │ │        Render (Backend)          │ │    MongoDB Atlas Cloud    │
 │ Orders / HMAC Verification│◄┼►│      Node.js + Express API       │◄┼►│  M0 Sandbox / Cluster0    │
 └───────────────────────────┘ │   URL: https://sklp-api.onrender  │ └───────────────────────────┘
 ┌───────────────────────────┐ └─────────────────┬────────────────┘ ┌───────────────────────────┐
 │ Firebase Cloud Messaging  │                   │                  │   Fast2SMS / 2Factor      │
 │ Web Push & Device Sync    │◄──────────────────┴──────────────────┼►│ Real SMS OTP Gateway      │
 └───────────────────────────┘                                      └───────────────────────────┘
```

---

## 2. Step 1: MongoDB Atlas Cloud Database Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. Create a Free M0 Cluster (e.g. `Cluster0` in `AWS / Mumbai ap-south-1` or `Singapore`).
3. **Database Access**:
   - Go to **Security** > **Database Access** > Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `sklp_admin`
   - Password: `(Generate secure password and save it)`
   - Built-in Role: **Read and write to any database**.
4. **Network Access (CRITICAL)**:
   - Go to **Security** > **Network Access** > Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Why?* Cloud providers like Render assign dynamic outbound IPs to free-tier web services.
5. **Get Connection String**:
   - Click **Database** > **Connect** > **Drivers** > Select `Node.js`.
   - Copy connection string and add your database name `/sklp_db`:
   ```bash
   mongodb+srv://sklp_admin:<password>@cluster0.pxxzabh.mongodb.net/sklp_db?retryWrites=true&w=majority
   ```

---

## 3. Step 2: Firebase Google Authentication & Web Push (FCM) Setup

### A. Enable Google Sign-In Provider in Firebase
1. Open [Firebase Console](https://console.firebase.google.com/) and select project: `sklp-fashion-store-9fa5d`.
2. In left sidebar, click **Build** > **Authentication** > **Sign-in method**.
3. Click **Add new provider** > Select **Google** > Toggle **Enable**.
4. Set project support email and click **Save**.
5. Go to **Authentication** > **Settings** > **Authorized domains**:
   - Click **Add domain**.
   - Add your Vercel deployment domain (e.g., `sklp-fashion.vercel.app`).
   - Add `localhost` (already present).

### B. Generate Firebase Web Push Certificate (VAPID Key)
1. In Firebase Console, click the Gear icon ⚙️ > **Project settings**.
2. Click the **Cloud Messaging** tab.
3. Scroll down to **Web configuration** > **Web Push certificates**.
4. Click **Generate key pair** (VAPID key).
5. Copy the generated Key.

### C. Generate Firebase Admin SDK Private Key (for Backend Push Dispatch)
1. In Firebase Console > **Project settings** > **Service accounts** tab.
2. Click **Generate new private key** > Confirm **Generate key**.
3. A JSON file will download (e.g. `sklp-fashion-store-9fa5d-firebase-adminsdk-xxx.json`).
4. Note three fields from this JSON for Render backend environment variables:
   - `project_id`
   - `client_email`
   - `private_key`

---

## 4. Step 3: Razorpay Payment Gateway Configuration

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch between **Test Mode** (for staging/testing) and **Live Mode** (for real bank debits).
3. Navigate to **Account & Settings** > **API Keys**:
   - Click **Generate Key**.
   - Copy `Key ID` (e.g., `rzp_test_xxxx` or `rzp_live_xxxx`).
   - Copy `Key Secret`.
4. Configure Webhooks (Optional for instant status sync):
   - Navigate to **Account & Settings** > **Webhooks** > **Add New Webhook**.
   - Webhook URL: `https://your-backend.onrender.com/api/payments/webhook`
   - Secret: Enter a unique passphrase.
   - Active Events: `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`.

---

## 5. Step 4: Push Clean Source Code to GitHub

Open terminal at the project root (`c:\mern stack\mernpro\Sklp_ecommers`):

```bash
# 1. Check current repository status
git status

# 2. Add all modified files
git add .

# 3. Commit with semantic message
git commit -m "feat: configure fullstack production deployment for Render, Vercel, Firebase and Razorpay"

# 4. Set default branch to main and push
git branch -M main
git push -u origin main
```

*(If you have not connected GitHub yet, create a new repo on GitHub and run `git remote add origin https://github.com/<your-username>/<your-repo-name>.git` prior to pushing).*

---

## 6. Step 5: Deploy Backend to Render

### Option 1: Automated Blueprint Deploy (Recommended)
1. Sign in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` automatically and prompt for required secrets.

### Option 2: Manual Web Service Creation
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `sklp-backend`
   - **Region**: `Singapore (Southeast Asia)` or `Oregon (US West)`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`
5. Under **Environment Variables**, add the following keys:

| Environment Variable | Recommended Value / Source |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | `mongodb+srv://sklp_admin:<pass>@cluster0.../sklp_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | *(Generate a 32+ character random string)* |
| `JWT_REFRESH_SECRET` | *(Generate another 32+ character random string)* |
| `JWT_EXPIRE` | `7d` |
| `JWT_REFRESH_EXPIRE` | `30d` |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |
| `RAZORPAY_KEY_ID` | `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | *(Your Razorpay Secret Key)* |
| `FIREBASE_PROJECT_ID` | `sklp-fashion-store-9fa5d` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...@sklp-fashion-store-9fa5d.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `SMS_PROVIDER` | `auto` |
| `ENABLE_AI_FEATURES` | `true` |
| `ENABLE_CHATBOT` | `true` |
| `ENABLE_RECOMMENDATIONS`| `true` |

6. Click **Create Web Service**.
7. Once deployment builds, note your live backend URL (e.g. `https://sklp-backend.onrender.com`).

---

## 7. Step 6: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Under **Environment Variables**, add the following keys:

| Environment Variable | Production Value |
|---|---|
| `VITE_API_URL` | `https://sklp-backend.onrender.com/api` |
| `VITE_APP_NAME` | `SKLP` |
| `VITE_APP_DESCRIPTION` | `Luxury AI-Powered Fashion Platform` |
| `VITE_RAZORPAY_KEY` | `rzp_test_...` or `rzp_live_...` |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_...` or `rzp_live_...` |
| `VITE_FIREBASE_API_KEY` | `AIzaSyDdfGd-OLpeZhRCm8uBlY9-xf_se_a8zUI` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `sklp-fashion-store-9fa5d.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `sklp-fashion-store-9fa5d` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `sklp-fashion-store-9fa5d.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| `92351616723` |
| `VITE_FIREBASE_APP_ID` | `1:92351616723:web:fc67b10a1db3ecd9e8a626` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-5TXFQFW8E8` |
| `VITE_FIREBASE_VAPID_KEY` | *(VAPID Key generated from Firebase Cloud Messaging)* |

6. Click **Deploy**.
7. Vercel will build and assign your production domain: e.g. `https://sklp-fashion.vercel.app`.

---

## 8. Step 7: Link Frontend, Backend & CORS

After obtaining both live URLs:

1. **In Render Dashboard**:
   - Navigate to `sklp-backend` > **Environment**.
   - Set `FRONTEND_URL` = `https://sklp-fashion.vercel.app` (without trailing slash).
   - Render will automatically trigger a zero-downtime redeploy.
2. **In Firebase Console**:
   - Go to **Authentication** > **Settings** > **Authorized Domains**.
   - Ensure `sklp-fashion.vercel.app` is listed.

---

## 9. Step 8: SMS & OTP Gateway Configuration (Optional)

To enable live SMS delivery to Indian mobile devices:

### Option A: Fast2SMS (Recommended)
1. Register at [Fast2SMS](https://www.fast2sms.com/).
2. Go to **Dev API** and copy your **Authorization API Key**.
3. In Render Backend Environment:
   - `SMS_PROVIDER`: `fast2sms`
   - `FAST2SMS_API_KEY`: `your_key_here`

### Option B: 2Factor.in
1. Register at [2Factor.in](https://2factor.in/).
2. Copy your API Key.
3. In Render Backend Environment:
   - `SMS_PROVIDER`: `2factor`
   - `TWOFACTOR_API_KEY`: `your_key_here`

---

## 10. Step 9: Production Verification & Smoke Test Checklist

| Verification Item | Test Action | Expected Result | Status |
|---|---|---|:---:|
| **1. Backend Health Check** | Visit `https://your-backend.onrender.com/health` | Returns `{"status":"ok","uptime":...}` | ✅ |
| **2. SPA Route Refresh** | Visit `https://your-frontend.vercel.app/shop` & refresh browser | Page loads directly without 404 (rewrites via `vercel.json`) | ✅ |
| **3. Google Sign-In** | Click "Continue with Google" on `/login` | Signs in via Google popup/redirect or seamless dev fallback | ✅ |
| **4. Customer Registration** | Register new account at `/register` | JWT token issued, user stored in MongoDB | ✅ |
| **5. Header Notification Bell**| Click Notification Bell in Header | Opens dropdown with live notification list | ✅ |
| **6. Web Push Activation** | Go to `/profile` > Notification tab > Click "Enable Push" | Browser requests notification permission & syncs device token | ✅ |
| **7. Test Notification Alert**| Click "Send Test Alert" in Profile Notifications | Foreground badge + desktop push notification received | ✅ |
| **8. Razorpay Payment** | Add product to cart > proceed to Checkout > select Online Payment | Razorpay modal opens with INR amount and completes order | ✅ |
| **9. Seller Onboarding** | Navigate to `/become-seller` and register store | Seller record created and redirected to Seller Dashboard | ✅ |

---

## 11. Troubleshooting Common Production Issues

### Issue 1: CORS Error in Browser Console (`Access-Control-Allow-Origin`)
- **Cause**: Backend `FRONTEND_URL` environment variable does not match the exact origin in the browser (e.g. missing `https://` or trailing slash difference).
- **Solution**: Set `FRONTEND_URL` in Render to `https://your-app.vercel.app` without a trailing `/`.

### Issue 2: 404 Not Found on Page Refresh in Vercel
- **Cause**: Single-Page App routes (like `/profile`, `/orders`) require server rewrites to `/index.html`.
- **Solution**: Ensure `frontend/vercel.json` exists with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

### Issue 3: Firebase `auth/operation-not-allowed`
- **Cause**: Google Sign-In is disabled in the Firebase project console.
- **Solution**: In Firebase Console > Authentication > Sign-in method > Enable Google.

### Issue 4: Render Free Tier Cold Start Delays
- **Cause**: Free tier instances spin down after 15 minutes of inactivity.
- **Solution**: Set up a free monitor at [UptimeRobot](https://uptimerobot.com) to ping `https://your-backend.onrender.com/health` every 10 minutes to maintain persistent warm instances.
