#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

LABEL="com.$(whoami).notedapp"

echo -e "${BLUE}🛑 Temporarily stopping Noted Project...${NC}"

# 1. Stop the Launch Agent service (without unloading it)
# This will kill the processes but keep the agent ready for next login.
launchctl kill SIGTERM "gui/$(id -u)/$LABEL" 2>/dev/null

# 2. Stop Nginx
sudo brew services stop nginx

# 3. Cleanup any orphaned Node processes
echo -e "${BLUE}🧹 Cleaning up orphaned processes...${NC}"
for port in 5173 3001; do
    PID=$(lsof -t -i:$port)
    if [ -n "$PID" ]; then
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
    fi
done

echo -e "${RED}✔ App stopped. It will still start automatically on next login.${NC}"