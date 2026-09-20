# Deploy KFAHAD Academy to Netlify
## Team: lensnetwork45as | Domain: https://kfahad.com

---

## IMPORTANT: DO THIS FIRST

Before clicking "Deploy", you must update `app.js` with your Netlify backend URL.

### Step 1: Get Your Netlify Site URL

After you deploy, Netlify will give you a URL like:
- `https://kfahad-academy.netlify.app`
- `https://kfahad-academy.netlify.app` (or similar)

**You need this URL before uploading to Namecheap.**

### Step 2: Update app.js

Open `app.js` and find line 87:
```javascript
const API_BASE_URL = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__) || '/api';
```

Change it to:
```javascript
const API_BASE_URL = 'https://YOUR-NETLIFY-SITE-NAME.netlify.app/api';
```

Replace `YOUR-NETLIFY-SITE-NAME` with your actual Netlify site name.

**Example:**
```javascript
const API_BASE_URL = 'https://kfahad-academy.netlify.app/api';
```

---

## DEPLOYMENT STEPS

### Option A: Deploy via Git (Recommended)

1. **Push to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to https://app.netlify.com/teams/lensnetwork45as/projects
   - Click "New site from Git"
   - Select your repository
   - Build settings:
     - **Build command**: `npm run build` (or leave empty)
     - **Publish directory**: `.` (root)
     - **Functions directory**: `netlify/functions`

3. **Set Environment Variables**
   In Netlify dashboard → Site settings → Build & Deploy → Environment:
   
   ```
   SUPABASE_URL=https://stbpjtzeaxxzuzagzhmz.supabase.co
   SUPABASE_SECRET_KEY=your-service-role-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_PUBLISHABLE_KEY=your-anon-key
   SUPABASE_STORAGE_BUCKET=course-videos
   
   ALLOWED_ORIGIN=https://kfahad.com
   APP_URL=https://kfahad.com
   
   GOOGLE_CLIENT_ID=51201187998-jup8k6u53s32snsvulcv15thl482sug2.apps.googleusercontent.com
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   
   XYLEPAYMENTS_SECRET_KEY=xk_sec_your_key
   XYLEPAYMENTS_BASE_URL=https://api.xylepayments.com/api/v1/client
   ```

4. **Deploy**
   - Click "Deploy site"
   - Wait for deployment to complete
   - Copy your site URL

5. **Update app.js with Netlify URL**
   - Edit `app.js` line 87 with your Netlify URL
   - Commit and push again
   - Netlify will auto-redeploy

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   netlify init
   ```
   - Select "Create & configure a new site"
   - Select your team: `lensnetwork45as`
   - Follow the prompts

4. **Set Environment Variables**
   ```bash
   netlify env:set SUPABASE_URL "https://stbpjtzeaxxzuzagzhmz.supabase.co"
   netlify env:set SUPABASE_SECRET_KEY "your-service-role-key"
   netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
   netlify env:set SUPABASE_PUBLISHABLE_KEY "your-anon-key"
   netlify env:set SUPABASE_STORAGE_BUCKET "course-videos"
   netlify env:set ALLOWED_ORIGIN "https://kfahad.com"
   netlify env:set APP_URL "https://kfahad.com"
   netlify env:set GOOGLE_CLIENT_ID "51201187998-jup8k6u53s32snsvulcv15thl482sug2.apps.googleusercontent.com"
   netlify env:set GITHUB_CLIENT_ID "your_github_client_id"
   netlify env:set GITHUB_CLIENT_SECRET "your_github_client_secret"
   netlify env:set XYLEPAYMENTS_SECRET_KEY "xk_sec_your_key"
   netlify env:set XYLEPAYMENTS_BASE_URL "https://api.xylepayments.com/api/v1/client"
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

6. **Update app.js with your site URL**
   - Edit line 87 in `app.js`
   - Commit and push

---

## AFTER NETLIFY DEPLOYMENT

### Step 1: Update Frontend
1. Edit `app.js` line 87:
   ```javascript
   const API_BASE_URL = 'https://your-site-name.netlify.app/api';
   ```

### Step 2: Upload to Namecheap
Upload these files to Namecheap `public_html/`:
- `index.html`
- `app.js` (with updated API URL)
- `styles.css`
- `KF LOGO.png`
- `robot-ai.png`

### Step 3: Configure OAuth
- **Google**: Add `https://kfahad.com/` as redirect URI
- **GitHub**: Add `https://kfahad.com/` as callback URL

### Step 4: Run Database Schema
1. Go to https://supabase.com/dashboard/project/stbpjtzeaxxzuzagzhmz/sql
2. Run `supabase-schema.sql`

---

## VERIFICATION CHECKLIST

- [ ] Netlify site is deployed
- [ ] `app.js` updated with Netlify URL
- [ ] Files uploaded to Namecheap
- [ ] `https://kfahad.com` loads
- [ ] Registration works
- [ ] Login works
- [ ] Google login works
- [ ] GitHub login works
- [ ] Database has users table
- [ ] Payments page loads

---

## TROUBLESHOOTING

### Deployment Fails
- Check Netlify build logs
- Make sure `netlify.toml` is in the root directory
- Verify all environment variables are set

### API Calls Fail
- Verify `API_BASE_URL` in `app.js` matches your Netlify URL
- Check Netlify function logs
- Verify `ALLOWED_ORIGIN` matches `https://kfahad.com`

### CORS Errors
- Make sure `ALLOWED_ORIGIN=https://kfahad.com` in Netlify
- Check that both sites use HTTPS
- No `www` mismatch

---

## YOUR CREDENTIALS SUMMARY

**Supabase**: https://stbpjtzeaxxzuzagzhmz.supabase.co
**Google Client ID**: 51201187998-jup8k6u53s32snsvulcv15thl482sug2.apps.googleusercontent.com
**GitHub OAuth**: https://github.com/settings/applications/3732807
**Domain**: https://kfahad.com

---

## SUPPORT

If you need help:
1. Check Netlify function logs
2. Check browser DevTools console
3. Verify all environment variables
4. Make sure Supabase schema is run
