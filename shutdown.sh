#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Shutting down Noted Project...${NC}"

# 1. Stop Nginx Service
echo -e "${YELLOW}⏳ Stopping Nginx background service...${NC}"
sudo brew services stop nginx

# 2. Terminate Node.js processes (Vite & Express)
echo -e "${YELLOW}⏳ Killing Frontend (5173) and Backend (3001) processes...${NC}"
FE_PID=$(lsof -t -i:5173)
BE_PID=$(lsof -t -i:3001)

[ -n "$FE_PID" ] && kill -9 $FE_PID && echo -e "${RED}• Frontend stopped.${NC}"
[ -n "$BE_PID" ] && kill -9 $BE_PID && echo -e "${RED}• Backend stopped.${NC}"

# 3. Clean up SSL Certificates
# We remove these to ensure a fresh, secure state for the next setup run.
if [ -d "certs" ]; then
    echo -e "${YELLOW}🧹 Removing local SSL certificates...${NC}"
    rm -rf certs
    echo -e "${RED}• Certs directory cleared.${NC}"
fi

echo -e "${BLUE}🔍 Final Service Status:${NC}"
brew services list | grep nginx

echo -e "${GREEN}✔ Shutdown and cleanup complete.${NC}"