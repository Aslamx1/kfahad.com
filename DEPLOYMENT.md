# KFAHAD Academy - Deployment Guide
## Namecheap Frontend + Netlify Backend

This guide explains how to deploy your KFAHAD Academy website with:
- **Frontend**: Namecheap hosting (static files)
- **Backend**: Netlify Functions (API, auth, payments, uploads)
- **Database**: Supabase

---

## Prerequisites

1. A Netlify account (for backend functions)
2. A Namecheap account (for frontend hosting)
3. A Supabase project (for database)
4. Domain name (can be from Namecheap or any provider)

---

## Step 1: Deploy Backend to Netlify

### 1.1 Push Code to Git
Upload your project to GitHub, GitLab, or Bitbucket.

### 1.2 Create Netlify Site
1. Go to [Netlify](https://app.netlify.com/)
2. Click "New site from Git"
3. Connect your repository
4. Configure build settings:
   - **Build command**: `npm run build` (or leave empty if no build step)
   - **Publish directory**: `.` (root)
   - **Functions directory**: `netlify/functions`

### 1.3 Set Environment Variables in Netlify
Go to Site Settings → Build & Deploy → Environment:

```
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_service_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_STORAGE_BUCKET=course-videos

# OAuth Providers
GOOGLE_CLIENT_ID=51201187998-jup8k6u53s32snsvulcv15thl482sug2.apps.googleusercontent.com
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Payments
XYLEPAYMENTS_SECRET_KEY=xk_sec_your_secret_key_here
XYLEPAYMENTS_BASE_URL=https://api.xylepayments.com/api/v1/client

# File Uploads
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=KFAHAD Academy <no-reply@yourdomain.com>

# Security
ALLOWED_ORIGIN=https://your-namecheap-domain.com
APP_URL=https://your-namecheap-domain.com

# AI
GEMINI_API_KEY=your_google_gemini_api_key
```

**Important**: Set `ALLOWED_ORIGIN` to your Namecheap domain (e.g., `https://yourdomain.com`).

### 1.4 Deploy to Netlify
Click "Deploy site". Netlify will build and deploy your functions.

### 1.5 Get Your Netlify Function URL
After deployment, your API endpoints will be:
```
https://your-site-name.netlify.app/api/auth
https://your-site-name.netlify.app/api/data
https://your-site-name.netlify.app/api/chat
https://your-site-name.netlify.app/api/messages
https://your-site-name.netlify.app/api/upload-profile-image
https://your-site-name.netlify.app/api/upload-course-video
```

---

## Step 2: Deploy Frontend to Namecheap

### 2.1 Prepare Files for Upload
You need to upload these files to Namecheap:
```
index.html
app.js
styles.css
KF LOGO.png
robot-ai.png
```

**Important**: Before uploading, you need to configure the API base URL in `app.js`.

### 2.2 Configure API Base URL

Open `app.js` and update the API_BASE_URL at the top:

```javascript
const API_BASE_URL = 'https://your-site-name.netlify.app/api';
```

Replace `https://your-site-name.netlify.app` with your actual Netlify site URL.

### 2.3 Upload to Namecheap

1. Log in to your Namecheap account
2. Go to "Hosting List" → Select your hosting plan
3. Click "File Manager" or use FTP
4. Navigate to the `public_html` folder (or your domain's root folder)
5. Upload all files:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `KF LOGO.png`
   - `robot-ai.png`

### 2.4 Alternative: Use FTP
If you prefer FTP:
1. Get your FTP credentials from Namecheap (Host → FTP Settings)
2. Use an FTP client like FileZilla
3. Connect and upload files to `/public_html/` or `/httpdocs/`

---

## Step 3: Configure CORS

Your Netlify functions already have CORS configured. Make sure:

1. In Netlify environment variables, `ALLOWED_ORIGIN` is set to your Namecheap domain:
   ```
   ALLOWED_ORIGIN=https://yourdomain.com
   ```

2. If using `www` and non-www versions, you may need to update the CORS logic in `security-headers.js` to allow both.

---

## Step 4: Update OAuth Redirect URIs

### 4.1 Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI:
   ```
   https://yourdomain.com/
   ```
   (Note: Google will redirect to the root of your site)

### 4.2 GitHub OAuth
1. Go to your GitHub App settings
2. Add Authorization callback URL:
   ```
    https://yourdomain.com/
    ```

---

## Step 5: Run Database Schema

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to "SQL Editor"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL Editor and run it
5. This creates all tables and RLS policies

---

## Step 6: Test Everything

### 6.1 Test Frontend
Visit your Namecheap domain: `https://yourdomain.com`
- Homepage should load
- Navigation should work
- Theme toggle should work

### 6.2 Test Authentication
- Try registering a new account
- Try logging in
- Test Google/GitHub login buttons

### 6.3 Test Backend Connection
Open browser DevTools → Network tab:
- Check that API requests go to `https://your-site-name.netlify.app/api/...`
- Check that responses are 200 OK

### 6.4 Test Payments
- Go to Payments page
- Try a deposit (use test/sandbox mode if available)

---

## Alternative: Deploy Everything to Netlify (Recommended)

If you want an easier setup, deploy everything to Netlify:

1. Push code to Git
2. Connect to Netlify
3. Set environment variables
4. Deploy

**Advantages**:
- No CORS issues (same origin)
- Simpler deployment
- Automatic SSL
- Built-in CDN

**To do this**:
1. In Netlify, set custom domain to your Namecheap domain
2. Update Namecheap nameservers to Netlify's nameservers:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
3. Or update A records to Netlify's load balancer IPs

---

## Troubleshooting

### CORS Errors
- Make sure `ALLOWED_ORIGIN` in Netlify matches your Namecheap domain exactly (including https://)
- Check that you're not mixing http and https

### OAuth Not Working
- Verify redirect URIs in Google/GitHub consoles
- Make sure client IDs are set in Netlify environment variables
- Check browser console for errors

### API Requests Failing
- Verify `API_BASE_URL` in app.js points to your Netlify site
- Check Netlify function logs for errors
- Make sure Supabase credentials are correct

### Login Not Working
- Check that `supabase-schema.sql` was run successfully
- Verify Supabase credentials in Netlify
- Check that user_sessions table exists

---

## Security Checklist

- [ ] `ALLOWED_ORIGIN` set to your actual domain (not `*`)
- [ ] All environment variables set in Netlify
- [ ] Supabase RLS policies enabled
- [ ] Strong password hashing enabled (scrypt)
- [ ] Rate limiting active
- [ ] HTTPS enabled (automatic with Netlify)
- [ ] OAuth client secrets stored in environment variables
- [ ] Database credentials not exposed in frontend code

---

## Support

If you encounter issues:
1. Check Netlify function logs
2. Check browser DevTools console
3. Verify all environment variables are set
4. Ensure Supabase schema is properly set up
