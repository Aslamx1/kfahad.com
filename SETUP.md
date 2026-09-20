# KFAHAD Academy - Final Deployment Checklist
## Namecheap Frontend + Netlify Backend + Supabase Database

---

## BEFORE YOU START

Make sure you have:
- [ ] Netlify account
- [ ] Namecheap hosting account
- [ ] Supabase project (free tier is fine)
- [ ] Domain name (from Namecheap or any provider)
- [ ] OAuth app credentials (Google, GitHub - optional but recommended)
- [ ] XylePayments account (for payments - optional)

---

## STEP 1: DATABASE SETUP (Supabase)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up / log in
3. Click "New Project"
4. Enter project name and password
5. Wait for project to be ready

### 1.2 Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql` from this project
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

### 1.3 Get Supabase Credentials
1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - `URL` (e.g., `https://your-project.supabase.co`)
   - `anon` key (publishable key)
   - `service_role` key (SECRET - keep this safe!)

---

## STEP 2: NETLIFY BACKEND SETUP

### 2.1 Deploy to Netlify
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://app.netlify.com/)
3. Click "New site from Git"
4. Connect your repository
5. Configure:
   - **Build command**: `npm run build` (or leave empty if no build step)
   - **Publish directory**: `.` (root)
   - **Functions directory**: `netlify/functions`

### 2.2 Set Environment Variables in Netlify
Go to Site Settings → Build & Deploy → Environment → Environment variables:

**Required (Database):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_service_role_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_STORAGE_BUCKET=course-videos
```

**Required (Security):**
```
ALLOWED_ORIGIN=https://your-domain.com
APP_URL=https://your-domain.com
```

**Required (Payments - if using XylePayments):**
```
XYLEPAYMENTS_SECRET_KEY=xk_sec_your_key_here
XYLEPAYMENTS_BASE_URL=https://api.xylepayments.com/api/v1/client
```

**Optional (OAuth - for social login):**
```
GOOGLE_CLIENT_ID=51201187998-jup8k6u53s32snsvulcv15thl482sug2.apps.googleusercontent.com
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Optional (File Uploads - if using Cloudinary):**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Optional (AI Chat - if using Gemini):**
```
GEMINI_API_KEY=your_gemini_api_key
```

**Optional (Email - if using Resend):**
```
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=KFAHAD Academy <no-reply@yourdomain.com>
```

### 2.3 Deploy
1. Click "Deploy site"
2. Wait for deployment to complete
3. Note your Netlify site URL (e.g., `https://your-site-name.netlify.app`)

---

## STEP 3: NAMECHEAP FRONTEND SETUP

### 3.1 Update API Base URL
Before uploading to Namecheap, update `app.js`:

1. Open `app.js` in a text editor
2. Find this line (around line 87):
   ```javascript
   const API_BASE_URL = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__) || '/api';
   ```
3. Change it to:
   ```javascript
   const API_BASE_URL = 'https://your-site-name.netlify.app/api';
   ```
   Replace `https://your-site-name.netlify.app` with your actual Netlify URL.

### 3.2 Upload Files to Namecheap
1. Log in to Namecheap account
2. Go to **Hosting List**
3. Click **Manage** next to your hosting plan
4. Click **File Manager**
5. Navigate to `public_html` folder (or `httpdocs` - depends on your setup)
6. Upload these files:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `KF LOGO.png`
   - `robot-ai.png`

**Alternative: Use FTP**
1. Get FTP credentials from Namecheap (Host → FTP Settings)
2. Use FileZilla or similar FTP client
3. Connect and upload files to `/public_html/` or `/httpdocs/`

---

## STEP 4: CONFIGURE OAUTH (OPTIONAL BUT RECOMMENDED)

### 4.1 Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI:
   ```
   https://your-domain.com/
   ```
   (Note: No trailing slash issues, Google handles this)
6. Copy the Client ID to Netlify environment variables

### 4.2 GitHub OAuth
1. Go to GitHub → **Settings** → **Developer settings** → **OAuth Apps**
2. Create a new OAuth App
3. Homepage URL: `https://kfahad.com`
4. Authorization callback URL: `https://kfahad.com/`
5. Copy Client ID and Client Secret to Netlify

---

## STEP 5: TESTING

### 5.1 Test Frontend
1. Visit `https://your-domain.com`
2. Homepage should load
3. Navigation should work
4. Theme toggle should work

### 5.2 Test Authentication
1. Try **Register** with email/password
2. Try **Login** with email/password
3. Try **Google Login** (if configured)
4. Try **GitHub Login** (if configured)

### 5.3 Test Backend Connection
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try logging in
4. Check that requests go to `https://your-netlify-site.netlify.app/api/...`
5. Responses should be 200 OK

### 5.4 Test Database
1. Register a new user
2. Go to Supabase Dashboard → Table Editor
3. Check that user appears in `users` table
4. Check that session appears in `user_sessions` table

### 5.5 Test Payments (if configured)
1. Go to Payments page
2. Try a deposit
3. Check XylePayments dashboard for transaction

---

## IMPORTANT NOTES

### CORS Configuration
- `ALLOWED_ORIGIN` in Netlify must match your Namecheap domain EXACTLY
- Include `https://` prefix
- Example: `https://yourdomain.com` or `https://www.yourdomain.com`

### HTTPS
- Namecheap hosting supports HTTPS
- Netlify functions always use HTTPS
- Make sure both use HTTPS (not HTTP)

### API Calls
All API calls from the frontend go to:
```
https://your-netlify-site.netlify.app/api/*
```

### Rate Limiting
- Auth endpoints: 10 requests per minute
- Chat: 15 requests per minute
- Messages: 30 requests per 30 seconds
- Data writes: 60 requests per minute

### Account Lockout
- After 5 failed login attempts: 15 minute lockout
- This is stored in Supabase `account_lockouts` table

---

## TROUBLESHOOTING

### CORS Errors in Browser Console
**Problem**: `Access-Control-Allow-Origin` mismatch

**Solution**:
1. Check `ALLOWED_ORIGIN` in Netlify matches your Namecheap domain exactly
2. Make sure both use HTTPS
3. Check for `www` vs non-www mismatch

### Login Not Working
**Problem**: 401 Unauthorized or 500 errors

**Solution**:
1. Check Netlify function logs
2. Verify Supabase credentials in Netlify
3. Make sure `supabase-schema.sql` was run successfully
4. Check that `user_sessions` table exists

### OAuth Login Not Working
**Problem**: Redirect URI mismatch

**Solution**:
1. Verify redirect URIs in Google/GitHub consoles
2. Make sure they match your domain exactly
3. Check that client IDs are set in Netlify

### Uploads Not Working
**Problem**: Image/video uploads fail

**Solution**:
1. Check Cloudinary credentials (if using Cloudinary)
2. Check Supabase storage bucket exists
3. Check Netlify function logs

### Payments Not Working
**Problem**: Deposit/withdrawal fails

**Solution**:
1. Check XylePayments API key
2. Make sure using sandbox mode for testing
3. Check phone number format (256XXXXXXXXX, no +)

---

## SECURITY CHECKLIST

Before going live:
- [ ] `ALLOWED_ORIGIN` set to your actual domain (not `*`)
- [ ] All API keys and secrets stored in Netlify environment variables
- [ ] `supabase-schema.sql` executed successfully
- [ ] RLS policies enabled in Supabase
- [ ] HTTPS enabled on both Namecheap and Netlify
- [ ] OAuth redirect URIs configured correctly
- [ ] Tested all authentication methods
- [ ] Tested payment flow (if applicable)
- [ ] Rate limiting is active
- [ ] Account lockout is working
- [ ] Error messages don't leak sensitive info

---

## SUPPORT

If you encounter issues:
1. Check Netlify function logs (Site → Functions → Logs)
2. Check browser DevTools console
3. Check Supabase logs (Database → Logs)
4. Verify all environment variables are set correctly

---

## QUICK REFERENCE

**Netlify Site URL**: `https://your-site-name.netlify.app`
**Namecheap Domain**: `https://yourdomain.com`
**Supabase Dashboard**: `https://app.supabase.com`
**API Endpoints**:
- Auth: `https://your-site-name.netlify.app/api/auth`
- Data: `https://your-site-name.netlify.app/api/data`
- Chat: `https://your-site-name.netlify.app/api/chat`
- Messages: `https://your-site-name.netlify.app/api/messages`
- Upload Image: `https://your-site-name.netlify.app/api/upload-profile-image`
- Upload Video: `https://your-site-name.netlify.app/api/upload-course-video`
