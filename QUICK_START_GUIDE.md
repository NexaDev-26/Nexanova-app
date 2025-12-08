# NexaNova Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- SQLite3 (included with Node.js)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   # Backend (.env file in backend/ directory)
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your-secret-key-change-in-production
   USE_SUPABASE=false
   ```

3. **Start the development servers:**
   ```bash
   # From project root - starts both frontend and backend
   npm run dev
   
   # Or start separately:
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

## ✅ Verification Checklist

After starting the servers, verify:

- [ ] Backend server shows "✅ SQLite DB opened" message
- [ ] Backend server shows all API endpoints listed
- [ ] Frontend opens in browser without errors
- [ ] Can access `/onboarding` page
- [ ] Can register a new user
- [ ] Can login with registered user
- [ ] Can access dashboard after login

## 🔧 Common Issues & Solutions

### Backend won't start
- **Port 5000 already in use:**
  ```bash
  # Windows PowerShell
  .\kill-port-5000.ps1
  
  # Or manually find and kill process
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

### Frontend can't connect to backend
- Check backend is running on port 5000
- Check CORS configuration in `backend/server.js`
- Verify `frontend/package.json` has `"proxy": "http://localhost:5000"`

### Database errors
- Delete `backend/data/nexanova.db` and restart (will recreate)
- Check file permissions on `backend/data/` directory

### Module not found errors
- Run `npm run install-all` again
- Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules backend/node_modules frontend/node_modules
  npm run install-all
  ```

## 📝 Testing the System

### 1. Test Authentication
- Register new user at `/onboarding`
- Login at `/login`
- Verify token is stored in localStorage

### 2. Test Habits CRUD
- Navigate to `/habits`
- Create a new habit
- Complete the habit (check checkbox)
- Edit the habit
- Delete the habit

### 3. Test Finance CRUD
- Navigate to `/finance`
- Add income transaction
- Add expense transaction
- View summary
- Edit transaction
- Delete transaction

### 4. Test Journal CRUD
- Navigate to `/journal`
- Create new entry
- Add tags and mood
- Edit entry
- Delete entry

### 5. Test AI Chat
- Navigate to `/ai-chat` or use floating chat
- Send a message
- Verify AI response
- Check chat history

## 🔐 Default Test Credentials

After first registration, you can use:
- Email: (your registered email)
- Password: (your password)

## 📊 Database Location

- SQLite database: `backend/data/nexanova.db`
- Database schema: `backend/config/database.js`
- Migrations: `backend/migrations/`

## 🌐 API Endpoints

All API endpoints are prefixed with `/api`:

- `/api/auth/*` - Authentication
- `/api/user/*` - User profile
- `/api/habits/*` - Habit tracking
- `/api/finance/*` - Finance management
- `/api/journal/*` - Journal entries
- `/api/chat/*` - AI chat
- `/api/rewards/*` - Rewards & badges
- `/api/password-reset/*` - Password reset
- `/api/health` - Health check

## 🛠️ Development Commands

```bash
# Start both servers (development)
npm run dev

# Start backend only
npm run server
# or
cd backend && npm run dev

# Start frontend only
npm run client
# or
cd frontend && npm start

# Build for production
npm run build

# Install all dependencies
npm run install-all
```

## 📚 Next Steps

1. Review `SYSTEM_ANALYSIS_AND_FIXES.md` for detailed system documentation
2. Test all CRUD operations using the checklist above
3. Review API contract in `SYSTEM_ANALYSIS_AND_FIXES.md` section E
4. Implement optimizations from section G as needed

## 🆘 Need Help?

- Check `SYSTEM_ANALYSIS_AND_FIXES.md` for detailed analysis
- Review error messages in browser console (F12)
- Check backend console for server errors
- Verify database file exists and is accessible

---

**Happy Coding! 🎉**

