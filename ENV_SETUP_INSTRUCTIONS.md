# Quick .env Setup for Supabase

## ✅ Port 5000 Fixed

The process on port 5000 has been killed. You can now start the server.

## 📝 Update Your .env File

Your `.env` file is located in the **root directory** of the project.

Open `.env` and make sure it contains:

```env
# Backend Environment Variables
NODE_ENV=development
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production

# Supabase Configuration
SUPABASE_URL=https://njomwijgeccbzjgbtmfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qb213aWpnZWNjYnpqZ2J0bWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjI2OTYsImV4cCI6MjA3ODgzODY5Nn0.MjdAQLbGI9s8_KsShdkDFCiF7H-piyk9lCEtowa3KZo

# Use Supabase instead of SQLite
USE_SUPABASE=true
```

## 🔍 Important Notes

1. **Location**: The `.env` file should be in the **root directory** (same level as `package.json`)
2. **USE_SUPABASE**: Must be set to `true` (as a string) to use Supabase
3. **Supabase Tables**: Make sure you've created the tables in Supabase Dashboard
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `backend/config/supabase-schema.sql`

## 🚀 After Updating .env

1. **Restart the backend server** (it will automatically reload with nodemon)
2. You should see: `✅ Using Supabase as database` instead of `✅ Using SQLite as database`
3. The server should start on port 5000 without errors

## ✅ Verification

After starting the server, check the console output:
- ✅ Should see: "✅ Using Supabase as database"
- ❌ Should NOT see: "⚠️ SUPABASE_URL or SUPABASE_ANON_KEY missing"
- ✅ Should see: "🚀 NexaNova Backend Server" with port 5000

## 🆘 Troubleshooting

### Still seeing "Using SQLite as database"
- Check that `USE_SUPABASE=true` (not `USE_SUPABASE=true` with quotes)
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Restart the server after making changes

### Port 5000 still in use

- Run: `taskkill /F /PID <process_id>`
- Or use: `netstat -ano | findstr :5000` to find the process

### Supabase connection errors

- Verify your Supabase URL and key are correct
- Check that tables exist in Supabase
- Check Supabase dashboard for any service issues
