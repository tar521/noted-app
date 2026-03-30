#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

LABEL="com.$(whoami).notedapp"

echo -e "${BLUE}🛑 Temporarily stopping Noted Project...${NC}"

# 1. Stop the Launch Agent without unloading it
# This kills the processes but keeps the 'on-boot' instruction active.
launchctl stop $LABEL 2>/dev/null

# 2. Stop Nginx (Standard Homebrew stop)
sudo brew services stop nginx

# 3. Cleanup any orphaned Node processes
FE_PID=$(lsof -t -i:5173)
BE_PID=$(lsof -t -i:3001)
[ -n "$FE_PID" ] && kill -9 $FE_PID
[ -n "$BE_PID" ] && kill -9 $BE_PID

echo -e "${RED}✔ App stopped. It will still start automatically on next login.${NC}"