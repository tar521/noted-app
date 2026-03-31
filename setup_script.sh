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

# 1. Dependency Check
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing/Updating system dependencies...${NC}"
brew update
brew install node nginx 2>/dev/null || brew upgrade node nginx

# 2. Nginx Config Setup
NGINX_CONF_DIR=$(brew --prefix)/etc/nginx
NGINX_MAIN_CONF="$NGINX_CONF_DIR/nginx.conf"
NGINX_SERVERS_DIR="$NGINX_CONF_DIR/servers"
mkdir -p "$NGINX_SERVERS_DIR"

# Patch main nginx.conf if needed
if ! grep -q "include servers/\*;" "$NGINX_MAIN_CONF"; then
    echo -e "${YELLOW}⚠️  Linking 'servers' directory...${NC}"
    sed -i '' '/http {/a \
    include servers/*;
    ' "$NGINX_MAIN_CONF"
fi

# Create the HTTP Proxy Config
echo -e "${BLUE}🔧 Configuring HTTP proxy for 'notes-app'...${NC}"
cat <<EOF > "$NGINX_SERVERS_DIR/notes-app.conf"
server {
    listen 80;
    server_name notes-app;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 3. Host Alias
if ! grep -q "notes-app" /etc/hosts; then
    echo -e "${BLUE}📝 Adding 'notes-app' to /etc/hosts...${NC}"
    echo "127.0.0.1 notes-app" | sudo tee -a /etc/hosts > /dev/null
    sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
fi

# 4. Restart Nginx
echo -e "${BLUE}🔌 Restarting Nginx...${NC}"
sudo brew services restart nginx

# 5. Project Install
echo -e "${BLUE}📂 Installing NPM dependencies...${NC}"
npm install && (cd backend && npm install) && (cd frontend && npm install)

# 6. Create & Register Launch Agent (Auto-start)
LABEL="com.$(whoami).notedapp"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

echo -e "${BLUE}🚀 Registering Launch Agent for auto-start...${NC}"

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which npm)</string>
        <string>run</string>
        <string>dev</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>

# Load the new agent
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo -e "${GREEN}✨ SETUP COMPLETE!${NC}"
echo -e "Access your app at: ${BLUE}http://notes-app${NC}"
