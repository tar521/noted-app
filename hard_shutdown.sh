#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

LABEL="com.$(whoami).notedapp"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

echo -e "${RED}🧨 Performing HARD SHUTDOWN...${NC}"

# 1. Unload and Delete the Launch Agent
if [ -f "$PLIST_PATH" ]; then
    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm "$PLIST_PATH"
    echo -e "${YELLOW}• Launch Agent removed (Auto-start disabled).${NC}"
fi

# 2. Fully stop Nginx service
sudo brew services stop nginx

# 3. Kill all project-related processes
FE_PID=$(lsof -t -i:5173)
BE_PID=$(lsof -t -i:3001)
[ -n "$FE_PID" ] && kill -9 $FE_PID
[ -n "$BE_PID" ] && kill -9 $BE_PID

echo -e "${RED}✔ Project fully unregistered and stopped.${NC}"