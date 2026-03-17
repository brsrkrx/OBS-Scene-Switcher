# 🎥 OBS Scene Switcher

**Automatic OBS scene switching triggered by tips from Chaturbate and Joystick.tv**

Transform your cam shows with dynamic, tip-activated scene transitions! Set different OBS scenes for different tip amounts and let your viewers control what they see.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](#)

---

## 📸 Screenshots

<a href="Supplement files/screenshots/editor-config.png"><img src="Supplement files/screenshots/editor-config.png" width="400" alt="Configuration editor"></a>
<a href="Supplement files/screenshots/editor-theme.png"><img src="Supplement files/screenshots/editor-theme.png" width="400" alt="Theme editor"></a>

---

## ✨ Features

- 🎬 **Automatic Scene Switching** - Scenes change based on tip amounts
- 🎨 **Beautiful Overlays** - Customizable tip notifications with animations
- ⏳ **Scene Switch Progress Bar** - A shrinking countdown bar appears at the bottom of the tip popup during the scene switch delay
- 🎯 **Multiple Platform Support** - Works with Chaturbate, Joystick.tv and Stripchat simultaneously
- ⚡ **Real-time Response** - Sub-second latency for instant scene changes (except for Stripchat due to missing API)
- 🎨 **Theme Editor** - Visual customization - no coding required
- 🔄 **Auto-Install** - WebSocket library installs automatically
- 📱 **Easy Setup** - Visual configuration editor
- 🛡️ **Deduplication** - Prevents duplicate scene switches
- 🔄 **Auto-Update** - Detects new versions at startup and offers to download and apply the update automatically
- 🌐 **Cross-Platform** - Works on Windows, macOS, and Linux (Linux not tested)

---

## 🎯 How It Works

```
Viewer Tips → Platform API → Scene Switcher → OBS → Scene Change!
   100 tokens      Real-time      Matches rules    Switches    Show changes
```

**Example:**
1. Viewer tips 100 tokens
2. Server detects tip instantly
3. Checks your rules: "100 tokens = Scene 2"
4. Sends command to OBS
5. Scene switches automatically
6. Optional: Shows custom overlay

**All in under 500ms!** ⚡

---

## 🚀 Quick Start

### **Prerequisites**

- [Node.js](https://nodejs.org/) (v14 or higher) - Click Get Node.js, then download the installer for your OS
- [OBS Studio](https://obsproject.com/) (latest version)
- Active streamer account on [Chaturbate](https://chaturbate.com/) and/or [Joystick.tv](https://joystick.tv/) and/or [Stripchat](https://stripchat.com/)

### **Installation**

1. **Download and unpack**
   - Download the zip file
   - Unpack it and place the folder in your desired location

1. **Configure your platforms:**
   - Open `oss_editor.html` in your browser
   - Go to "Server Setup" tab
   - Select platform(s) - (Chaturbate and/or Joystick.tv and/or Stripchat)
   - Follow the guide(s)
   - Click "Download config.json"
   - Place `config.json` you just downloaded in the project folder. NEVER SHARE your config.json file. If others get that info, you need to delete the API URL for Chaturbate and delete the bot in Joystick.tv and make new ones.  

2. **Run the server:**
   
   **Windows:**
   ```bash
   # Double-click START_SERVER_WINDOWS.bat
   # OR run this in a command prompt or PowerShell:
   node oss_server.js
   ```
   
   **Mac/Linux:**
   ```bash
   # Double-click START_SERVER_MAC.command (Mac only)
   # OR run this in Terminal:
   node oss_server.js
   ```
   
   **If a newer version is available:** The server will offer to download and apply the update automatically. Press `Y` to update (the server exits so you can restart fresh) or `n` to skip and continue.

   **If using Joystick.tv:** The server will auto-detect if WebSocket library is missing and offer to install it. Just press Y!

3. **Add to OBS:**
   - Add Browser Source
   - Select `oss_overlay.html` as local file
   - Or drag it to the sources list
   - Set dimensions: 1920x1080
   - Set Page permissions to "Advanced access to OBS..." <- Very important!

4. **Configure scenes:**
   - Open `oss_editor.html`
   - Go to "Configuration" tab
   - Set up tip amounts and corresponding scenes
   - Click "Apply Changes to OBS"

**Done!** Tips will now trigger automatic scene switches! 🎉

---

## 📖 Documentation

### **Complete Guide:**

- 📘 [Configuration Guide](Supplement%20files/CONFIG_GUIDE.md) - Everything about config.json

### **Platform Setup:**

#### **Chaturbate Setup:**

1. Get your Events API token:
   - Visit: https://chaturbate.com/accounts/authtoken/
   - Token name: `Events API` (or anything you like)
   - Scopes: Select **Events API**
   - Click "Generate Auth Token"
   - Copy the **Token URL**

2. In the editor:
   - Enable Chaturbate
   - Paste your token URL
   - Save configuration

#### **Joystick.tv Setup:**

1. Create a bot application:
   - Visit: https://joystick.tv/applications/new
   - Name: `OBS Scene Switcher`
   - Description: `Automatic scene switching`
   - OAuth URL: `http://localhost:3000/callback`
   - Permissions: ✅ **ReceiveStreamEvents** (required!)
   - Create bot and copy Client ID & Secret

2. Install bot on your channel:
   - Go to: https://joystick.tv/applications
   - Find your bot → Click Install
   - Authorize permissions

3. In the editor:
   - Enable Joystick.tv
   - Enter Client ID and Client Secret
   - Save configuration

---

## ⚙️ Configuration

### **config.json Structure:**

```json
{
  "platforms": {
    "chaturbate": {
      "enabled": true,
      "username": "your_username",
      "token": "your_events_api_token"
    },
    "joystick": {
      "enabled": true,
      "clientId": "your_client_id",
      "clientSecret": "your_client_secret"
    }
  },
  "server": {
    "port": 3000
  }
}
```

**Never commit config.json to Git!** It contains your credentials.

---

## 🎨 Customization

### **Visual Theme Editor:**

1. Open `oss_editor.html` in browser
2. Go to "Theme" tab
3. Customize colors, fonts, animations
4. See live preview
5. Click "Apply changes to OBS"

**No coding required!**

---

## 🐛 Troubleshooting

### **Server won't start:**

**Error:** `config.json file not found`
- **Fix:** Download config.json from the editor and place it in the project folder

**Error:** `Cannot find module 'ws'`
- **Fix:** The server should auto-install. If not, run: `npm install ws`

**Error:** `npm not found`
- **Fix:** Install Node.js from https://nodejs.org/

### **Tips not triggering scenes:**

**Chaturbate:**
- ✅ Check token is correct in config.json
- ✅ Verify Events API scope is enabled
- ✅ Check console for connection messages

**Joystick.tv:**
- ✅ Verify bot is installed on your channel
- ✅ Check Client ID and Secret are correct
- ✅ Ensure ReceiveStreamEvents permission is enabled

### **OBS not switching:**

- ✅ Check overlay permissions: "Advanced access to OBS"
- ✅ Verify scene names match exactly (case-sensitive!)
- ✅ Open browser console (F12) for errors

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### **Ideas for Contributions:**

- 🌐 Additional platform support (Twitch, MyFreeCams, etc.)
- 🎨 New overlay themes
- 🔊 Sound effects for tips
- 🎯 Scene tip collections to switch between

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with help from [Claude](https://claude.ai/) (Anthropic)
- Inspired by the cam creator community
- Thanks to early testers and contributors!

---

## 📬 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/brsrkrx/OBS-Scene-Switcher/issues)

---

**Made with ❤️ for the cam creator community**

*Happy streaming! 🎥✨*
