# Configuration System Guide

## 🎯 How Configuration Works

The OBS Scene Switcher uses a **config.json** file to store your platform credentials and settings. This makes setup super easy - no JavaScript editing required!

---

## 📋 Quick Start

### **3 Simple Steps:**

1. **Generate your config:**
   - Open `oss_editor.html` in your browser
   - Go to "Server Setup" tab
   - Select platform(s) and enter credentials
   - Click "Download config.json"

2. **Place the file:**
   - Put `config.json` in the same folder as `oss_server.js`

3. **Run the server:**
   - Double-click `START_SERVER_WINDOWS.bat` (Windows) or `START_SERVER_MAC.command` (Mac)
   - Or run: `node oss_server.js`

**That's it!** The server automatically reads your configuration on startup.

---

## 📁 File Structure

Your project folder should look like this:

```
OBS-Scene-Switcher/
├── config.json               ← Your configuration (download from editor)
├── oss_server.js             ← The server (uses config.json)
├── oss_overlay.html          ← OBS browser source
├── oss_editor.html           ← Settings editor
├── START_SERVER_WINDOWS.bat  ← Windows launcher (optional)
├── START_SERVER_MAC.command  ← Mac launcher (optional)
└── node_modules/             ← Created by npm install ws (if using Joystick)
    └── ws/
```

---

## 🔧 config.json Format

The downloaded config.json looks like this:

```json
{
  "platforms": {
    "chaturbate": {
      "enabled": true,
      "username": "your_username",
      "token": "abc123..."
    },
    "joystick": {
      "enabled": false,
      "clientId": "your_client_id_here",
      "clientSecret": "your_client_secret_here"
    }
  },
  "server": {
    "port": 3000
  }
}
```

### **Fields Explained:**

**Chaturbate:**
- `enabled`: `true` to use Chaturbate, `false` to disable
- `username`: Your Chaturbate username
- `token`: Your Events API token

**Joystick.tv:**
- `enabled`: `true` to use Joystick.tv, `false` to disable
- `clientId`: Your bot application Client ID
- `clientSecret`: Your bot application Client Secret

**Server:**
- `port`: HTTP server port (default: 3000)

---

## ✅ What Happens When You Run the Server

### **Step 1: Config Check**
```
📄 Loading configuration from config.json...
```

The server looks for `config.json` in the same folder.

### **If config.json is missing:**
```
❌ ERROR: config.json file not found!

INSTRUCTIONS:
1. Open oss_editor.html in your browser
2. Go to the "Server Setup" tab
3. Select your platform(s) (Chaturbate and/or Joystick.tv)
4. Enter your credentials
5. Click "Download config.json"
6. Place the downloaded config.json file in this folder:
   C:\Users\YourName\Documents\OBS-Scene-Switcher
7. Run this server again
```

**The server exits with clear instructions!**

### **If config.json is invalid:**
```
❌ ERROR: Failed to load config.json

Error details: Unexpected token } in JSON at position 123

The config.json file may be corrupted or invalid.
Please download a new config.json from the editor:

1. Open oss_editor.html in your browser
2. Go to "Server Setup" tab
3. Configure your settings
4. Click "Download config.json"
```

### **If config.json is valid:**
```
✅ Configuration loaded successfully
🚀 Starting OBS Scene Switcher Server...

Platform Status:
   Chaturbate: ✅ ENABLED
   Joystick.tv: ⭕ DISABLED

✅ HTTP Server running at http://localhost:3000
```

**Server starts successfully!**

---

## 🔄 Updating Your Configuration

### **To change platforms or credentials:**

1. **Open the editor:**
   - Open `oss_editor.html` in your browser

2. **Make changes:**
   - Go to "Server Setup" tab
   - Enable/disable platforms
   - Update credentials

3. **Download new config:**
   - Click "Download config.json"
   - Replace the old config.json

4. **Restart server:**
   - Stop the server (Ctrl+C)
   - Start it again

**The new settings take effect immediately!**

---

## 🎯 Common Scenarios

### **Scenario 1: Using Only Chaturbate**

**Your config.json:**
```json
{
  "platforms": {
    "chaturbate": {
      "enabled": true,
      "username": "mychaturbateusername",
      "token": "abc123def456..."
    },
    "joystick": {
      "enabled": false,
      "clientId": "your_client_id_here",
      "clientSecret": "your_client_secret_here"
    }
  },
  "server": {
    "port": 3000
  }
}
```

**What happens:**
- ✅ Chaturbate monitoring active
- ⭕ Joystick.tv disabled
- ❌ No need to install `ws` library

---

### **Scenario 2: Using Only Joystick.tv**

**Your config.json:**
```json
{
  "platforms": {
    "chaturbate": {
      "enabled": false,
      "username": "your_username_here",
      "token": "your_token_here"
    },
    "joystick": {
      "enabled": true,
      "clientId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "clientSecret": "xyz123abc456def789"
    }
  },
  "server": {
    "port": 3000
  }
}
```

**What happens:**
- ⭕ Chaturbate disabled
- ✅ Joystick.tv monitoring active
- ✅ Requires `npm install ws`

---

### **Scenario 3: Using Both Platforms**

**Your config.json:**
```json
{
  "platforms": {
    "chaturbate": {
      "enabled": true,
      "username": "mychaturbateusername",
      "token": "abc123def456..."
    },
    "joystick": {
      "enabled": true,
      "clientId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "clientSecret": "xyz123abc456def789"
    }
  },
  "server": {
    "port": 3000
  }
}
```

**What happens:**
- ✅ Chaturbate monitoring active
- ✅ Joystick.tv monitoring active
- ✅ Requires `npm install ws`
- ✅ Tips from both platforms trigger scenes!

---

## 🛡️ Security Notes

### **Keep config.json Private!**

Your `config.json` contains sensitive credentials:
- Chaturbate API tokens
- Joystick.tv client secrets

**Never:**
- ❌ Share config.json publicly
- ❌ Commit it to GitHub
- ❌ Post it in support requests

**If credentials leak:**
1. Regenerate your Chaturbate token
2. Regenerate your Joystick.tv bot credentials
3. Download a new config.json with the new credentials

---

## 🔧 Manual Editing (Advanced)

You can manually edit `config.json` in a text editor if needed.

**Rules:**
1. Keep valid JSON format
2. Use `true`/`false` (not `"true"`/`"false"`) for enabled fields
3. Use strings for credentials: `"username"`, not `username`
4. Keep proper indentation (optional but nice)

**After editing:**
- Restart the server for changes to take effect

---

## ❓ Troubleshooting

### **Error: "config.json file not found"**

**Solution:**
1. Make sure config.json is in the same folder as oss_server.js
2. Check the folder path shown in the error message
3. Download a new config.json from the editor

### **Error: "Unexpected token in JSON"**

**Solution:**
The config.json file is corrupted. Download a new one from the editor.

### **Error: "Cannot find module 'ws'"**

**Solution:**
You enabled Joystick.tv but haven't installed the ws library.
Run: `npm install ws` in the project folder.

### **Editor shows "Server Running — No Overlay"**

**Solution:**
The server is running but the OBS browser source isn't connected to it.
1. In OBS, right-click the browser source → **Refresh cache of current page**
2. Make sure the browser source is on an active scene (OBS pauses inactive sources)
3. Verify Page Permissions is set to "Advanced access to OBS"

---

### **Server starts but no tips detected**

**Solution:**
1. Check that credentials in config.json are correct
2. For Chaturbate: Verify username and token
3. For Joystick.tv: Verify bot is installed on your channel
4. Check console for connection messages

---

## 🎉 Benefits of config.json System

✅ **No code editing** - Just download from editor  
✅ **Validated automatically** - Editor ensures correct format  
✅ **Clear error messages** - Server tells you exactly what's wrong  
✅ **Easy to update** - Download new config anytime  
✅ **Portable** - Copy config.json to any computer  
✅ **Safe** - No risk of breaking JavaScript syntax  

---

## 💡 Pro Tips

### **Tip 1: Keep a Backup**
Save a copy of your config.json somewhere safe. If you lose it, you'll need to re-enter all credentials.

### **Tip 2: Use the Editor**
Always generate config.json through the editor rather than manually creating it. The editor ensures proper format and validates credentials.

### **Tip 3: Test After Changes**
After updating config.json, run the server and check the console output to ensure it loaded successfully.

### **Tip 4: Version Control**
If using Git, add config.json to .gitignore:
```
config.json
node_modules/
*.log
```

This prevents accidentally committing your credentials.

---

## ✅ Quick Checklist

**For first-time setup:**
- [ ] Open oss_editor.html
- [ ] Configure platform(s) in Server Setup tab
- [ ] Download config.json
- [ ] Place config.json in project folder
- [ ] If using Joystick.tv: run `npm install ws`
- [ ] Run oss_server.js
- [ ] Verify "Configuration loaded successfully" message

**For updating settings:**
- [ ] Open oss_editor.html  
- [ ] Make changes in Server Setup tab
- [ ] Download new config.json
- [ ] Replace old config.json
- [ ] Restart server

---

**The config.json system makes setup effortless!** 🚀
