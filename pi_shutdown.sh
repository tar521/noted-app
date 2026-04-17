#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_NAME="noted-app"

echo -e "${BLUE}🛑 Temporarily stopping Noted Project...${NC}"

# 1. Stop the systemd service (without disabling it)
# This will stop the service but keep it enabled for next boot.
sudo systemctl stop "$SERVICE_NAME"

# 2. Stop Nginx
sudo systemctl stop nginx

# 3. Cleanup any orphaned Node processes
echo -e "${BLUE}🧹 Cleaning up orphaned processes...${NC}"
for port in 5173 3001; do
    PID=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$PID" ]; then
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
    fi
done

echo -e "${RED}✔ App stopped. It will still start automatically on next boot.${NC}"