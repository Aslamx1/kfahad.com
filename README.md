# KFAHAD Academy — Deployment

## Cloudflare Workers

The frontend and non-auth APIs run on Cloudflare Workers. Login, registration, OAuth,
and password reset are forwarded to Netlify Functions so existing accounts and password
hashes continue to work.

1. Connect this GitHub repository to Cloudflare Workers & Pages.
2. Set the build command to `npm run build` and deploy command to `npx wrangler deploy`.
   The repository's `wrangler.jsonc` configures static assets and API routes.
3. Set `ALLOWED_ORIGIN` to the exact public Cloudflare/custom-domain origin.
4. Set `AUTH_ALLOWED_ORIGIN` to an origin accepted by the Netlify auth site's
   `ALLOWED_ORIGIN` setting. For the production domain, this is `https://kfahad.com`.
5. Add Worker secrets in Cloudflare (never commit their values):
   `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `GEMINI_API_KEY`,
   `XYLEPAYMENTS_SECRET_KEY`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
6. Add Worker variables as required: `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET`,
   `XYLEPAYMENTS_BASE_URL`, and `CLOUDINARY_CLOUD_NAME`.
7. Redeploy and verify `/`, `/api/auth` (GET should return `405 Method not allowed`),
   login, and API requests.

The `RATE_LIMITER` SQLite Durable Object is configured by the `v1` migration in
`wrangler.jsonc`.

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
