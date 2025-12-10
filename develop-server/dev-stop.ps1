# Framerr Development Server - Stop Script
# Stops all running dev servers cleanly

Write-Host "🛑 Stopping Framerr Development Servers..." -ForegroundColor Red
Write-Host ""

# Function to kill processes on a specific port
function Stop-ProcessOnPort {
    param(
        [int]$Port
    )
    
    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    
    if ($connections) {
        foreach ($connection in $connections) {
            $parts = $connection -split '\s+' | Where-Object { $_ -ne '' }
            $pid = $parts[-1]
            
            if ($pid -match '^\d+$') {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Stop-Process -Id $pid -Force
                        Write-Host "✓ Stopped process on port $Port (PID: $pid)" -ForegroundColor Green
                    }
                }
                catch {
                    Write-Host "⚠️  Could not stop process on port $Port (PID: $pid)" -ForegroundColor Yellow
                }
            }
        }
    }
    else {
        Write-Host "ℹ️  No process running on port $Port" -ForegroundColor Gray
    }
}

# Stop backend (port 3001)
Write-Host "Checking backend server (port 3001)..." -ForegroundColor Cyan
Stop-ProcessOnPort -Port 3001

# Stop frontend (port 5173)
Write-Host "Checking frontend server (port 5173)..." -ForegroundColor Cyan
Stop-ProcessOnPort -Port 5173

# Also stop any nodemon processes
$nodemon = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*nodemon*" }
if ($nodemon) {
    $nodemon | Stop-Process -Force
    Write-Host "✓ Stopped nodemon processes" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All dev servers stopped!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Run .\develop-server\dev-start.ps1 to start servers again" -ForegroundColor Yellow
Write-Host ""
