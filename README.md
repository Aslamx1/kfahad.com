# KFAHAD Academy — Deployment

## 1) Preflight check
Run:

```bash
npm run check:live
```

## 2) Deploy to Netlify
1. Push repo to GitHub (or use Netlify Drop).
2. Create/import site in Netlify.
3. Make sure `netlify.toml` is used.

## 3) Set required environment variables in Netlify
From **Site configuration → Environment variables**, add:

- `SUPABASE_SECRET_KEY` (recommended) or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: `course-videos`)
- `GEMINI_API_KEY` (AI tutor)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 4) Create Admin Account
1. Go to https://kfahad.com
2. Click "Create one" and register the first account
3. In Supabase Dashboard → Table Editor → users table
4. Change that user's role from "student" to "admin"
5. Now you can access the Admin Panel

## 5) Verify live upload
1. Log in as Admin.
2. Go to **Courses**.
3. Click **Upload Health** (should pass).
4. Create a course and upload a video.
