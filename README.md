# Noted 📓

A personal notes and todo tracker. Dark, minimal, fast. Built with React + Vite (frontend) and Express + SQLite (backend).

---

## Setup

### Prerequisites

- Node.js 18+
- npm
- Homebrew (Required for Nginx handling on macOS)

### 1. Install Dependencies

Run this command from the root directory to install all necessary packages for the root, backend, and frontend:

```bash
npm install && (cd backend && npm install) && (cd frontend && npm install)
```

### 2. Automated Local Domain & Startup Setup

To use `http://notes-app` instead of IP addresses and ports, run the setup script. This script configures Nginx, maps your local hosts file, and registers the app to start automatically when you log in:

```bash
chmod +x setup_script.sh
./setup_script.sh
```

---

## Running the App

### Automatic Mode

Once `setup_script.sh` has been run once, the app is registered as a macOS Launch Agent. It will start in the background every time you start your laptop and log in.

### Manual Control Scripts

| Script | Description |
|---|---|
| `./setup_script.sh` | Resets the environment, refreshes Nginx, and ensures the app is running. |
| `./shutdown.sh` | Stops the app processes for the current session but leaves auto-start enabled for your next boot. |
| `./hard_shutdown.sh` | Stops the app and unregisters it from startup. Use this if you want to fully disable the background services. |

Access the app at: **http://notes-app**

---

## Debugging & Troubleshooting

If you encounter connection issues, check these common fixes:

### 1. "This site can't be reached" (NXDOMAIN)

If your browser cannot find `notes-app`, it might be using DNS-over-HTTPS, which ignores local system settings.

- **Fix:** Go to Browser Settings > System > Disable "Use DNS-over-HTTPS" or set it to "System" provider.
- **Verify:** Run `ping notes-app` in your terminal to ensure it resolves to `127.0.0.1`.

### 2. "Blocked request. This host is not allowed."

This is a Vite security feature triggered when using a custom domain.

- **Fix:** Ensure `frontend/vite.config.js` contains the following:

```js
server: {
  allowedHosts: ['notes-app', 'localhost']
}
```

### 3. Connection Refused / Nginx Errors

If Nginx isn't routing traffic properly:

- Check Nginx status: `sudo brew services list`
- Test config: `sudo nginx -t`
- Check logs: `tail -n 20 $(brew --prefix)/var/log/nginx/error.log`

---

## Data & Project Structure

### Local Database

Your data is stored in `backend/data/noted.db`.

> **Note:** This file is excluded from Git via `.gitignore` to keep your personal notes private and prevent binary merge conflicts.

### Directory Overview

| Path | Description |
|---|---|
| `backend/` | Express server, SQLite database, and API routes. |
| `frontend/` | React source code and Vite configuration. |
| `setup_script.sh` | The main entry point for environment configuration. |