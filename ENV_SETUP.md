# Environment Variables Setup Guide

## Frontend (.env file in `frontend/` directory)

Create `frontend/.env` with:

```env
REACT_APP_API_BASE_URL=https://neno-app.onrender.com/api
NODE_ENV=production
```

**For Vercel Deployment:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `REACT_APP_API_BASE_URL` = `https://neno-app.onrender.com/api`
   - `NODE_ENV` = `production`

## Backend (.env file in `backend/` directory)

Create `backend/.env` with:

```env
NODE_ENV=production
PORT=10000

FRONTEND_URL=https://nenoapp-eight.vercel.app

JWT_SECRET=GwvrQ99ET5Dn+PSyDGMxJi3U2tjqKHmQaqhaLPhQWlEm4WqscQ1/9iIyYM30WwXzttwFRwcw3Q6lHhF+r+IpUQ==

SUPABASE_URL=https://njomwijgeccbzjgbtmfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qb213aWpnZWNjYnpqZ2J0bWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjI2OTYsImV4cCI6MjA3ODgzODY5Nn0.MjdAQLbGI9s8_KsShdkDFCiF7H-piyk9lCEtowa3KZo

USE_SUPABASE=true
```

**For Render Deployment:**
1. Go to Render Dashboard → Your Service → Environment
2. Add all the variables above

## Important Notes

1. **API URL must end with `/api`** - The frontend expects the backend API base URL to end with `/api`
2. **Supabase Tables** - Make sure you've run the SQL schema in Supabase Dashboard → SQL Editor
3. **CORS** - The backend will automatically allow your Vercel frontend URL

## Testing

After setting up environment variables:

1. **Test Backend:**
   ```bash
   curl https://neno-app.onrender.com/api/health
   ```

2. **Test Frontend Connection:**
   - Open browser console on your Vercel frontend
   - Try to register/login
   - Check Network tab for API calls

## Troubleshooting

### "Registration endpoint not found"
- Check that `REACT_APP_API_BASE_URL` ends with `/api`
- Verify the backend URL is correct

### CORS Errors
- Make sure `FRONTEND_URL` is set in Render backend environment
- Check that your Vercel URL matches the `FRONTEND_URL`

### Database Errors
- Verify Supabase credentials are correct
- Make sure tables are created in Supabase (run `backend/config/supabase-schema.sql`)

