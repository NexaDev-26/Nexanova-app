# Deployment Fixes - Vercel (Frontend) + Render (Backend)

## Issues Fixed

### 1. Frontend API Configuration
**Problem:** Frontend was using relative URL `/api` which tried to call Vercel instead of Render backend.

**Solution:** Updated `frontend/src/utils/api.js` to use `REACT_APP_API_BASE_URL` environment variable pointing to Render backend.

### 2. CORS Configuration
**Problem:** Backend CORS didn't include the actual Vercel URL (`nenoapp-eight.vercel.app`).

**Solution:** Updated `backend/server.js` to:
- Include the actual Vercel URL
- Allow all Vercel preview deployments (wildcard pattern)
- Support custom frontend URL via `FRONTEND_URL` environment variable

## Required Environment Variables

### Vercel (Frontend)
Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
REACT_APP_API_BASE_URL=https://your-backend.onrender.com/api
```

Replace `your-backend.onrender.com` with your actual Render backend URL.

### Render (Backend)
Set these in Render Dashboard → Environment:

```
NODE_ENV=production
FRONTEND_URL=https://nenoapp-eight.vercel.app
JWT_SECRET=your-secure-jwt-secret-here
PORT=10000
```

**Note:** Render uses port 10000 by default, but your backend should use `process.env.PORT` which Render sets automatically.

## How to Find Your Render Backend URL

1. Go to your Render dashboard
2. Click on your backend service
3. Copy the URL (e.g., `https://nexanova-backend.onrender.com`)
4. Add `/api` to it for the frontend environment variable

## Testing the Connection

1. **Check Backend Health:**
   ```
   curl https://your-backend.onrender.com/api/health
   ```

2. **Check CORS:**
   - Open browser console on your Vercel frontend
   - Try to register/login
   - Check Network tab for CORS errors

3. **Verify Environment Variables:**
   - Frontend: Check Vercel build logs for `🔗 API BASE URL:`
   - Backend: Check Render logs for CORS configuration

## Common Issues

### "Registration endpoint not found"
- **Cause:** Frontend can't reach backend
- **Fix:** Verify `REACT_APP_API_BASE_URL` is set correctly in Vercel

### CORS Errors
- **Cause:** Backend doesn't allow your Vercel URL
- **Fix:** Add your Vercel URL to `FRONTEND_URL` in Render environment variables

### Network Errors
- **Cause:** Backend might be sleeping (Render free tier)
- **Fix:** Wait a few seconds for backend to wake up, or upgrade to paid tier

## Next Steps

1. Set `REACT_APP_API_BASE_URL` in Vercel with your Render backend URL
2. Set `FRONTEND_URL` in Render with your Vercel frontend URL
3. Redeploy both frontend and backend
4. Test registration and login

