# HomeSchoolar Deployment Guide

This guide will help you deploy the HomeSchoolar application to production.

## Prerequisites

1. **Supabase Account** - For database and authentication
2. **Google Cloud Account** - For Gemini AI API key
3. **Stripe Account** - For payment processing
4. **Vercel Account** (recommended) or other hosting provider for Next.js
5. **Backend Hosting** - Railway, Render, Fly.io, or similar for FastAPI backend

## Step 1: Environment Variables

Copy the `env.example` file to `.env.local` and fill in all required values:

```bash
cp env.example .env.local
```

### Required Environment Variables

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)

#### AI (Google Gemini)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google Generative AI API key

#### Stripe
- `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (starts with `pk_`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (starts with `whsec_`)

#### Backend API
- `BACKEND_URL` - Your production backend URL (e.g., `https://api.homeschoolar.com`)
- `NEXT_PUBLIC_BACKEND_URL` - Same as above for client-side requests
- `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend origins

#### Optional
- `RESEND_API_KEY` - For email functionality (currently disabled)
- `NODE_ENV` - Set to `production` for production builds

## Step 2: Database Setup

1. **Run database migrations:**
   ```bash
   # Execute SQL scripts in the scripts/ directory in order:
   # 001_create_schema.sql
   # 002_seed_subjects.sql (or your seed files)
   # etc.
   ```

2. **Verify database connection:**
   ```bash
   node scripts/verify_db.js
   ```

## Step 3: Deploy Backend (FastAPI)

### Option A: Railway
1. Connect your GitHub repository
2. Set root directory to `backend/`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ALLOWED_ORIGINS` (comma-separated, e.g., `https://homeschoolar.vercel.app`)

### Option B: Render
1. Create new Web Service
2. Connect repository
3. Root directory: `backend/`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables as above

### Option C: Fly.io
```bash
cd backend
fly launch
# Follow prompts and set environment variables
```

## Step 4: Deploy Frontend (Next.js)

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

## Step 6: Verify Deployment

### Check Frontend
- [ ] Homepage loads correctly
- [ ] Login/Signup works
- [ ] User authentication functions
- [ ] Dashboard loads

### Check Backend
- [ ] Health endpoint works: `https://your-backend.com/health`
- [ ] Supabase connection works: `https://your-backend.com/health/supabase`
- [ ] CORS allows your frontend domain

### Check Features
- [ ] AI worksheet generation works
- [ ] Student dashboard loads
- [ ] Payment flow works (test mode)
- [ ] Database queries work

## Step 7: Production Checklist

- [ ] All environment variables set in production
- [ ] Database migrations run on production database
- [ ] Stripe webhooks configured with production URL
- [ ] Google Gemini API key configured
- [ ] CORS configured for production domain
- [ ] Backend URL configured in frontend
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

### Build Errors
- Ensure TypeScript errors are fixed (set `NODE_ENV=production` disables `ignoreBuildErrors`)
- Check that all dependencies are installed
- Verify Node.js version matches requirements (v18+)

### Database Connection Issues
- Verify Supabase credentials are correct
- Check that service role key has proper permissions
- Ensure database tables exist (run migrations)

## Security Notes

1. **Never commit `.env.local` or `.env` files**
2. **Use different API keys for development and production**
3. **Restrict `SUPABASE_SERVICE_ROLE_KEY` access - it bypasses RLS**
4. **Use environment variables in your hosting platform, not in code**
5. **Enable 2FA on all service accounts**

## Support

For issues or questions, check the application logs and error messages. Most deployment issues are related to:
- Missing environment variables
- Incorrect API keys
- CORS configuration
- Database connection issues
