# Framerr Development Server - Start Script
# Starts both backend and frontend dev servers in separate windows

Write-Host "🚀 Starting Framerr Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Get the project root directory (parent of this script's directory)
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Check if node_modules exists
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "⚠️  Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    npm install
}

if (-not (Test-Path "$ProjectRoot\server\node_modules")) {
    Write-Host "⚠️  Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location "$ProjectRoot\server"
    npm install
    Set-Location $ProjectRoot
}

# Start backend server in new PowerShell window
Write-Host "📡 Starting Backend Server (Port 3001)..." -ForegroundColor Green
$BackendWindow = Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\server'; Write-Host '📡 Backend Server' -ForegroundColor Green; npm run dev" -PassThru

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend dev server in new PowerShell window
Write-Host "🎨 Starting Frontend Dev Server (Port 5173)..." -ForegroundColor Blue
$FrontendWindow = Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; Write-Host '🎨 Frontend Dev Server' -ForegroundColor Blue; npm run dev" -PassThru

# Wait a moment for frontend to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Dev servers started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access your app at:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   • Changes to frontend code will hot-reload automatically" -ForegroundColor Gray
Write-Host "   • Backend will auto-restart when you save server files" -ForegroundColor Gray
Write-Host "   • Run .\develop-server\dev-stop.ps1 to stop servers" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
