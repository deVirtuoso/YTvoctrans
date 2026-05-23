# VoiceTranslate Lite - Production Deployment Guide

This guide details the step-by-step process to deploy the **VoiceTranslate Lite** backend to production on **Vercel**, link a highly-scalable cloud database on **Turso**, integrate **Resend** for transactional emails, and connect **Stripe** for Pro subscription management.

---

## 🛠️ Step 1: Provision Turso Cloud Database

Turso provides an ultra-fast, edge-replicated SQLite engine that is 100% serverless-compliant.

1. **Sign Up / Login**:
   - Go to [Turso Console](https://turso.tech/) and sign up for a free account.
2. **Install Turso CLI** (Optional, or use the online dashboard):
   ```bash
   curl -sSf https://get.tur.so/install.sh | sh
   ```
3. **Create Database**:
   - Run the command to create a new SQLite database:
     ```bash
     turso db create voicetranslate
     ```
4. **Get Database URL & Auth Token**:
   - Run the following to display the URL (e.g. `libsql://voicetranslate-username.turso.io`):
     ```bash
     turso db show voicetranslate
     ```
   - Generate a secure production authentication token:
     ```bash
     turso db tokens create voicetranslate
     ```
5. **Configure variables**:
   - Save these as `TURSO_DB_URL` and `TURSO_DB_AUTH_TOKEN`.

---

## 📧 Step 2: Configure Resend Transactional Mail

Resend handles double-opt-in sign-up confirmations and secure password reset emails with a high-deliverability free tier.

1. **Sign Up**:
   - Create a free account at [Resend](https://resend.com/).
2. **Create API Key**:
   - Go to the API Keys panel, click **Create API Key**, and save the key (e.g., `re_123456789`).
3. **Connect Your Namecheap Custom Domain** (Highly Recommended):
   - In Resend, go to **Domains** -> **Add Domain**. Enter your domain (e.g. `yourdomain.com`).
   - Resend will output 3 DNS records:
     - **SPF/TXT**
     - **DKIM/CNAME**
     - **MX/DKIM**
4. **Wire DNS on Namecheap (cPanel)**:
   - Log into your **Namecheap cPanel**.
   - Search for **Zone Editor** under the *Domains* section.
   - Select your domain and click **Manage**.
   - Add the corresponding `TXT`, `CNAME`, and `MX` records provided by Resend.
   - Wait 5-10 minutes, then click **Verify** in the Resend dashboard. Your emails will now be sent authentic and secure with 100% delivery!

---

## 🔑 Step 3: Google OAuth 2.0 Credentials

Allows seamless "Sign in with Google" inside the extension popup.

1. **Create Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click "Select a project" -> **New Project**, and name it `VoiceTranslate Lite`.
2. **OAuth Consent Screen**:
   - Go to **APIs & Services** -> **OAuth consent screen**.
   - Choose **External** user type and fill in the required fields (AppName: `VoiceTranslate Lite`, support email).
3. **Generate Credentials**:
   - Navigate to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
   - Select application type **Web Application**.
   - Add **Authorized Redirect URIs**:
     ```
     https://y-tvoctrans.vercel.app/api/auth/google/callback
     ```
     *(If you map a custom domain on Vercel, swap `y-tvoctrans.vercel.app` with your custom domain).*
4. **Copy IDs**:
   - Save the **Client ID** and **Client Secret** as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## 💳 Step 4: Setup Stripe Subscriptions

Tracks paid licenses, active/cancelled states, and automatically lifts translation limits for active subscribers.

1. **Developer Keys**:
   - Register or log in at [Stripe Dashboard](https://stripe.com/).
   - Navigate to **Developers** -> **API keys**.
   - Copy the **Secret Key** (`sk_live_...` or `sk_test_...` for sandboxing).
2. **Create Subscription Product**:
   - Go to **Product catalog** -> **Add product**.
   - Name the product: `VoiceTranslate Lite Pro`.
   - Set the billing model to **Recurring**, select price (e.g., `$9.99 USD / month`).
   - Save the product and copy the resulting **Price ID** (`price_...`).
3. **Register Live Webhook**:
   - Navigate to **Developers** -> **Webhooks** -> **Add endpoint**.
   - Set the endpoint URL to:
     ```
     https://y-tvoctrans.vercel.app/api/webhooks/stripe
     ```
   - Click **Select events** and enable:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Save the endpoint and copy the **Signing Secret** (`whsec_...`) from the webhook settings.

---

## ⚡ Step 5: Deploy Backend to Vercel

Vercel hosts the backend serverless functions, serving global users with zero cold start lags.

1. **Prerequisites**:
   - Push your code to a private or public GitHub repository.
2. **Import Project**:
   - Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New** -> **Project**.
   - Import your GitHub repository.
3. **Project Configurations**:
   - **Framework Preset**: Select **Next.js** (detected automatically).
   - **Root Directory**: Set to `backend` (click Edit next to Root Directory and select the `backend` folder).
4. **Add Environment Variables**:
   - Expand the **Environment Variables** accordion and add all the keys from `.env.production`:
     - `TURSO_DB_URL`
     - `TURSO_DB_AUTH_TOKEN`
     - `RESEND_API_KEY`
     - `FROM_EMAIL` (e.g. `VoiceTranslate <noreply@yourdomain.com>`)
     - `NEXT_PUBLIC_APP_URL` (e.g. `https://y-tvoctrans.vercel.app`)
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_PRICE_ID`
     - `STRIPE_WEBHOOK_SECRET`
5. **Deploy**:
   - Click **Deploy**. Vercel will bundle the code, execute build checks, and provision your endpoints globally in under 2 minutes!

---

## 🔌 Step 6: Load Chrome Extension

The front-end Chrome extension is fully pre-wired to connect directly to the production Vercel endpoints.

1. **Rebranding Verification**:
   - All branding references have been successfully updated to **VoiceTranslate Lite**.
   - `manifest.json` host permissions allow cross-origin handshakes with `https://y-tvoctrans.vercel.app/*`.
   - `popup.js` connects session checkups directly with production backend URL.
2. **Install in Developer Mode**:
   - Open Google Chrome.
   - Go to URL `chrome://extensions/`.
   - Toggle **Developer mode** in the top-right corner.
   - Click **Load unpacked** in the top-left.
   - Choose the root extension folder `YTvoctrans-main` (the folder containing `manifest.json`).
3. **Verify Functionality**:
   - Click the extension icon in your browser toolbar.
   - Click **Sign In with Google** or sign up using your email and password.
   - Complete verification (sandbox mode outputs verification links to Vercel server console, production sends a premium HTML email via Resend!).
   - Navigate to a YouTube video with English subtitles, click **VoiceTranslate**, and watch the natural real-time synchronized dubs synthesize in real-time!
