# Handenheit Setup Guide

This guide explains how to set up your Handenheit deployment with password protection and server-side API keys.

## Security Features

Your Handenheit deployment now includes:
1. **Password Protection**: Users must enter a password to access the site
2. **Server-Side API Keys**: API keys are stored securely on the server, not in users' browsers
3. **No Key Exposure**: Users cannot see or extract your API keys

## Vercel Environment Variables Setup

You need to configure 3 environment variables in Vercel:

### Step 1: Go to Your Vercel Project Settings

1. Log in to [vercel.com](https://vercel.com)
2. Select your **Handenheit** project
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)

### Step 2: Add Required Environment Variables

Add these 3 variables:

#### 1. HANDENHEIT_PASSWORD
- **Key**: `HANDENHEIT_PASSWORD`
- **Value**: Your chosen password (e.g., `MySecurePass123!`)
- **Environments**: Select **Production**, **Preview**, and **Development**
- Click **Save**

#### 2. GOOGLE_API_KEY
- **Key**: `GOOGLE_API_KEY`
- **Value**: Your Google Gemini API key (starts with `AIza`)
- Get your key from: https://aistudio.google.com/apikey
- **Environments**: Select **Production**, **Preview**, and **Development**
- Click **Save**

#### 3. ANTHROPIC_API_KEY
- **Key**: `ANTHROPIC_API_KEY`
- **Value**: Your Anthropic Claude API key (starts with `sk-ant-`)
- Get your key from: https://console.anthropic.com/
- **Environments**: Select **Production**, **Preview**, and **Development**
- Click **Save**

### Step 3: Redeploy Your Site

After adding all environment variables:

1. Go to the **Deployments** tab
2. Click the **⋯** (three dots) on your latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache**
5. Click **Redeploy**

OR simply push a new commit to GitHub, which will trigger automatic deployment.

## How to Use

### Login

1. Visit your Handenheit URL
2. You'll see a login page
3. Enter the password you set in `HANDENHEIT_PASSWORD`
4. Click **Login**

### Using AI Search

- The AI search will work automatically using your server-side API keys
- Users cannot see or access your API keys
- All costs are paid from your accounts
- You can track usage in:
  - Google AI Studio: https://aistudio.google.com/
  - Anthropic Console: https://console.anthropic.com/

## Estimated Costs

Based on a database of 1,300 profiles:

| Model | First Search | Subsequent Searches (Cached) |
|-------|-------------|------------------------------|
| **Gemini 3 Flash** (Recommended) | $0.23 | $0.003 each |
| **Gemini 3 Pro** | $0.90 | $0.012 each |
| **Claude Sonnet** | $1.35 | $0.14 each |

### Cache Duration:
- **Gemini** (with Pro account): 60 minutes (FREE!)
- **Claude Sonnet**: 5 minutes (90% off)

### Example Cost Scenarios:

**10 searches in 30 minutes with Gemini 3 Flash:**
- First search: $0.23
- Next 9 searches: 9 × $0.003 = $0.027
- **Total: $0.257**

**10 searches in 30 minutes with Claude Sonnet:**
- Every ~5 minutes cache expires, so ~7 full-cost + 3 cached
- Full cost: 7 × $1.35 = $9.45
- Cached: 3 × $0.14 = $0.42
- **Total: $9.87**

**Recommendation**: Use Gemini 3 Flash for most searches. Use Claude Sonnet only when you need the absolute best reasoning quality.

## Security Best Practices

### DO:
✅ Keep your Vercel password secret
✅ Use a strong, unique password for `HANDENHEIT_PASSWORD`
✅ Monitor API usage regularly in Google AI Studio and Anthropic Console
✅ Rotate API keys if you suspect they've been compromised
✅ Only share the site URL with trusted individuals

### DON'T:
❌ Share your site password publicly
❌ Commit API keys to Git (they're in environment variables now)
❌ Share your API keys with anyone
❌ Use simple passwords like "password123"

## Troubleshooting

### "Invalid password" error
- Check that `HANDENHEIT_PASSWORD` is set correctly in Vercel
- Make sure you redeployed after adding the variable
- Password is case-sensitive

### "API key not configured on server" error
- Check that `GOOGLE_API_KEY` and/or `ANTHROPIC_API_KEY` are set in Vercel
- Make sure you selected all environments (Production, Preview, Development)
- Make sure you redeployed after adding the variables
- Verify API keys are valid and not expired

### AI search not working
- Check browser console (F12 → Console tab) for errors
- Verify you have profiles in your database
- Try a different model
- Check API key quotas in provider dashboards

### Logged out unexpectedly
- Authentication uses session storage, which clears when you close the browser tab
- This is intentional for security - you'll need to log in again when you reopen the site

## Local Development

If you're running locally (http://localhost:8000):

1. Create a `.env` file in the project root:
```
HANDENHEIT_PASSWORD=your_password_here
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
```

2. Start the server:
```bash
python3 proxy-server.py
```

3. Open http://localhost:8000/auth.html

## Support

If you encounter issues:
1. Check this guide thoroughly
2. Check browser console for error messages
3. Verify all environment variables are set correctly in Vercel
4. Make sure you redeployed after setting variables

## Summary

You've now set up:
- ✅ Password-protected access to your site
- ✅ Server-side API key storage (secure)
- ✅ Multi-model AI search (Gemini 3 Flash, Gemini 3 Pro, Claude Sonnet)
- ✅ Cost-optimized prompt caching

Your Handenheit deployment is now secure and ready to use!
