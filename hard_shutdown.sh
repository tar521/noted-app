#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

LABEL="com.$(whoami).notedapp"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

echo -e "${RED}🧨 Performing HARD SHUTDOWN...${NC}"

# 1. Fully unregister and remove the Launch Agent
if [ -f "$PLIST_PATH" ]; then
    launchctl bootout "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null
    rm "$PLIST_PATH"
    echo -e "${YELLOW}• Launch Agent removed (Auto-start disabled).${NC}"
fi

# 2. Fully stop Nginx
sudo brew services stop nginx

# 3. Cleanup all project-related processes
echo -e "${BLUE}🧹 Cleaning up processes...${NC}"
for port in 5173 3001; do
    PID=$(lsof -t -i:$port)
    if [ -n "$PID" ]; then
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
    fi
done

# 4. Remove Sudo Bypass
SUDOERS_FILE="/etc/sudoers.d/noted-app-$(whoami)"
if [ -f "$SUDOERS_FILE" ]; then
    sudo rm "$SUDOERS_FILE"
    echo -e "${YELLOW}• Passwordless sudo disabled.${NC}"
fi

echo -e "${RED}✔ Project fully unregistered and stopped.${NC}"