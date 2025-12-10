# Framerr Development Server Scripts

These PowerShell scripts provide an easy way to manage Framerr's development servers.

## Available Scripts

### `dev-start.ps1` - Start Development Servers
**Recommended for daily development**

Starts both backend and frontend dev servers in separate windows.

**Usage:**
```powershell
.\develop-server\dev-start.ps1
```

**What it does:**
- Checks and installs dependencies if needed
- Starts backend server on port 3001 (new window)
- Starts frontend dev server on port 5173 (new window)
- Shows helpful status messages

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

### `dev-stop.ps1` - Stop Development Servers
**Clean shutdown of all servers**

Stops all running dev servers by killing processes on ports 3001 and 5173.

**Usage:**
```powershell
.\develop-server\dev-stop.ps1
```

**What it does:**
- Finds processes using port 3001 (backend)
- Finds processes using port 5173 (frontend)
- Stops all nodemon processes
- Reports which processes were stopped

---

### `dev-watch.ps1` - Watch Mode (Combined Logs)
**For debugging and monitoring**

Runs both servers in a single window with combined output.

**Usage:**
```powershell
.\develop-server\dev-watch.ps1
```

**What it does:**
- Starts both servers in background jobs
- Streams output with `[BACKEND]` and `[FRONTEND]` prefixes
- Press Ctrl+C to stop both servers

**When to use:**
- Debugging server issues
- Monitoring both logs simultaneously
- Troubleshooting startup problems

---

## Quick Start Workflow

**First time setup:**
```powershell
# Navigate to project root
cd C:\Users\Jonathan\Documents\Antigravity\Framerr-app

# Start servers
.\develop-server\dev-start.ps1
```

**Daily workflow:**
```powershell
# Start
.\develop-server\dev-start.ps1

# Make changes to code (auto-reload!)

# Stop when done
.\develop-server\dev-stop.ps1
```

---

## Troubleshooting

**"Port already in use"**
- Run `.\develop-server\dev-stop.ps1` first
- If that doesn't work, manually kill:
  ```powershell
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  ```

**"Cannot find module"**
- Delete `node_modules` folders
- Run `dev-start.ps1` (auto-installs dependencies)

**Scripts won't run**
- Enable script execution:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```

---

## Features

✨ **Auto-install dependencies** - Checks and installs npm packages if missing  
🔄 **Hot reload** - Frontend changes reflect instantly  
🔁 **Auto-restart** - Backend restarts when you save files  
🎨 **Color-coded output** - Easy to distinguish backend/frontend logs  
🛡️ **Clean shutdown** - Properly stops all processes  

---

## Why Use These Instead of Manual Commands?

**Manual way:**
```powershell
# Terminal 1
cd server
npm run dev

# Terminal 2
cd ..
npm run dev
```

**Script way:**
```powershell
.\develop-server\dev-start.ps1
```

**Advantages:**
- ✅ One command vs multiple terminals
- ✅ Automatic dependency checks
- ✅ Visual feedback and status
- ✅ Easy to stop everything
- ✅ Consistent workflow

---

**Created:** 2025-12-10  
**Last Updated:** 2025-12-10
