#!/bin/bash

# --- Colors ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT=$(pwd)

# 0. Sudo Bypass Setup
SUDOERS_FILE="/etc/sudoers.d/noted-app-$(whoami)"
if [ ! -f "$SUDOERS_FILE" ]; then
    echo -e "${BLUE}🔐 Enabling passwordless sudo for current user...${NC}"
    echo "$(whoami) ALL=(ALL) NOPASSWD: ALL" | sudo tee "$SUDOERS_FILE" > /dev/null
    sudo chmod 440 "$SUDOERS_FILE"
fi

echo -e "${BLUE}🚀 Starting Noted Project (HTTP Mode)...${NC}"

# 1. Dependency Check & Installation
echo -e "${BLUE}📦 Installing/Updating system dependencies...${NC}"
sudo apt-get update
sudo apt-get install -y curl nginx

# Install Node.js via NodeSource (if not already installed)
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}📦 Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Nginx Config Setup
NGINX_CONF_DIR="/etc/nginx"
NGINX_SITES_AVAILABLE="$NGINX_CONF_DIR/sites-available"
NGINX_SITES_ENABLED="$NGINX_CONF_DIR/sites-enabled"

# Create the HTTP Proxy Config
echo -e "${BLUE}🔧 Configuring HTTP proxy for 'notes-app'...${NC}"
sudo bash -c "cat <<EOF > $NGINX_SITES_AVAILABLE/notes-app.conf
server {
    listen 80;
    server_name notes-app;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF"

# Enable the site
sudo ln -sf "$NGINX_SITES_AVAILABLE/notes-app.conf" "$NGINX_SITES_ENABLED/notes-app.conf"

# Remove default site if it exists
sudo rm -f "$NGINX_SITES_ENABLED/default"

# 3. Host Alias
if ! grep -q "notes-app" /etc/hosts; then
    echo -e "${BLUE}📝 Adding 'notes-app' to /etc/hosts...${NC}"
    echo "127.0.0.1 notes-app" | sudo tee -a /etc/hosts > /dev/null
fi

# 4. Restart Nginx
echo -e "${BLUE}🔌 Restarting Nginx...${NC}"
sudo systemctl restart nginx
sudo systemctl enable nginx

# 5. Project Install
echo -e "${BLUE}📂 Installing NPM dependencies...${NC}"
npm install && (cd backend && npm install) && (cd frontend && npm install)

# 6. Create & Register systemd service (Auto-start)
SERVICE_NAME="noted-app"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

echo -e "${BLUE}🚀 Creating systemd service for auto-start...${NC}"

sudo bash -c "cat <<EOF > $SERVICE_FILE
[Unit]
Description=Noted App Development Server
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$PROJECT_ROOT
Environment=\"PATH=$(dirname $(which node)):/usr/local/bin:/usr/bin:/bin\"
ExecStart=$(which npm) run dev
Restart=always
RestartSec=10
StandardOutput=append:/tmp/noted-app.out
StandardError=append:/tmp/noted-app.err

[Install]
WantedBy=multi-user.target
EOF"

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo -e "${GREEN}✨ SETUP COMPLETE!${NC}"
echo -e "Access your app at: ${BLUE}http://notes-app${NC}"
echo -e "Check service status: ${YELLOW}sudo systemctl status noted-app${NC}"