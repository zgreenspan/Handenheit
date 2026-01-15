# Conference Attendees Database - Vercel Deployment Guide

This guide will walk you through deploying your Conference Attendees Database to Vercel with password protection and custom domain support.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Your code needs to be in a Git repository (GitHub, GitLab, or Bitbucket)
3. **Custom Domain**: Have your domain DNS settings accessible
4. **Anthropic API Key**: Users will need their own API keys for AI search functionality

## Step 1: Prepare Your Code for Git

1. Open Terminal and navigate to your project:
   ```bash
   cd /Users/zacharygreenspan/Documents/Attendees
   ```

2. Initialize a Git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Conference Attendees Database"
   ```

3. Create a GitHub repository:
   - Go to [github.com/new](https://github.com/new)
   - Name it something like `conference-attendees-database`
   - Do NOT initialize with README
   - Click "Create repository"

4. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/conference-attendees-database.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)

2. Click "Add New..." → "Project"

3. Import your Git repository:
   - If this is your first time, connect your GitHub account
   - Select your `conference-attendees-database` repository
   - Click "Import"

4. Configure your project:
   - **Framework Preset**: Leave as "Other" (it's a static site with serverless functions)
   - **Root Directory**: Leave as `./`
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty

5. Add Environment Variables:
   Click "Environment Variables" and add:
   - **Name**: `SITE_PASSWORD`
   - **Value**: Your desired password (e.g., `MySecurePassword123`)
   - Select all environments (Production, Preview, Development)
   - Click "Add"

6. Click "Deploy"

7. Wait for deployment to complete (usually 1-2 minutes)

## Step 3: Set Up Custom Domain

1. In your Vercel dashboard, click on your project

2. Go to "Settings" → "Domains"

3. Add your custom domain:
   - Type your domain (e.g., `attendees.yourdomain.com`)
   - Click "Add"

4. Vercel will show you DNS records to add. You have two options:

   **Option A: Using a Subdomain (Recommended)**
   - Add a CNAME record:
     - Type: `CNAME`
     - Name: `attendees` (or your subdomain)
     - Value: `cname.vercel-dns.com`

   **Option B: Using Root Domain**
   - Add an A record:
     - Type: `A`
     - Name: `@`
     - Value: `76.76.21.21`

5. Go to your domain registrar's DNS settings and add these records

6. Wait for DNS propagation (can take 5 minutes to 48 hours)

7. Vercel will automatically issue an SSL certificate once DNS is configured

## Step 4: Test Your Deployment

1. Visit your custom domain (e.g., `https://attendees.yourdomain.com`)

2. You should see the login page

3. Enter your password (the one you set in `SITE_PASSWORD`)

4. You should be redirected to the main database interface

5. Test the functionality:
   - View Attendees tab should work
   - Data Collection tab should work
   - Import/Export should work
   - AI Search requires users to enter their own Anthropic API key

## Step 5: Configure AI Search for Users

Users will need to configure their own Anthropic API keys:

1. Tell users to go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. In your deployed app, go to "Import/Export" tab
4. Paste the API key in the "API Key Configuration" section
5. Click "Save API Key"
6. Now AI Search will work

## Important Notes

### Password Protection
- The password is set via the `SITE_PASSWORD` environment variable in Vercel
- To change the password:
  1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  2. Edit the `SITE_PASSWORD` variable
  3. Redeploy your project

### Data Storage
- **All data is stored in the user's browser** (localStorage)
- Data is NOT stored on the server
- Each user has their own separate database
- Users can export/import data using the Import/Export tab
- Consider setting up a shared export file if you want everyone to have the same data

### AI Search API Costs
- AI Search uses the Anthropic Claude API
- Each user pays for their own API usage
- Approximate cost: $0.003 per search (varies by database size)
- Users can get free credits at [console.anthropic.com](https://console.anthropic.com)

### Updating Your Site

To make changes and redeploy:

1. Make your changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. Vercel automatically redeploys when you push to main branch

### Troubleshooting

**Problem: AI Search not working**
- Solution: Make sure user has entered valid API key in Import/Export tab

**Problem: Can't log in**
- Solution: Check that SITE_PASSWORD environment variable is set in Vercel

**Problem: Domain not working**
- Solution: Check DNS records are correct and wait for propagation (up to 48 hours)

**Problem: Changes not showing up**
- Solution: Clear browser cache or hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## Security Best Practices

1. **Use a strong password** for `SITE_PASSWORD`
2. **Don't share the password** publicly
3. **Rotate the password** periodically
4. **Keep API keys private** - each user should have their own
5. **Use HTTPS only** - Vercel provides this automatically

## Support

For Vercel-specific issues:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

For application issues:
- Check browser console for errors (F12 → Console)
- Verify environment variables are set correctly
- Ensure DNS records are configured properly
