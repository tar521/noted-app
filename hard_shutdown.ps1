# hard_shutdown.ps1
   $StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
   $LnkFile = "$StartupFolder\NotedApp.lnk"

   Write-Host "🧨 Performing HARD SHUTDOWN..." -ForegroundColor Red

   # 1. Remove Auto-start Shortcut
   if (Test-Path $LnkFile) {
       Remove-Item $LnkFile
       Write-Host "• Startup shortcut removed (Auto-start disabled)." -ForegroundColor Yellow
   }

   # 2. Run standard shutdown
   & "$PSScriptRoot\shutdown.ps1"

   Write-Host "✔ Project fully unregistered and stopped." -ForegroundColor Red