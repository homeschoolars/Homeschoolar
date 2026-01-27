# AI Configuration Guide

## Why AI Content Isn't Generating

If AI content (roadmaps, news, assessments) isn't being generated in your webapp, it's likely because the **Google Gemini API key is not configured** or is invalid.

## How to Check if Gemini is Configured

### 1. Check Health Endpoint

Visit: `https://homeschoolars.com/api/health`

You should see:
```json
{
  "ok": true,
  "db": "connected",
  "gemini_configured": true,  // ← Should be true
  "gemini_status": "ok"       // ← Should be "ok"
}
```

If `gemini_configured` is `false` or `gemini_status` is `"missing"` or `"placeholder"`, the API key is not set correctly.

### 2. Check Environment Variables

The app requires the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable to be set.

## How to Configure Gemini API Key

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (starts with `AIza...`)

### Step 2: Set the Environment Variable

#### For Local Development:

1. Create or edit `.env.local` file in the project root
2. Add:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your-actual-api-key-here
   ```
3. Restart your development server

#### For Production (Google Cloud Run):

1. Go to Google Cloud Console → Cloud Run → Your Service
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets" tab
4. Add environment variable:
   - **Name**: `GOOGLE_GENERATIVE_AI_API_KEY`
   - **Value**: Your API key
5. Deploy the new revision

#### For Production (Vercel):

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Key**: `GOOGLE_GENERATIVE_AI_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production (and Preview/Development if needed)
3. Redeploy your application

### Step 3: Verify Configuration

After setting the API key:

1. **Restart your server** (if local development)
2. **Redeploy** (if production)
3. Check `/api/health` endpoint again
4. Try generating content (roadmap, news, etc.)

## Common Issues

### Issue: API Key Not Working

**Symptoms:**
- `gemini_configured: true` but content generation fails
- Error messages about API quota or billing

**Solutions:**
1. Verify the API key is correct (no extra spaces, correct format)
2. Check Google Cloud Console for API quotas and billing
3. Ensure billing is enabled for your Google Cloud project
4. Check API key restrictions (IP, referrer, etc.)

### Issue: "API key is not configured" Error

**Symptoms:**
- Error message: "Google Gemini API key is not configured"
- `gemini_status: "missing"` or `"placeholder"`

**Solutions:**
1. Ensure `GOOGLE_GENERATIVE_AI_API_KEY` is set in environment variables
2. Check for typos in the variable name
3. Restart/redeploy after adding the variable
4. Verify the key is not the placeholder value `your-google-generative-ai-api-key-here`

### Issue: Content Generation Fails Silently

**Symptoms:**
- No error messages but no content generated
- Requests hang or timeout

**Solutions:**
1. Check server logs for Gemini API errors
2. Verify API key has proper permissions
3. Check network connectivity to Google AI services
4. Verify billing/quota limits

## Testing AI Generation

### Test Roadmap Generation:
1. Go to Parent Dashboard
2. Select a child who has completed assessment
3. Click "Generate Roadmap"
4. Check for error messages or success

### Test News Generation:
1. Go to Admin Dashboard → News tab
2. Click "Regenerate News"
3. Check for error messages or success

### Test Assessment:
1. Start a new assessment for a child
2. Check if questions are AI-generated or fallback

## API Key Security

⚠️ **Important:**
- Never commit API keys to version control
- Use environment variables, not hardcoded values
- Rotate keys regularly
- Use different keys for development and production
- Restrict API keys by IP/referrer when possible

## Support

If you continue to have issues:
1. Check `/api/health` endpoint status
2. Review server logs for detailed error messages
3. Verify API key in Google AI Studio dashboard
4. Check Google Cloud billing and quotas
