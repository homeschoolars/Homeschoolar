# HomeSchoolar Deployment Guide

This guide will help you deploy the HomeSchoolar application to production.

## Prerequisites

1. **PostgreSQL Database** - Hosted on Supabase, Neon, RDS, or similar
2. **Google Cloud Account** - For Gemini AI API key
3. **Stripe Account** - For payment processing
4. **Hosting Provider** - Vercel, Cloud Run, or similar for Next.js

## Step 1: Environment Variables

Copy the `env.example` file to `.env.local` and fill in all required values:

```bash
cp env.example .env.local
```

### Required Environment Variables

#### Database
- `DATABASE_URL` - PostgreSQL connection string
#### Auth.js
- `AUTH_SECRET` - Auth.js secret
- `AUTH_URL` - Public URL of your deployment

#### AI (Google Gemini)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google Generative AI API key

#### Stripe
- `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (starts with `pk_`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (starts with `whsec_`)

#### Backend API
- `BACKEND_URL` - Optional external backend URL if you run a separate API
- `NEXT_PUBLIC_BACKEND_URL` - Same as above for client-side requests
- `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend origins

#### Optional
- `RESEND_API_KEY` - For email functionality (currently disabled)
- `NODE_ENV` - Set to `production` for production builds

## Step 2: Database Setup

1. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

## Step 3: Deploy Next.js

### Vercel (Recommended)

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository

2. **Configure Environment Variables:**
   - Add all `NEXT_PUBLIC_*` variables
   - Add all server-side variables (STRIPE_SECRET_KEY, etc.)
   - Set `BACKEND_URL` to your production backend URL
   - Set `ALLOWED_ORIGINS` if needed

3. **Build Settings:**
   - Framework Preset: Next.js
   - Root Directory: `./` (root)
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

### Google Cloud Run

1. **Set environment variables** (required for AI features):
   - Open [Cloud Console](https://console.cloud.google.com/) → Cloud Run → your service
   - Edit the service → **Variables & Secrets** tab
   - Add `GOOGLE_GENERATIVE_AI_API_KEY` with your [Gemini API key](https://aistudio.google.com/apikey)
   - Add `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and any other vars from `env.example`
   - Save and redeploy (or create a new revision)

2. **Verify Gemini is used (not fallback):**
   - `GET https://your-service.run.app/api/health` → expect `"gemini_configured": true`, `"gemini_status": "ok"`
   - If `gemini_configured` is `false`, the key is not set or not loaded in Cloud Run
   - Run the assessment quiz; if you see generic questions like "What is 2 + 2?", fallback is active

### Alternative: Self-Hosted

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Step 5: Configure Stripe Webhooks

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Step 5: Verify Deployment

### Check Frontend
- [ ] Homepage loads correctly
- [ ] Login/Signup works
- [ ] User authentication functions
- [ ] Dashboard loads

### Check Features
- [ ] AI worksheet generation works
- [ ] Student dashboard loads
- [ ] Payment flow works (test mode)
- [ ] Database queries work

## Step 6: Production Checklist

- [ ] All environment variables set in production
- [ ] Database migrations run on production database
- [ ] Stripe webhooks configured with production URL
- [ ] Google Gemini API key configured
- [ ] CORS configured for production domain
- [ ] Auth.js secret configured
- [ ] Error logging/monitoring set up (e.g., Sentry)
- [ ] Database backups enabled
- [ ] SSL certificates configured (should be automatic with Vercel)
- [ ] Test all critical user flows

## Troubleshooting

### Backend CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your frontend domain
- Check that backend URL is accessible
- Verify CORS middleware is configured correctly

### API Errors
- Check that all environment variables are set
- Verify API keys are valid
- Check backend logs for errors

### Assessment uses fallback (e.g. "What is 2 + 2?" instead of AI questions)
- **If `GET /api/health` shows `gemini_configured: false`:** The API key is missing. Set `GOOGLE_GENERATIVE_AI_API_KEY` in your host env vars (Cloud Run: Variables & Secrets; Vercel: Project Settings). Redeploy.
- **Fix:** Set the key in your host’s env vars (Cloud Run: Variables & Secrets; Vercel: Project Settings → Environment Variables). Redeploy.
- **Check:** `GET /api/health` on the **deployed** URL. Ensure `gemini_configured: true` and `gemini_status: "ok"`.
- The initial-assessment API response includes `source: "ai" | "fallback"`; `"fallback"` means Gemini was not used.

### Build Errors
- Ensure TypeScript errors are fixed (set `NODE_ENV=production` disables `ignoreBuildErrors`)
- Check that all dependencies are installed
- Verify Node.js version matches requirements (v18+)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure migrations are applied

## Security Notes

1. **Never commit `.env.local` or `.env` files**
2. **Use different API keys for development and production**
3. **Never expose database credentials to the client**
4. **Use environment variables in your hosting platform, not in code**
5. **Enable 2FA on all service accounts**

## Support

For issues or questions, check the application logs and error messages. Most deployment issues are related to:
- Missing environment variables
- Incorrect API keys
- CORS configuration
- Database connection issues
