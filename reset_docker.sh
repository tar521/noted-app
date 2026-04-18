#!/bin/bash

echo "🚀 Starting deep Docker cleanup..."

# 1. Stop and remove containers, networks, and images defined in the compose file
# --rmi all removes all images used by any service
# -v removes named volumes (caution: this clears the container's internal state, 
# but your mapped ./backend/data folder on the host will remain safe)
docker compose down --rmi all -v --remove-orphans

# 2. Force remove any leftover 'noted' images just in case
docker rmi noted-backend noted-frontend 2>/dev/null

# 3. Clean up dangling images (the ones marked <none>)
docker image prune -f

echo "✅ Cleanup complete."
echo "➡️ To restart, run: docker compose up -d --build"
