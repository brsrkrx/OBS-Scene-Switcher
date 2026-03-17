#!/bin/bash
# ================================================================
# OBS Scene Switcher Server Launcher (macOS)
# ================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo "  OBS Scene Switcher Server"
echo "================================================"
echo ""
echo "Starting server from: $SCRIPT_DIR"
echo ""

# Check if Node.js is installed
if ! command -v node &>/dev/null; then
    echo "Node.js is not installed. This software will not work without it."
    echo ""
    echo "Please download and install Node.js from https://nodejs.org/"
    echo "Then run this script again."
    echo ""
    exit 1
fi

# Check if server file exists
if [ ! -f "$SCRIPT_DIR/oss_server.js" ]; then
    echo "[ERROR] oss_server.js not found in $SCRIPT_DIR"
    exit 1
fi

# Start the server
node "$SCRIPT_DIR/oss_server.js"

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "[ERROR] Server exited with error code $EXIT_CODE"
    echo ""
    read -rp "Press Enter to close..."
fi
