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
    read -rp "Would you like to download and install it now? (requires admin privileges) [Y/N]: " INSTALL_CHOICE
    echo ""

    if [[ ! "$INSTALL_CHOICE" =~ ^[Yy]$ ]]; then
        echo "Installation skipped. Please install Node.js manually from https://nodejs.org/"
        echo ""
        exit 1
    fi

    # Fetch latest LTS version from nodejs.org
    echo "Looking up latest Node.js LTS version..."
    VERSION=$(curl -sf "https://nodejs.org/dist/index.json" | python3 -c "
import json, sys
versions = json.load(sys.stdin)
lts = [v for v in versions if v.get('lts')]
print(lts[0]['version'])
" 2>/dev/null)

    if [ -z "$VERSION" ]; then
        echo "[ERROR] Could not determine the latest Node.js version."
        echo "Please install Node.js manually from https://nodejs.org/"
        exit 1
    fi

    # Pick the correct .pkg for this architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        PKG_URL="https://nodejs.org/dist/$VERSION/node-$VERSION-arm64.pkg"
    else
        PKG_URL="https://nodejs.org/dist/$VERSION/node-$VERSION.pkg"
    fi

    PKG_FILE="/tmp/node_installer.pkg"

    echo "Downloading Node.js $VERSION..."
    if ! curl -# -o "$PKG_FILE" "$PKG_URL"; then
        echo ""
        echo "[ERROR] Download failed. Please install Node.js manually from https://nodejs.org/"
        exit 1
    fi

    echo ""
    echo "Installing Node.js... (your admin password will be required)"
    echo ""
    if ! sudo installer -pkg "$PKG_FILE" -target /; then
        echo ""
        echo "[ERROR] Installation failed. Please install Node.js manually from https://nodejs.org/"
        rm -f "$PKG_FILE"
        exit 1
    fi

    rm -f "$PKG_FILE"

    # Make sure the new install is on PATH for this session
    export PATH="/usr/local/bin:/usr/local/sbin:$PATH"

    if ! command -v node &>/dev/null; then
        echo ""
        echo "[ERROR] Node.js was installed but could not be found in PATH."
        echo "Please close this terminal, reopen it, and run this script again."
        exit 1
    fi

    echo ""
    echo "Node.js installed successfully!"
    echo ""
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
