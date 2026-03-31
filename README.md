# Noted 📓

A personal notes and todo tracker. Dark, minimal, fast. Built with React + Vite (frontend) and Express + SQLite (backend).

---

## Setup

### Prerequisites

- **Node.js 18+**
- **npm**
- **Homebrew** (Required for macOS setup)
- **Chocolatey** (Will be installed automatically by the Windows setup script)

### 1. Install Dependencies (Manual)

If you prefer to install dependencies manually before running scripts:

```bash
npm install && (cd backend && npm install) && (cd frontend && npm install)
```

### 2. Automated Local Domain & Startup Setup

To use `http://notes-app` instead of IP addresses and ports, run the setup script for your operating system. These scripts configure Nginx, map your local hosts file, and register the app to start automatically on login.

#### **macOS**
```bash
chmod +x setup_script.sh
./setup_script.sh
```
*Note: This script will ask for your password once to enable passwordless sudo for the app's services and to configure Nginx.*

#### **Windows**
1. Open **PowerShell** as an **Administrator**.
2. Run:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\setup.ps1
```

---

## Running the App

### Automatic Mode

Once the setup script has been run, the app is registered as a background service (**Launch Agent** on macOS, **Startup Shortcut** on Windows). It will start automatically every time you log in.

### Manual Control Scripts

| macOS Script | Windows Script | Description |
|---|---|---|
| `./setup_script.sh` | `.\setup.ps1` | Resets the environment, refreshes Nginx, and ensures the app is running. |
| `./shutdown.sh` | `.\shutdown.ps1` | Stops the app processes for the current session but leaves auto-start enabled. |
| `./hard_shutdown.sh` | `.\hard_shutdown.ps1` | Stops the app, unregisters it from startup, and (on macOS) disables the sudo bypass. |
| `./disable_sudo_bypass.sh` | N/A | Standalone script to disable passwordless sudo for macOS. |

Access the app at: **http://notes-app**

---

## Troubleshooting

### **Common (Both OS's)**

#### **1. "This site can't be reached" (NXDOMAIN)**
If your browser cannot find `notes-app`, it might be using DNS-over-HTTPS.
- **Fix:** Go to Browser Settings > Privacy & Security > Security > Disable "Use secure DNS" or set it to "System" provider.
- **Verify:** Run `ping notes-app` in your terminal to ensure it resolves to `127.0.0.1`.

---

### **macOS Specific**

#### **1. Launch Agent not starting**
If the app doesn't start on login, check the logs:
- `cat /tmp/noted-app.out.log`
- `cat /tmp/noted-app.err.log`
- Manually reload: `launchctl load ~/Library/LaunchAgents/com.$(whoami).notedapp.plist`

#### **2. Sudo Bypass issues**
If Nginx fails to restart because of permissions:
- Ensure `/etc/sudoers.d/noted-app-$(whoami)` exists and has `440` permissions.
- Run `./disable_sudo_bypass.sh` and then re-run `./setup_script.sh`.

---

### **Windows Specific**

#### **1. "Scripts are disabled on this system"**
PowerShell blocks scripts by default for security.
- **Fix:** Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in an Admin PowerShell window.

#### **2. Nginx "Connection Refused"**
- Ensure you ran the script as **Administrator**.
- Check if Nginx is running in Task Manager.
- Check the config: `C:\tools\nginx\conf\servers\notes-app.conf` should exist.

#### **3. Port 80 Conflicts**
If another service (like IIS or Skype) is using port 80, Nginx will fail to start.
- **Fix:** Stop the conflicting service or change the `listen 80;` line in the Nginx config to another port (e.g., `8080`).

---

## Data & Project Structure

### Local Database
Your data is stored in `backend/data/noted.db`. This file is excluded from Git to keep your notes private.

### Directory Overview
| Path | Description |
|---|---|
| `backend/` | Express server and SQLite database. |
| `frontend/` | React source code and Vite configuration. |
| `*.sh` | macOS automation scripts. |
| `*.ps1` | Windows automation scripts. |
