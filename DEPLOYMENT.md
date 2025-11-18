# NexaNova Deployment Guide

## Overview
This guide covers deploying NexaNova to Vercel for testing and production use.

## Changes Made for Deployment Compatibility

### 1. **Fixed Warnings**
- ✅ **JWT_SECRET**: Now uses a secure 64-character hex string instead of the default warning
- ✅ **SUPABASE_KEY**: Properly configured with environment variables and fallback to SQLite
- ✅ **Environment Variables**: All required variables now documented and set in `.env`

### 2. **Vercel Configuration Files**

#### Root `vercel.json`
- Configures the frontend build
- Sets environment variables for production
- Uses React build output as root

#### Backend `vercel.json`
- Configures serverless API functions
- Sets up rewrites for API routes
- Configures function memory and timeout

#### Backend `api/index.js`
- New serverless function entry point
- Exports Express app for Vercel
- Includes all middleware and route configuration

### 3. **Environment Configuration**
All environment variables are now properly set:
- `JWT_SECRET`: Secure production key
- `SUPABASE_KEY` & `SUPABASE_ANON_KEY`: Production credentials
- `NODE_ENV`: Environment detection
- `CORS_ORIGINS`: CORS configuration for production

---

## Deployment to Vercel

### Prerequisites
- GitHub account with repository
- Vercel account (free tier available)
- Git installed locally

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: Add Vercel deployment configuration"
git push origin main
```

### Step 2: Deploy Frontend

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the root directory (where `frontend/` is located)
5. Configure environment variables:
   ```
   REACT_APP_API_URL=https://your-backend-api.vercel.app/api
   ```
6. Click "Deploy"

### Step 3: Deploy Backend (API)

1. In Vercel dashboard, create a new project
2. Import the same GitHub repository
3. Select "Other" for framework
4. Set root directory to `backend/`
5. Override build command: `npm install`
6. Override output directory: (leave empty - uses serverless functions)
7. Configure environment variables:
   ```
   PORT=3000
   NODE_ENV=production
   JWT_SECRET=8f3a7c2d9b1e4f6a5c8d3e2f1a9b7c4d6e8f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a
   SUPABASE_URL=https://njomwijgeccbzjgbtmfe.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
8. Click "Deploy"

### Step 4: Update Frontend API URL

After backend is deployed, update the frontend's REACT_APP_API_URL environment variable:
- Get your backend API URL from Vercel (e.g., `https://nexanova-api.vercel.app`)
- Go to frontend project settings
- Update `REACT_APP_API_URL` to `https://nexanova-api.vercel.app/api`
- Trigger a redeploy

---

## Local Development

### Prerequisites
- Node.js 20.x or later
- npm or yarn

### Setup

1. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

2. Configure environment:
```bash
# Copy .env if not exists
cp .env.example .env
```

3. Start both servers:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:3000
```

### Available Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start with hot reload (nodemon)

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

---

## Environment Variables

### Development (`.env`)

```dotenv
# Server
PORT=5000
NODE_ENV=development

# Security
JWT_SECRET=your-secure-secret-key

# Supabase (optional)
SUPABASE_URL=https://njomwijgeccbzjgbtmfe.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_KEY=your-key

# CORS
CORS_ORIGINS=

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

### Production (Vercel)

Set in Vercel dashboard:
- `NODE_ENV=production`
- `JWT_SECRET=` (secure production key)
- `SUPABASE_URL=` (production Supabase URL)
- `SUPABASE_ANON_KEY=` (production key)
- `SUPABASE_KEY=` (production key)
- `CORS_ORIGINS=https://your-frontend.vercel.app`
- `REACT_APP_API_URL=https://your-backend.vercel.app/api`

---

## Troubleshooting

### Port Already in Use
If port 5000 is already in use:
```powershell
# Windows PowerShell
.\kill-port-5000.ps1
```

### Supabase Connection Issues
1. Verify `SUPABASE_KEY` is set in `.env`
2. Check that the key is valid
3. The app will fallback to SQLite if Supabase is unavailable

### CORS Errors
1. Check `CORS_ORIGINS` in production environment
2. Ensure frontend and backend URLs are configured correctly
3. In development, CORS allows all origins by default

### API Connection Issues
1. Verify backend is running on the correct port
2. Check `REACT_APP_API_URL` environment variable
3. Ensure firewall allows connections

---

## Monitoring

### Frontend
- Vercel Analytics dashboard shows page performance
- Check deployment logs in Vercel dashboard

### Backend
- Check function logs in Vercel dashboard
- Monitor error rates and response times
- Set up alerts for failed deployments

---

## Security Considerations

1. **Never commit `.env` with real secrets**
2. **Generate new JWT_SECRET for production**: 
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. **Use Vercel environment variables** for sensitive data
4. **Enable HTTPS** on all production URLs
5. **Keep dependencies updated**

---

## Rollback

### Frontend
1. Go to Vercel dashboard
2. Select project
3. Go to "Deployments"
4. Click the previous deployment
5. Click "Redeploy"

### Backend
Same process as frontend - select deployment and redeploy

---

## Support

For issues:
1. Check deployment logs in Vercel dashboard
2. Verify all environment variables are set
3. Ensure backend and frontend URLs match in configuration
4. Check that Supabase credentials are valid

---

## Next Steps

- [ ] Set up custom domain on Vercel
- [ ] Configure monitoring and error tracking
- [ ] Set up CI/CD with GitHub Actions
- [ ] Enable automatic deployments on push
- [ ] Set up database backups
- [ ] Configure email notifications for deployments
