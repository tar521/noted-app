# setup.ps1
$ProjectRoot = Get-Location
$HostsFile = "C:\Windows\System32\drivers\etc\hosts"
$StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"

Write-Host "Starting Noted Project Setup (Windows)..." -ForegroundColor Cyan

# 1. Admin Check
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Error: Please run this script as an Administrator." -ForegroundColor Red
    exit
}

# 2. Chocolatey Setup & Update
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Installing..." -ForegroundColor Blue
    Set-ExecutionPolicy Bypass -Scope Process -Force;
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;
    $installScript = (New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')
    Invoke-Expression $installScript
    $env:Path = "$env:Path;$env:ALLUSERSPROFILE\chocolatey\bin"
} else {
    Write-Host "Updating Chocolatey..." -ForegroundColor Blue
    choco upgrade chocolatey -y
}

# 3. Nginx Setup & Update
Write-Host "Ensuring Nginx is installed and up-to-date..." -ForegroundColor Blue

# Stop ALL nginx processes first to avoid lock and conflict
Stop-Process -Name nginx -ErrorAction SilentlyContinue
$Port80Process = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($Port80Process) {
    Write-Host "Stopping existing process on port 80 to allow Nginx installation..." -ForegroundColor Yellow
    foreach ($procId in $Port80Process) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

choco upgrade nginx -y --install-if-not-installed

# Dynamically find Nginx installation path
$NginxExePath = Get-ChildItem -Path C:\tools -Filter nginx.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $NginxExePath) {
    Write-Host "Error: Nginx.exe not found in C:\tools after installation." -ForegroundColor Red
    exit
}
$NginxDir = Split-Path $NginxExePath
$NginxConf = Join-Path $NginxDir "conf\nginx.conf"
$ServersDir = Join-Path $NginxDir "conf\servers"
if (-not (Test-Path $ServersDir)) { New-Item -ItemType Directory -Path $ServersDir -Force }

# 4. Project Install
Write-Host "Installing NPM dependencies..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -eq 0) {
    Set-Location backend
    npm install
    Set-Location ..
}
if ($LASTEXITCODE -eq 0) {
    Set-Location frontend
    npm install
    Set-Location ..
}

# 5. Host Alias
if (-not (Select-String -Path $HostsFile -Pattern "notes-app")) {
    Write-Host "Adding 'notes-app' to hosts file..." -ForegroundColor Blue
    Add-Content -Path $HostsFile -Value "`n127.0.0.1 notes-app"
}

# 6. Nginx Configuration
# Patch main nginx.conf to include the servers directory
$ConfigContent = Get-Content $NginxConf -Raw
if ($ConfigContent -notmatch "include servers/\*\.conf;") {
    Write-Host "Linking 'servers' directory in Nginx config..." -ForegroundColor Yellow
    # Clean up any old broken include pattern first
    $ConfigContent = $ConfigContent -replace 'include servers/\*;', ''
    # Insert 'include servers/*.conf;' right after 'http {'
    $ConfigContent = $ConfigContent -replace 'http \{', "http {`n    include servers/*.conf;"
    $CleanContent = $ConfigContent -replace '(?s)}\s*server\s*{\s*listen\s*80;\s*server_name\s*notes-app;.*$', '}'
    $CleanContent | Out-File $NginxConf -Encoding ascii
}

# Create the Proxy Config
$ProxyConfig = @"
server {
    listen 80;
    server_name notes-app;
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
"@
$ProxyConfig | Out-File -FilePath (Join-Path $ServersDir "notes-app.conf") -Encoding ascii

# Restart Nginx
Write-Host "Starting Nginx from $NginxExePath..." -ForegroundColor Blue
Stop-Process -Name nginx -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-Process $NginxExePath -WorkingDirectory $NginxDir


# 7. Create Auto-start Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$StartupFolder\NotedApp.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Hidden -Command ""Set-Location '$ProjectRoot'; npm run dev"""
$Shortcut.WorkingDirectory = "$ProjectRoot"
$Shortcut.Save()

# 8. Start the App Now
Write-Host "Starting the app in a background window..." -ForegroundColor Blue
Start-Process "powershell.exe" -ArgumentList "-WindowStyle Hidden -Command ""Set-Location '$ProjectRoot'; npm run dev""" -WorkingDirectory "$ProjectRoot"

Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "Access your app at: http://notes-app" -ForegroundColor Cyan

