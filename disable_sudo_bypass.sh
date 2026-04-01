#!/bin/bash
# --- Colors ---
YELLOW='\033[0;33m'
NC='\033[0m'

SUDOERS_FILE="/etc/sudoers.d/noted-app-$(whoami)"

if [ -f "$SUDOERS_FILE" ]; then
    sudo rm "$SUDOERS_FILE"
    echo -e "${YELLOW}✔ Passwordless sudo has been disabled for $(whoami).${NC}"
else
    echo -e "Sudo bypass was not active."
fi
