# 🚀 SKLP Fashion E-Commerce - Production Deployment Guide

This guide provides step-by-step instructions to deploy your fullstack application to **Render** (Backend), **Vercel** (Frontend), configure **Razorpay** (Payments), and manage everything via **GitHub** (Version Control).

---

## 📋 Table of Contents
1. [Prerequisites & Architecture](#1-prerequisites--architecture)
2. [Step 1: Version Control & Push to GitHub](#2-step-1-version-control--push-to-github)
3. [Step 2: Deploy Backend to Render](#3-step-2-deploy-backend-to-render)
4. [Step 3: Deploy Frontend to Vercel](#4-step-3-deploy-frontend-to-vercel)
5. [Step 4: Configure Razorpay Payment Gateway](#5-step-4-configure-razorpay-payment-gateway)
6. [Step 5: Link Frontend & Backend](#6-step-5-link-frontend--backend)
7. [Step 6: Production Verification Checklist](#7-step-6-production-verification-checklist)

---

## 1. Prerequisites & Architecture

```
                               ┌────────────────────────┐
                               │   Vercel (Frontend)    │
                               │  React 18 + Vite + SPA │
                               └───────────┬────────────┘
                                           │ HTTPS / API
                                           ▼
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│  Razorpay Gateway API  │◄───►│    Render (Backend)    │◄───►│     MongoDB Atlas      │
│ Orders / Verification  │     │   Node.js + Express    │     │  Database (Cloud DB)   │
└────────────────────────┘     └────────────────────────┘     └────────────────────────┘
```

- **GitHub Repository**: Stores clean source code (excluding `.env`, `node_modules`, `dist`).
- **Render Web Service**: Hosts the Express.js API backend (`sklp-backend`).
- **Vercel**: Hosts the React Vite Single-Page Application (`sklp-frontend`).
- **Razorpay**: Handles live & sandbox INR payments (UPI, Cards, NetBanking, COD).
- **MongoDB Atlas**: Managed cloud MongoDB with connection pooling, IPv4 compatibility, and IP Access set to `0.0.0.0/0`.

---

## 2. MongoDB Atlas Cloud Database Setup

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Free Shared Cluster (M0 Sandbox).
3. **Database Access**: Create a Database User (e.g. `sklp_admin`) with password and read/write privileges.
4. **Network Access**: Add IP Address `0.0.0.0/0` (Allow Access from Anywhere) so Render servers can connect without IP restrictions.
5. **Get Connection String**:
   - Click **Connect** > **Drivers** (Node.js).
   - Copy connection string and append the database name `sklp_db`:
   ```
   mongodb+srv://<username>:<password>@cluster0.pxxzabh.mongodb.net/sklp_db?retryWrites=true&w=majority
   ```
6. Store this in your Render environment variables as `MONGODB_URI`.

---

## 2. Step 1: Version Control & Push to GitHub

1. Open your terminal in the project root (`c:\mern stack\mernpro\Sklp_ecommers`):
   ```bash
   git status
   ```
2. Verify that sensitive `.env` files and `node_modules` are ignored (handled automatically by our `.gitignore` configuration).
3. Stage and commit all files:
   ```bash
   git add .
   git commit -m "feat: configure production deployment for Vercel, Render, and Razorpay"
   ```
4. If you haven't linked a remote GitHub repository yet:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

---

## 3. Step 2: Deploy Backend to Render

### Option A: 1-Click Render Blueprint (Recommended)
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` and configure all settings automatically.
5. Fill in your MongoDB connection string and Razorpay keys when prompted.

### Option B: Manual Web Service Setup
1. On [Render Dashboard](https://dashboard.render.com/), click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the following service settings:
   - **Name**: `sklp-backend` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `Singapore` or `Oregon`)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Advanced Settings**:
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Render assigns ports dynamically |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas URI |
   | `JWT_SECRET` | `your_32_char_secret_key` | Secret for auth tokens |
   | `JWT_REFRESH_SECRET`| `your_32_char_refresh_key` | Secret for refresh tokens |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` | Vercel domain for CORS |
   | `RAZORPAY_KEY_ID` | `rzp_test_...` or `rzp_live_...` | Razorpay Key ID |
   | `RAZORPAY_KEY_SECRET` | `your_razorpay_secret` | Razorpay Key Secret |
6. Click **Create Web Service**.
7. Once deployed, note your backend URL: e.g., `https://sklp-backend.onrender.com`.

> [!TIP]
> **Keep-Alive Note for Render Free Tier:**
> Free tier Render services sleep after 15 minutes of inactivity. You can use a free service like [UptimeRobot](https://uptimerobot.com) to ping `https://your-backend.onrender.com/health` every 10 minutes to keep your server warm.

---

## 4. Step 3: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend.onrender.com/api` |
   | `VITE_RAZORPAY_KEY` | `rzp_test_...` or `rzp_live_...` |
   | `VITE_RAZORPAY_KEY_ID` | `rzp_test_...` or `rzp_live_...` |
   | `VITE_GOOGLE_CLIENT_ID`| *(Optional Google OAuth Client ID)* |
6. Click **Deploy**.
7. Vercel will build and assign a production URL: e.g., `https://sklp-fashion.vercel.app`.

---

## 5. Step 4: Configure Razorpay Payment Gateway

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Account & Settings** > **API Keys**.
3. Generate **Key ID** and **Key Secret** (start in Test Mode, switch to Live Mode when ready).
4. Configure Webhook (Optional but Recommended for automated reconciliation):
   - In Razorpay Dashboard, go to **Settings** > **Webhooks** > **Add New Webhook**.
   - **Webhook URL**: `https://your-backend.onrender.com/api/payments/webhook`
   - **Secret**: Enter a secret token and save it in Render backend as `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events**: Check `payment.captured`, `order.paid`, `payment.failed`.

---

## 6. Step 5: Configure Mobile OTP SMS Gateway (Fast2SMS / 2Factor)

To send real OTPs to Indian mobile numbers:

### Option 1: Fast2SMS (Recommended - 2 Min Setup)
1. Sign up for a free account at [Fast2SMS](https://www.fast2sms.com/).
2. Go to **Dev API** in the sidebar.
3. Copy your **API Authorization Key**.
4. In Render Dashboard > `sklp-backend` > **Environment**, add:
   - `SMS_PROVIDER`: `fast2sms`
   - `FAST2SMS_API_KEY`: *(paste your API key here)*

### Option 2: 2Factor.in
1. Sign up at [2Factor.in](https://2factor.in/).
2. Copy your API Key.
3. In Render Dashboard > `sklp-backend` > **Environment**, add:
   - `SMS_PROVIDER`: `2factor`
   - `TWOFACTOR_API_KEY`: *(paste your API key here)*

*(In local development without keys, OTPs are printed directly to the server terminal console without incurring SMS costs).*

---

## 7. Step 6: Link Frontend & Backend

1. **Update Backend CORS**:
   - Go to Render Dashboard > `sklp-backend` > **Environment**.
   - Ensure `FRONTEND_URL` is set to your exact Vercel URL (e.g. `https://sklp-fashion.vercel.app`).
2. **Update Frontend API Target**:
   - Go to Vercel Dashboard > Project Settings > **Environment Variables**.
   - Ensure `VITE_API_URL` is set to `https://your-backend.onrender.com/api`.
   - Trigger a redeploy if the variable was added after initial deploy.
3. **MongoDB Atlas IP Access**:
   - In MongoDB Atlas Dashboard > **Network Access** > **IP Access List**:
   - Ensure `0.0.0.0/0` (Allow Access from Anywhere) is added so Render cloud IPs can connect.

---

## 8. Step 7: Production Verification Checklist

- [x] **Backend Health Check**: Visit `https://your-backend.onrender.com/health` & `https://your-backend.onrender.com/api/health` — should return `{ status: 'ok', uptime: ... }`.
- [x] **Frontend SPA Routing**: Refresh any non-root page (e.g., `/shop`, `/checkout`, `/orders`) on Vercel — should load properly without 404 errors (powered by `vercel.json`).
- [x] **Authentication**: Sign up and log in as Customer, Seller, Delivery Partner, or Admin.
- [x] **Cart & Delivery Fee**: Add products to cart, enter delivery address in Checkout, and verify dynamic delivery calculation.
- [x] **Razorpay Checkout**: Click "Place Order" with Razorpay — Razorpay checkout modal opens, accepts payment, verifies cryptographic signature on backend, confirms order, and redirects to `/orders`.
