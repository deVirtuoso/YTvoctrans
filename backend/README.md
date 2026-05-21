# VoiceTranslate Lite - Serverless User & Translation Backend

This is the production-ready serverless backend for the **VoiceTranslate Lite** Chrome Extension, built on Next.js, Turso SQLite, Stripe, and Resend.

It provides secure email/password signup, email verification, password resets, Google OAuth, subscription handling, and a stateless voice translation & TTS engine directly on Vercel.

---

## 🚀 Getting Started & Local Development

### 1. Installation
In the `backend/` directory, install all required dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (or `.env.local` for development):
```bash
cp .env.example .env.local
```
Fill in the corresponding values (Turso DB credentials, Stripe keys, Resend API key, Google OAuth IDs).

### 3. Database Initialization
This application dynamically checks and initializes its SQLite tables on startup using the direct LibSQL adapter.
When running in local dev mode (without `TURSO_DB_URL` configured), it automatically creates a local SQLite database at `prisma/dev.db`.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the homepage and access login routes.

---

## 💳 Stripe Integration & Webhooks

To test checkout and subscription lifecycle state management:
1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Authenticate the CLI:
   ```bash
   stripe login
   ```
3. Forward webhook events to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret printed by the CLI (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET` in your `.env.local` file.
5. In your Stripe Dashboard, create a recurring product (e.g., $9.99/month) and set the resulting price ID as `STRIPE_PRICE_ID`.

---

## ⚡ Deployment to Production

For a complete step-by-step guide to deploying the entire suite to production (including provisioning **Turso Cloud DB**, setting up **Resend** domain verification with your **Namecheap cPanel DNS settings**, setting up **Google OAuth**, configuring **Stripe webhooks**, and hosting on **Vercel**), please refer to the detailed production guide:

👉 **[DEPLOYMENT.md](file:///h:/NETWORKPEN/AI%20Works/YTvoctrans-main/backend/DEPLOYMENT.md)**

