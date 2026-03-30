#!/bin/bash

# --- Colors ---
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Shutting down Noted Project...${NC}"

# 1. Stop Nginx
sudo brew services stop nginx

# 2. Kill Node processes
FE_PID=$(lsof -t -i:5173)
BE_PID=$(lsof -t -i:3001)

[ -n "$FE_PID" ] && kill -9 $FE_PID && echo -e "${RED}• Frontend stopped.${NC}"
[ -n "$BE_PID" ] && kill -9 $BE_PID && echo -e "${RED}• Backend stopped.${NC}"

echo -e "${GREEN}✔ Shutdown complete.${NC}"