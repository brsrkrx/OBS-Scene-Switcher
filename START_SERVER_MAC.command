#!/bin/bash

# OBS Scene Switcher Server Launcher
# Automatically detects script location

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo "  OBS Scene Switcher Server"
echo "================================================"
echo ""
echo "Starting server from: $SCRIPT_DIR"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if server file exists
if [ ! -f "$SCRIPT_DIR/oss_server.js" ]; then
    echo "❌ Error: oss_server.js not found in $SCRIPT_DIR"
    exit 1
fi

# Start the server
node "$SCRIPT_DIR/oss_server.js"
