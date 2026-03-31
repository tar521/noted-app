# shutdown.ps1
Write-Host "Stopping Noted Project..." -ForegroundColor Red

# 1. Kill Node processes by port
foreach ($port in @(5173, 3001)) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $procIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }
        foreach ($procId in $procIds) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Killed process $procId on port $port" -ForegroundColor Gray
        }
    }
}

# 2. Stop Nginx
Stop-Process -Name nginx -ErrorAction SilentlyContinue
Write-Host "Nginx stopped" -ForegroundColor Gray

Write-Host "App stopped. It will still start automatically on next login." -ForegroundColor Yellow
