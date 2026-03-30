#!/bin/bash

# --- Colors ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT=$(pwd)

echo -e "${BLUE}🚀 Starting Noted Project & Secure Nginx Setup...${NC}"

# 1. Dependency Check (Brew, Node, Nginx, mkcert)
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing/Updating system dependencies...${NC}"
brew update
brew install node nginx mkcert 2>/dev/null || brew upgrade node nginx mkcert

# 2. SSL Certificate Generation
echo -e "${BLUE}🔐 Setting up Local SSL with mkcert...${NC}"
mkcert -install > /dev/null
mkdir -p "$PROJECT_ROOT/certs"
cd "$PROJECT_ROOT/certs"
# Only generate if they don't exist
if [ ! -f "notes-app.pem" ]; then
    mkcert notes-app > /dev/null
    echo -e "${GREEN}✅ New certificates generated.${NC}"
fi
cd "$PROJECT_ROOT"

# 3. Nginx Config Setup
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

# Create the HTTPS Proxy Config
echo -e "${BLUE}🔧 Configuring HTTPS proxy for 'notes-app'...${NC}"
cat <<EOF > "$NGINX_SERVERS_DIR/notes-app.conf"
server {
    listen 80;
    server_name notes-app;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name notes-app;

    ssl_certificate     $PROJECT_ROOT/certs/notes-app.pem;
    ssl_certificate_key $PROJECT_ROOT/certs/notes-app-key.pem;

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

# 4. Host Alias
if ! grep -q "notes-app" /etc/hosts; then
    echo -e "${BLUE}📝 Adding 'notes-app' to /etc/hosts...${NC}"
    echo "127.0.0.1 notes-app" | sudo tee -a /etc/hosts > /dev/null
    sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
fi

# 5. Restart Nginx
echo -e "${BLUE}🔌 Restarting Nginx...${NC}"
sudo brew services restart nginx

# 6. Project Install
echo -e "${BLUE}📂 Installing NPM dependencies...${NC}"
npm install && (cd backend && npm install) && (cd frontend && npm install)

echo -e "${GREEN}✨ SECURE SETUP COMPLETE!${NC}"
echo -e "Access your app at: ${BLUE}https://notes-app${NC}"

# 7. Run
npm run dev