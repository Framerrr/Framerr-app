# Framerr Development Server - Watch Mode
# Starts both servers in a single window with combined output for debugging

Write-Host "🔍 Starting Framerr Development Servers in Watch Mode..." -ForegroundColor Cyan
Write-Host "   (Combined logs for debugging)" -ForegroundColor Gray
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

Write-Host "Starting servers..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Start backend in background job
$BackendJob = Start-Job -ScriptBlock {
    param($ProjectRoot)
    Set-Location "$ProjectRoot\server"
    npm run dev
} -ArgumentList $ProjectRoot

# Start frontend in background job
$FrontendJob = Start-Job -ScriptBlock {
    param($ProjectRoot)
    Set-Location $ProjectRoot
    npm run dev
} -ArgumentList $ProjectRoot

Write-Host "📡 Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host "🎨 Frontend: http://localhost:5173" -ForegroundColor Blue
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Stream output from both jobs
try {
    while ($true) {
        # Get backend output
        $backendOutput = Receive-Job -Job $BackendJob
        if ($backendOutput) {
            foreach ($line in $backendOutput) {
                Write-Host "[BACKEND] " -ForegroundColor Green -NoNewline
                Write-Host $line
            }
        }
        
        # Get frontend output
        $frontendOutput = Receive-Job -Job $FrontendJob
        if ($frontendOutput) {
            foreach ($line in $frontendOutput) {
                Write-Host "[FRONTEND] " -ForegroundColor Blue -NoNewline
                Write-Host $line
            }
        }
        
        # Check if jobs are still running
        if ($BackendJob.State -eq 'Failed' -or $FrontendJob.State -eq 'Failed') {
            Write-Host ""
            Write-Host "⚠️  One or more servers failed to start!" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Milliseconds 100
    }
}
finally {
    # Cleanup jobs on exit
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $BackendJob, $FrontendJob
    Remove-Job -Job $BackendJob, $FrontendJob
    Write-Host "✅ Servers stopped" -ForegroundColor Green
}
