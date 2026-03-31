# shutdown.ps1
   Write-Host "🛑 Stopping Noted Project..." -ForegroundColor Red

   # 1. Kill Node processes by port
   foreach ($port in @(5173, 3001)) {
       $procId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty
   OwningProcess -Unique
       if ($procId) {
           Stop-Process -Id $procId -Force
           Write-Host "✔ Killed process on port $port" -ForegroundColor Gray
       }
   }

   # 2. Stop Nginx
   Stop-Process -Name nginx -ErrorAction SilentlyContinue
   Write-Host "✔ Nginx stopped" -ForegroundColor Gray

   Write-Host "✔ App stopped. It will still start automatically on next login." -ForegroundColor Yellow