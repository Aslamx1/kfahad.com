# KFAHAD Academy - Pre-Deployment Checklist
## Deploying to https://kfahad.com

---

## YOUR CONFIGURATION

**Frontend Domain**: `https://kfahad.com` (Namecheap hosting)
**Backend**: Netlify Functions
**Database**: Supabase
**Payment Provider**: XylePayments (MTN/Airtel Uganda)

---

## STEP 1: SUPABASE DATABASE SETUP

1. Go to https://app.supabase.com
2. Open your project
3. Go to **SQL Editor**
4. Copy the entire contents of `supabase-schema.sql` from this project
5. Paste into SQL Editor and click **Run**
6. Verify these tables were created:
   - [ ] users
   - [ ] user_sessions
   - [ ] account_lockouts
   - [ ] password_resets
   - [ ] messages
   - [ ] notifications
   - [ ] payments
   - [ ] appointments
   - [ ] learning_progress
   - [ ] courses
   - [ ] blog_posts
   - [ ] jobs
   - [ ] knowledge_base
   - [ ] live_sessions
   - [ ] student_reviews
   - [ ] examples
   - [ ] pathways

7. Get your Supabase credentials:
   - [ ] SUPABASE_URL = `https://your-project.supabase.co`
   - [ ] SUPABASE_SECRET_KEY = `your-service-role-key`
   - [ ] SUPABASE_PUBLISHABLE_KEY = `your-anon-key`

---

## STEP 2: NETLIFY BACKEND DEPLOYMENT

### 2.1 Deploy to Netlify
1. Push this code to GitHub/GitLab
2. Go to https://app.netlify.com
3. Click **New site from Git**
4. Connect your repository
5. Configure:
   - **Build command**: `npm run build` (or leave empty)
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`

### 2.2 Set Environment Variables in Netlify
Go to Site Settings → Build & Deploy → Environment → Environment variables:

**CRITICAL - Database:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=course-videos
```

**CRITICAL - Security & CORS:**
```
ALLOWED_ORIGIN=https://kfahad.com
APP_URL=https://kfahad.com
```

**CRITICAL - Payments:**
```
XYLEPAYMENTS_SECRET_KEY=xk_sec_your_key_here
XYLEPAYMENTS_BASE_URL=https://api.xylepayments.com/api/v1/client
```

**OPTIONAL - OAuth (for social login):**
```
GOOGLE_CLIENT_ID=51201187998-jup8k6u53s32snsvulcv15thl482sug2.apps.googleusercontent.com
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**OPTIONAL - File Uploads:**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**OPTIONAL - AI Chat:**
```
GEMINI_API_KEY=your_gemini_api_key
```

**OPTIONAL - Email:**
```
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=KFAHAD Academy <no-reply@kfahad.com>
```

### 2.3 Deploy
1. Click **Deploy site**
2. Wait for deployment to complete
3. **Copy your Netlify site URL** (e.g., `https://kfahad-academy.netlify.app` or similar)
   - You will need this for the next step!

---

## STEP 3: UPDATE FRONTEND API URL

1. Open `app.js` in a text editor
2. Find line 87:
   ```javascript
   const API_BASE_URL = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__) || '/api';
   ```
3. Change it to:
   ```javascript
   const API_BASE_URL = 'https://YOUR-NETLIFY-SITE-NAME.netlify.app/api';
   ```
   Replace `YOUR-NETLIFY-SITE-NAME` with your actual Netlify site name.

   Example:
   ```javascript
   const API_BASE_URL = 'https://kfahad-academy.netlify.app/api';
   ```

4. Save the file

---

## STEP 4: UPLOAD TO NAMECHEAP

1. Log in to Namecheap account
2. Go to **Hosting List** → Select your hosting
3. Click **File Manager**
4. Navigate to `public_html` (or `httpdocs`)
5. Upload these files:
   - [ ] `index.html`
   - [ ] `app.js` (with updated API_BASE_URL)
   - [ ] `styles.css`
   - [ ] `KF LOGO.png`
   - [ ] `robot-ai.png`

**FTP Alternative:**
- Use FileZilla with your Namecheap FTP credentials
- Upload to `/public_html/` or `/httpdocs/`

---

## STEP 5: CONFIGURE OAUTH (OPTIONAL)

### Google OAuth
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI:
   ```
   https://kfahad.com/
   ```
4. Copy Client ID to Netlify env vars

### GitHub OAuth
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Homepage URL: `https://kfahad.com`
3. Authorization callback URL: `https://kfahad.com/`
4. Copy Client ID and Secret to Netlify

---

## STEP 6: VERIFY DEPLOYMENT

### 6.1 Check Frontend
- [ ] Visit https://kfahad.com
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Theme toggle works
- [ ] All pages load (Courses, Pricing, About, Blog, Contact, Terms, Privacy, System Status)

### 6.2 Check API Connection
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try to register a new account
4. Check that requests go to your Netlify URL
5. Responses should be 200 OK

### 6.3 Test Authentication
- [ ] Register with email/password
- [ ] Login with email/password
- [ ] Login with Google (if configured)
- [ ] Login with GitHub (if configured)
- [ ] Logout works

### 6.4 Test Database
1. Register a user
2. Go to Supabase → Table Editor
3. Check `users` table has the new user
4. Check `user_sessions` table has a session

### 6.5 Test Security Features
- [ ] Try 5 wrong passwords → account locks for 15 minutes
- [ ] Check that passwords are hashed in database (not plain text)
- [ ] Verify HTTPS is enabled on both domains

---

## IMPORTANT CONFIGURATIONS

### CORS Setup
Your Netlify `ALLOWED_ORIGIN` must be exactly:
```
ALLOWED_ORIGIN=https://kfahad.com
```

If you also use `www.kfahad.com`, update `security-headers.js` to allow both:
```javascript
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const origins = allowedOrigin ? allowedOrigin.split(',') : [];
// Then check if reqOrigin matches any
```

### Netlify Site URL
Your backend will be at:
```
https://[your-netlify-site-name].netlify.app
```

You MUST update `app.js` line 87 with this URL.

### HTTPS
- Namecheap: Enable HTTPS in Namecheap hosting panel
- Netlify: Automatic HTTPS (no action needed)

---

## TROUBLESHOOTING

### CORS Errors
**Error**: `Access-Control-Allow-Origin` mismatch
**Fix**: 
1. Check Netlify `ALLOWED_ORIGIN` = `https://kfahad.com`
2. Make sure no `www` mismatch
3. Both sites must use HTTPS

### Login Fails
**Error**: 401 or 500 on /api/auth
**Fix**:
1. Check Supabase credentials in Netlify
2. Verify `supabase-schema.sql` was run
3. Check Netlify function logs

### OAuth Not Working
**Error**: Redirect URI mismatch
**Fix**:
1. Verify redirect URIs in OAuth providers
2. Must be exactly `https://kfahad.com/`
3. Check client IDs in Netlify env vars

### API Not Found
**Error**: 404 on API calls
**Fix**:
1. Verify `API_BASE_URL` in app.js is correct
2. Check Netlify functions are deployed
3. Verify function URLs in Netlify dashboard

---

## SECURITY CHECKLIST

Before going live:
- [ ] `ALLOWED_ORIGIN=https://kfahad.com` (not `*`)
- [ ] All secrets in Netlify env vars (not in code)
- [ ] Supabase RLS enabled
- [ ] HTTPS enabled on both domains
- [ ] OAuth redirect URIs configured
- [ ] Tested all login methods
- [ ] Tested payment flow
- [ ] Rate limiting active
- [ ] Account lockout working
- [ ] Error messages don't leak info

---

## SUPPORT

If something doesn't work:
1. Check Netlify function logs: Site → Functions → Logs
2. Check browser DevTools console
3. Check Supabase logs
4. Verify all environment variables are set

---

## YOUR DETAILS

**Domain**: https://kfahad.com
**Netlify Backend**: [your-netlify-site-name].netlify.app
**Supabase Project**: [your-project-name]
**Database Schema**: supabase-schema.sql

---

## QUICK START SUMMARY

1. [ ] Run `supabase-schema.sql` in Supabase
2. [ ] Deploy backend to Netlify
3. [ ] Set ALL environment variables in Netlify
4. [ ] Copy Netlify site URL
5. [ ] Update `app.js` line 87 with Netlify URL
6. [ ] Upload files to Namecheap `public_html/`
7. [ ] Test everything
8. [ ] Go live!
