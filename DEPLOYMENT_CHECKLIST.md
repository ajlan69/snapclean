## Vercel Environment Variables (must be set for Production + Preview + Development)
- NEXT_PUBLIC_SUPABASE_URL = <value from .env.local>
- NEXT_PUBLIC_SUPABASE_ANON_KEY = <value from .env.local>
- SUPABASE_SERVICE_ROLE_KEY = <value from .env.local>
- NEXT_PUBLIC_SITE_URL = https://snapclean-nine.vercel.app  (no trailing slash)

## Supabase Dashboard → Authentication → URL Configuration
- Site URL: https://snapclean-nine.vercel.app
- Redirect URLs:
  - https://snapclean-nine.vercel.app/**
  - https://snapclean-nine.vercel.app/auth/callback
  - http://localhost:3000/**

## Google Cloud Console → Credentials → OAuth Client
- Authorized JavaScript origins:
  - https://snapclean-nine.vercel.app
  - http://localhost:3000
- Authorized redirect URIs:
  - https://qldyhkmjisxbqazdjytn.supabase.co/auth/v1/callback

## After changing any NEXT_PUBLIC_* variable
- Go to Vercel → Deployments → latest → "..." → Redeploy
