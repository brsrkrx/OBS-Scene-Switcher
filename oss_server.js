// ============================================================
// OBS Scene Switcher Server
// ============================================================
// Supports Chaturbate, Joystick.tv, StripChat, and Twitch platforms
// Enable/disable platforms in configuration
// ============================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const CURRENT_VERSION = '1.1.2';
const GITHUB_REPO = 'brsrkrx/OBS-Scene-Switcher';

// ── Logging Setup ───────────────────────────────────────────
const logFile = path.join(__dirname, 'oss_server_debug.log');

const C = {
  reset:  '\x1b[0m',
  cb:     '\x1b[38;5;208m',  // orange  — Chaturbate
  js:     '\x1b[36m',        // teal    — Joystick.tv
  sc:     '\x1b[38;5;88m',   // maroon  — StripChat
  tw:     '\x1b[38;5;99m',   // purple  — Twitch
};

function colorize(message) {
  if (message.includes('\x1b[')) return message; // already colored (e.g. enter/leave)
  if (message.includes('[CHATURBATE]')) return C.cb + message + C.reset;
  if (message.includes('[JOYSTICK]'))   return C.js + message + C.reset;
  if (message.includes('[STRIPCHAT]'))  return C.sc + message + C.reset;
  if (message.includes('[TWITCH]'))     return C.tw + message + C.reset;
  return message;
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(colorize(message));
  try { fs.appendFileSync(logFile, logMessage + '\n'); } catch (err) {}
}

function elog(message) {          // level 2+: user enter/leave events
  if (LOG_LEVEL >= 2) log(message);
}

function vlog(message) {          // level 3: full debug
  if (LOG_LEVEL >= 3) log(message);
}

try {
  fs.writeFileSync(logFile, '═══════════════════════════════════════════════════════\n');
  fs.appendFileSync(logFile, `🚀 OBS Scene Switcher Server Starting\nTime: ${new Date().toISOString()}\n`);
  fs.appendFileSync(logFile, '═══════════════════════════════════════════════════════\n\n');
} catch (err) {
  console.log('Note: Could not create log file (non-critical)');
}

// ⚙️ LOAD CONFIGURATION FROM config.json
let CONFIG;
let LOG_LEVEL = 1; // 1 = tips only, 2 = tips + events, 3 = full debug
const configPath = path.join(__dirname, 'config.json');

try {
  log('📄 Loading configuration from config.json...');
  
  if (!fs.existsSync(configPath)) {
    console.error('\n❌ ERROR: config.json file not found!\n');
    console.error('INSTRUCTIONS:');
    console.error('1. Open oss_editor.html in your browser');
    console.error('2. Go to the "Server Setup" tab');
    console.error('3. Select your platform(s) (Chaturbate and/or Joystick.tv)');
    console.error('4. Follow the guide');
    console.error('5. Click "Download config.json"');
    console.error('6. Place the downloaded config.json file in this folder:');
    console.error('   ' + __dirname);
    console.error('7. Run this server again\n');
    process.exit(1);
  }
  
  const configData = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configData);
  
  // Convert JSON config to internal format
  CONFIG = {
    ENABLE_CHATURBATE: config.platforms.chaturbate.enabled,
    ENABLE_JOYSTICK: config.platforms.joystick.enabled,
    CB_USERNAME: config.platforms.chaturbate.username,
    CB_TOKEN: config.platforms.chaturbate.token,
    JOYSTICK_CLIENT_ID: config.platforms.joystick.clientId,
    JOYSTICK_CLIENT_SECRET: config.platforms.joystick.clientSecret,
    ENABLE_STRIPCHAT: config.platforms.stripchat?.enabled ?? false,
    SC_USERNAME: config.platforms.stripchat?.username || '',
    ENABLE_TWITCH: config.platforms.twitch?.enabled ?? false,
    TWITCH_CLIENT_ID: config.platforms.twitch?.clientId || '',
    TWITCH_ACCESS_TOKEN: config.platforms.twitch?.accessToken || '',
    TWITCH_CHANNEL: config.platforms.twitch?.channel || '',
    TWITCH_CLI_TEST: config.platforms.twitch?.cliTest ?? false,
    PORT: config.server.port || 3000,
    LOG_LEVEL_DEFAULT: Math.min(3, Math.max(1, parseInt(config.server.log_level) || 1))
  };
  
  log('✅ Configuration loaded successfully');

  // Load persisted overlay config/theme from previous run
  try {
    if (fs.existsSync(lastConfigPath)) {
      const combined = JSON.parse(fs.readFileSync(lastConfigPath, 'utf8'));
      if (combined.config) lastConfig = JSON.stringify(combined.config);
      if (combined.theme)  lastTheme  = JSON.stringify(combined.theme);
      if (lastConfig || lastTheme) log('✅ Loaded persisted overlay config/theme from last_applied_config.json');
    }
  } catch (_) {}

} catch (err) {
  console.error('\n❌ ERROR: Failed to load config.json\n');
  console.error('Error details: ' + err.message);
  console.error('\nThe config.json file may be corrupted or invalid.');
  console.error('Please download a new config.json from the editor:\n');
  console.error('1. Open oss_editor.html in your browser');
  console.error('2. Go to "Server Setup" tab');
  console.error('3. Configure your settings');
  console.error('4. Click "Download config.json"\n');
  process.exit(1);
}

// ── Check for Updates ───────────────────────────────────────
function checkForUpdates() {
  log('🔍 Checking for updates...');
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'OBS-Scene-Switcher' }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latest = (release.tag_name || '').replace(/^v/, '');
          if (!latest) { resolve({ isNewer: false }); return; }

          const toNum = v => v.split('.').map(Number);
          const [lMaj, lMin, lPat] = toNum(latest);
          const [cMaj, cMin, cPat] = toNum(CURRENT_VERSION);

          const isNewer =
            lMaj > cMaj ||
            (lMaj === cMaj && lMin > cMin) ||
            (lMaj === cMaj && lMin === cMin && lPat > cPat);

          if (isNewer) {
            log('');
            log('╔══════════════════════════════════════════════════════╗');
            log(`║  🆕 Update available: v${CURRENT_VERSION} → v${latest}`);
            log('╚══════════════════════════════════════════════════════╝');
            log('');
            resolve({ isNewer: true, latest });
          } else {
            log(`✅ OBS Scene Switcher is up to date (v${CURRENT_VERSION})`);
            resolve({ isNewer: false });
          }
        } catch (_) { resolve({ isNewer: false }); }
      });
    }).on('error', () => {
      vlog('⚠️  Could not check for updates (no internet or GitHub unreachable)');
      resolve({ isNewer: false });
    });
  });
}

// ── Download File (for auto-update) ─────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const tmpPath = destPath + '.tmp';

    function doGet(urlStr, hops) {
      if (hops > 5) { reject(new Error('Too many redirects')); return; }
      const mod = urlStr.startsWith('https') ? https : require('http');
      mod.get(urlStr, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location, hops + 1); return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`)); return;
        }
        const out = fs.createWriteStream(tmpPath);
        res.pipe(out);
        out.on('finish', () => {
          out.close(() => {
            fs.renameSync(tmpPath, destPath);
            if (destPath.endsWith('.command')) {
              try { fs.chmodSync(destPath, 0o755); } catch (_) {}
            }
            resolve();
          });
        });
        out.on('error', reject);
      }).on('error', reject);
    }

    doGet(url, 0);
  });
}

// ── Download and Apply Update ────────────────────────────────
async function downloadAndUpdate(latestVersion) {
  const files = [
    'oss_server.js',
    'oss_overlay.html',
    'oss_editor.html',
    'START_SERVER_WINDOWS.bat',
    'START_SERVER_MAC.command',
    'README.md'
  ];

  for (const file of files) {
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/v${latestVersion}/${file}`;
    const dest = path.join(__dirname, file);
    log(`   Downloading ${file}...`);
    await downloadFile(url, dest);
  }
}

// ── Check and Auto-Install WebSocket Library ───────────────
async function checkAndInstallWebSocket() {
  if (!CONFIG.ENABLE_JOYSTICK && !CONFIG.ENABLE_TWITCH) {
    return; // Only needed for Joystick and Twitch WebSocket
  }
  
  // Check if ws module exists
  try {
    require.resolve('ws');
    log('✅ WebSocket library (ws) found');
    return; // Already installed
  } catch (err) {
    // ws not found - offer to install
    console.log('\n⚠️  WebSocket library not found!');
    console.log('Joystick.tv and Twitch support require the "ws" library.');
    console.log('');
    
    // Check if npm is available
    try {
      execSync('npm --version', { stdio: 'ignore' });
    } catch (npmErr) {
      console.error('❌ ERROR: npm not found!');
      console.error('');
      console.error('To use Joystick.tv, you need to install Node.js with npm.');
      console.error('Download from: https://nodejs.org/');
      console.error('');
      console.error('After installing Node.js, run this server again.\n');
      process.exit(1);
    }
    
    // Prompt user to install
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('Install WebSocket library now? (Y/n): ', (answer) => {
        rl.close();
        
        const shouldInstall = !answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
        
        if (shouldInstall) {
          console.log('\n📦 Installing WebSocket library...');
          console.log('This may take a moment...\n');
          
          try {
            execSync('npm install ws', { 
              stdio: 'inherit',
              cwd: __dirname 
            });
            
            console.log('\n✅ WebSocket library installed successfully!');
            console.log('Continuing server startup...\n');
            resolve();
            
          } catch (installErr) {
            console.error('\n❌ ERROR: Failed to install WebSocket library');
            console.error('Please try installing manually:');
            console.error('  1. Open Terminal/Command Prompt');
            console.error('  2. Navigate to: ' + __dirname);
            console.error('  3. Run: npm install ws\n');
            process.exit(1);
          }
        } else {
          console.log('\n⚠️  Skipping installation.');
          console.log('Joystick.tv and Twitch support will be disabled.');
          console.log('To enable them later, install ws and restart the server.\n');
          CONFIG.ENABLE_JOYSTICK = false; // Disable Joystick since ws not available
          CONFIG.ENABLE_TWITCH = false;   // Disable Twitch since ws not available
          resolve();
        }
      });
    });
  }
}

// ============================================================

// ── Input Sanitization ──────────────────────────────────────

function sanitizeTipData(username, tokens, message) {
  return {
    username: String(username || 'Anonymous').slice(0, 100),
    tokens: Math.max(0, Math.min(parseInt(tokens) || 0, 1000000)),
    message: String(message || '').slice(0, 500)
  };
}

// ── Event Tracking (Deduplication) ─────────────────────────

let processedEventIds = new Set();
let latestEvents = [];

function cleanOldEventIds() {
  if (processedEventIds.size > 1000) {
    log('🧹 Clearing old event IDs (' + processedEventIds.size + ' tracked)');
    processedEventIds.clear();
  }
}

setInterval(cleanOldEventIds, 300000); // Every 5 minutes

// ── HTTP Server for OBS Overlay ────────────────────────────

let clients = [];
let themeClients = [];
let configClients = [];
let lastConfig = null;  // replayed to overlay on reconnect
let lastTheme = null;   // replayed to overlay on reconnect
const lastConfigPath = path.join(__dirname, 'last_applied_config.json'); // stores { config, theme }
let obsScenes = [];     // OBS scene list reported by overlay

// CORS headers stay open (*) so OBS browser source EventSource connections work.
// CSRF protection is enforced via server-side origin checks on POST endpoints.
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

// Only local file:// pages (origin: null) and localhost are allowed to call
// state-changing POST endpoints. This blocks CSRF from any other website.
const ALLOWED_POST_ORIGINS = new Set(['null', `http://localhost:${CONFIG.PORT || 3000}`, `http://127.0.0.1:${CONFIG.PORT || 3000}`]);

function isAllowedOrigin(req) {
  const origin = req.headers.origin || 'null';
  return ALLOWED_POST_ORIGINS.has(origin);
}

const server = http.createServer((req, res) => {

  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }
  
  // SSE endpoint for overlay
  if (req.url === '/events') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    clients.push(res);
    log('📱 Overlay connected (Total clients: ' + clients.length + ')');
    req.on('close', () => { clients = clients.filter(c => c !== res); log('📱 Overlay disconnected (Remaining: ' + clients.length + ')'); });
    return;
  }
  
  // Connection status endpoint (polled by editor)
  if (req.url === '/status' && req.method === 'GET') {
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ server: 'oss_server.js', overlayClients: clients.length }));
    return;
  }

  // SSE for theme updates
  if (req.url === '/theme-updates') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    themeClients.push(res);
    if (lastTheme) res.write('data: ' + lastTheme + '\n\n');
    req.on('close', () => { themeClients = themeClients.filter(c => c !== res); });
    return;
  }

  // SSE for config updates
  if (req.url === '/config-updates') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    configClients.push(res);
    if (lastConfig) {
      const saved = JSON.parse(lastConfig);
      // If menu was enabled, restore it after the interval delay (not immediately)
      const replayConfig = { ...saved, menuAutoStart: saved.MENU_DISPLAY_ENABLED === true ? 'now' : false };
      res.write('data: ' + JSON.stringify(replayConfig) + '\n\n');
    }
    req.on('close', () => { configClients = configClients.filter(c => c !== res); });
    return;
  }
  
  // Update theme endpoint
  if (req.url === '/update-theme' && req.method === 'POST') {
    if (!isAllowedOrigin(req)) { res.writeHead(403, headers); res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      lastTheme = body;
      try {
        const combined = { config: lastConfig ? JSON.parse(lastConfig) : null, theme: JSON.parse(body) };
        fs.writeFileSync(lastConfigPath, JSON.stringify(combined));
      } catch (_) {}
      themeClients.forEach(c => c.write('data: ' + body + '\n\n'));
      res.writeHead(200, headers); res.end('OK');
    });
    return;
  }

  // Preview theme endpoint — broadcasts to overlay but does NOT save
  if (req.url === '/preview-theme' && req.method === 'POST') {
    if (!isAllowedOrigin(req)) { res.writeHead(403, headers); res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const theme = JSON.parse(body);
        const previewData = JSON.stringify({ ...theme, __preview: true });
        themeClients.forEach(c => c.write('data: ' + previewData + '\n\n'));
        res.writeHead(200, headers); res.end('OK');
      } catch (err) {
        res.writeHead(400, headers); res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Update config endpoint
  if (req.url === '/update-config' && req.method === 'POST') {
    if (!isAllowedOrigin(req)) { res.writeHead(403, headers); res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      lastConfig = body;
      try {
        const combined = { config: JSON.parse(body), theme: lastTheme ? JSON.parse(lastTheme) : null };
        fs.writeFileSync(lastConfigPath, JSON.stringify(combined));
      } catch (_) {}
      configClients.forEach(c => c.write('data: ' + body + '\n\n'));
      res.writeHead(200, headers); res.end('OK');
    });
    return;
  }

  // Test tip endpoint
  if (req.url === '/test-tip' && req.method === 'POST') {
    if (!isAllowedOrigin(req)) { res.writeHead(403, headers); res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const safe = sanitizeTipData(data.username || 'TestUser', data.tokens || 100, data.message || 'Test tip!');
        log('🧪 TEST TIP triggered: ' + safe.username + ' - ' + safe.tokens + ' tokens');

        const testEvent = {
          type: 'tip',
          username: safe.username,
          tokens: safe.tokens,
          message: safe.message,
          timestamp: Date.now()
        };
        
        latestEvents.push(testEvent);
        sendEventsToClients();
        
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // OBS scene list — overlay POSTs its scene names; editor GETs them
  if (req.url === '/scenes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (Array.isArray(data.scenes)) {
          obsScenes = data.scenes;
          log('🎬 Received ' + obsScenes.length + ' OBS scenes from overlay');
        }
      } catch (_) {}
      res.writeHead(200, headers); res.end('OK');
    });
    return;
  }

  if (req.url === '/scenes' && req.method === 'GET') {
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scenes: obsScenes }));
    return;
  }

  // Ask connected overlay(s) to resend their scene list
  if (req.url === '/request-scenes' && req.method === 'POST') {
    clients.forEach(c => c.write('data: ' + JSON.stringify({ type: 'scenes-requested' }) + '\n\n'));
    res.writeHead(200, headers); res.end('OK');
    return;
  }

  // OAuth callback from Joystick.tv bot installation
  if (req.url.startsWith('/callback') && req.method === 'GET') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bot Installed</title>
<style>
  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0d1a2e; font-family: 'Segoe UI', sans-serif; color: #fff; }
  .card { text-align: center; padding: 48px 56px; border: 2px solid #06d6a0; border-radius: 16px; background: linear-gradient(135deg, #1a0a1e 0%, #0d1a2e 100%); box-shadow: 0 0 40px rgba(6,214,160,0.2); max-width: 440px; }
  .icon { font-size: 56px; margin-bottom: 16px; }
  h1 { margin: 0 0 12px; font-size: 26px; color: #06d6a0; }
  p { margin: 0; color: rgba(255,255,255,0.65); line-height: 1.6; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Bot installed successfully!</h1>
    <p>Your Joystick.tv bot is authorized and ready.<br>You can close this tab and return to the server terminal.</p>
  </div>
</body>
</html>`);
    return;
  }

  res.writeHead(404, headers);
  res.end('Not Found');
});

function logSceneTrigger(tokens) {
  try {
    let configJson = lastConfig;
    if (!configJson && fs.existsSync(lastConfigPath)) {
      const combined = JSON.parse(fs.readFileSync(lastConfigPath, 'utf8'));
      if (combined.config) configJson = JSON.stringify(combined.config);
    }
    if (!configJson) return;
    const config = JSON.parse(configJson);
    if (!Array.isArray(config.SCENE_TIPS)) return;
    const match = config.SCENE_TIPS.find(entry => Number(entry.tokens) === tokens && !entry.disabled);
    if (match) {
      log(`🎬 Scene trigger: ${tokens} tokens → "${match.scene}"`);
    } else {
      log(`ℹ️  No scene trigger configured for ${tokens} tokens`);
    }
  } catch (err) {
    vlog('⚠️ logSceneTrigger error: ' + err.message);
  }
}

function sendEventsToClients() {
  if (clients.length > 0 && latestEvents.length > 0) {
    latestEvents.forEach(event => {
      if (event.type === 'tip') logSceneTrigger(event.tokens);
    });
    vlog(`📤 SERVER: Sending ${latestEvents.length} events to ${clients.length} connected client(s)`);

    const message = JSON.stringify({ events: latestEvents });
    clients.forEach((client, index) => {
      vlog(`📤 SERVER: Sending to client ${index + 1}`);
      client.write('data: ' + message + '\n\n');
    });

    vlog(`✓ SERVER: Events sent and cleared (${latestEvents.length} events)`);
    latestEvents = [];
  } else if (latestEvents.length > 0) {
    log(`⚠️ SERVER: Have ${latestEvents.length} events but NO overlay to connect to!`);
  }
}

// ── Log Level Menu ──────────────────────────────────────────
async function showLogLevelMenu() {
  const defaultLevel = LOG_LEVEL;
  const levelNames = { 1: 'Tips only', 2: 'Tips + user events', 3: 'Full debug' };

  return new Promise((resolve) => {
    const TIMEOUT = 5;
    let secondsLeft = TIMEOUT;
    let answered = false;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    process.stdout.write(
      '\n─────────────────────────────────────\n' +
      ` Log Level — choose and press Enter\n` +
      ` [1] Tips only${defaultLevel === 1 ? '  ← default' : ''}\n` +
      ` [2] Tips + user events${defaultLevel === 2 ? '  ← default' : ''}\n` +
      ` [3] Full debug / troubleshooting${defaultLevel === 3 ? '  ← default' : ''}\n` +
      '─────────────────────────────────────\n'
    );
    process.stdout.write(`Starting with [${defaultLevel}] in ${secondsLeft} seconds...`);

    const ticker = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        process.stdout.write(`\rStarting with [${defaultLevel}] in ${secondsLeft} seconds...`);
      } else {
        clearInterval(ticker);
        if (!answered) {
          answered = true;
          process.stdout.write(`\rStarting with [${defaultLevel}] (from config)...          \n`);
          rl.close();
          resolve();
        }
      }
    }, 1000);

    rl.on('line', (input) => {
      if (answered) return;
      answered = true;
      clearInterval(ticker);
      const choice = input.trim();
      if (choice === '1' || choice === '2' || choice === '3') {
        LOG_LEVEL = parseInt(choice);
      }
      // If user pressed Enter or typed anything else, keep the default
      process.stdout.write(`\rLog level: [${LOG_LEVEL}] ${levelNames[LOG_LEVEL]}.          \n`);
      rl.close();
      resolve();
    });

    rl.on('close', () => {
      if (!answered) { answered = true; clearInterval(ticker); resolve(); }
    });
  });
}

// ── Start Server ───────────────────────────────────────────
async function startServer() {
  const updateInfo = await checkForUpdates();
  if (updateInfo.isNewer) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question(`  Update to v${updateInfo.latest} now? (Y/n): `, resolve));
    rl.close();
    if (!answer.trim() || answer.trim().toLowerCase() === 'y') {
      log('\n📥 Downloading update...');
      try {
        await downloadAndUpdate(updateInfo.latest);
        log(`\n✅ Updated to v${updateInfo.latest}! Please restart the server.`);
        process.exit(0);
      } catch (err) {
        log(`\n❌ Update failed: ${err.message}`);
        log(`   Download manually: https://github.com/${GITHUB_REPO}/releases/latest`);
        log('   Continuing with current version...\n');
      }
    } else {
      log('   Skipping update. Continuing startup...\n');
    }
  }

  // Check and install WebSocket library if needed
  await checkAndInstallWebSocket();

  LOG_LEVEL = CONFIG.LOG_LEVEL_DEFAULT;
  await showLogLevelMenu();
  log('📋 Log level: ' + (LOG_LEVEL === 1 ? '1 (tips only)' : LOG_LEVEL === 2 ? '2 (tips + events)' : '3 (full debug)'));

  // Validate configuration
  log('🚀 Starting OBS Scene Switcher Server...');
  log('');
  log('Platform Status:');
  log('   Chaturbate: ' + (CONFIG.ENABLE_CHATURBATE ? '✅ ENABLED' : '⭕ DISABLED'));
  log('   Joystick.tv: ' + (CONFIG.ENABLE_JOYSTICK ? '✅ ENABLED' : '⭕ DISABLED'));
  log('   StripChat: ' + (CONFIG.ENABLE_STRIPCHAT ? '✅ ENABLED' : '⭕ DISABLED'));
  log('   Twitch: ' + (CONFIG.ENABLE_TWITCH ? '✅ ENABLED' : '⭕ DISABLED'));
  log('');

  if (!CONFIG.ENABLE_CHATURBATE && !CONFIG.ENABLE_JOYSTICK && !CONFIG.ENABLE_STRIPCHAT && !CONFIG.ENABLE_TWITCH) {
    log('❌ ERROR: No platforms enabled! Enable at least one platform in config.json');
    log('');
    process.exit(1);
  }

  if (CONFIG.ENABLE_CHATURBATE) {
    if (CONFIG.CB_USERNAME === 'your_username_here' || CONFIG.CB_TOKEN === 'your_token_here') {
      log('❌ ERROR: Chaturbate is enabled but credentials not configured');
      log('   Please update config.json with your Chaturbate credentials');
      log('');
      process.exit(1);
    }
  }

  if (CONFIG.ENABLE_JOYSTICK) {
    if (CONFIG.JOYSTICK_CLIENT_ID === 'your_client_id_here' || CONFIG.JOYSTICK_CLIENT_SECRET === 'your_client_secret_here') {
      log('❌ ERROR: Joystick.tv is enabled but credentials not configured');
      log('   Please update config.json with your Joystick.tv credentials');
      log('');
      process.exit(1);
    }
  }

  if (CONFIG.ENABLE_STRIPCHAT) {
    if (!CONFIG.SC_USERNAME || CONFIG.SC_USERNAME === 'your_username_here') {
      log('❌ ERROR: StripChat is enabled but username not configured');
      log('   Please update config.json with your StripChat username');
      log('');
      process.exit(1);
    }
  }

  if (CONFIG.ENABLE_TWITCH && !CONFIG.TWITCH_CLI_TEST) {
    if (!CONFIG.TWITCH_CLIENT_ID || CONFIG.TWITCH_CLIENT_ID === 'your_client_id_here') {
      log('❌ ERROR: Twitch is enabled but Client ID not configured');
      log('   Please update config.json with your Twitch credentials');
      log('');
      process.exit(1);
    }
    if (!CONFIG.TWITCH_ACCESS_TOKEN || CONFIG.TWITCH_ACCESS_TOKEN === 'your_access_token_here') {
      log('❌ ERROR: Twitch is enabled but Access Token not configured');
      log('   Please update config.json with your Twitch credentials');
      log('');
      process.exit(1);
    }
    if (!CONFIG.TWITCH_CHANNEL || CONFIG.TWITCH_CHANNEL === 'your_channel_here') {
      log('❌ ERROR: Twitch is enabled but Channel name not configured');
      log('   Please update config.json with your Twitch credentials');
      log('');
      process.exit(1);
    }
  }

  // Start HTTP server
  server.listen(CONFIG.PORT, '127.0.0.1', () => {
    log('✅ HTTP Server running at http://localhost:' + CONFIG.PORT + ' (localhost only)');
    log('');
    log('🛡️  Event deduplication: ACTIVE');
    log('📝 Debug log: oss_server_debug.log');
    log('');
    log('Now add this to OBS:');
    log('   1. Browser Source → Local File → oss_overlay.html');
    log('   2. Set width=1920, height=1080');
    log('   3. Page Permissions = "Advanced access to OBS"');
    log('');
    log('To customize themes and settings:');
    log('   Open oss_editor.html in your browser');
    log('');
    log('Press Ctrl+C to stop the server.');
    log('');
    
    // Start enabled platforms
    if (CONFIG.ENABLE_CHATURBATE) {
      startChaturbate();
    }
    
    if (CONFIG.ENABLE_JOYSTICK) {
      startJoystick();
    }

    if (CONFIG.ENABLE_STRIPCHAT) {
      startStripchat();
    }

    if (CONFIG.ENABLE_TWITCH) {
      startTwitch();
    }
  });
}

// Start the server
startServer().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// ══════════════════════════════════════════════════════════
//  CHATURBATE INTEGRATION
// ══════════════════════════════════════════════════════════

let chaturbateFetchActive = false;
let chaturbateEventsUrl = '';

function startChaturbate() {
  log('🟣 Starting Chaturbate integration...');
  chaturbateEventsUrl = `https://eventsapi.chaturbate.com/events/${CONFIG.CB_USERNAME}/${CONFIG.CB_TOKEN}/`;
  pollChaturbateEvents();
}

async function pollChaturbateEvents() {
  if (!CONFIG.ENABLE_CHATURBATE) return;
  if (chaturbateFetchActive) return;
  chaturbateFetchActive = true;

  try {
    const data = await fetchEvents(chaturbateEventsUrl + '?timeout=10');

    if (data.next_url) {
      chaturbateEventsUrl = data.next_url;
    }

    if (data.events && data.events.length > 0) {
      vlog('📬 [CHATURBATE] Received ' + data.events.length + ' event(s)');
      
      for (const event of data.events) {
        processChaturbateEvent(event);
      }

      sendEventsToClients();
    }
  } catch (err) {
    log('⚠️  [CHATURBATE] Events API error: ' + err.message + ' — retrying in 5s');
    await sleep(5000);
  } finally {
    chaturbateFetchActive = false;
  }

  // Continue polling
  setImmediate(pollChaturbateEvents);
}

function processChaturbateEvent(event) {
  const method = event.method;
  const obj = event.object;
  
  vlog('📦 [CHATURBATE] RAW EVENT: ' + JSON.stringify(event));
  
  // Generate event ID
  let eventId;
  
  if (method === 'tip') {
    const tip = obj.tip || obj;
    const username = obj.user?.username || 'Anonymous';
    const tokens = tip.tokens || 0;
    const message = tip.message || '';
    const isAnon = tip.isanon || false;
    const timestamp = event.id || Date.now();
    eventId = `cb_tip_${timestamp}_${username}_${tokens}`;
    
    vlog(`[CHATURBATE] Checking tip event - ID: ${eventId}, Tokens: ${tokens}`);
  } else {
    const username = obj.user?.username || 'Unknown';
    const timestamp = event.id || Date.now();
    eventId = `cb_${method}_${timestamp}_${username}`;

    vlog(`[CHATURBATE] Non-tip event - Type: ${method}, ID: ${eventId}`);
  }
  
  if (processedEventIds.has(eventId)) {
    vlog(`⏭️  [CHATURBATE] SKIPPED - Already processed event ID: ${eventId}`);
    return;
  }

  processedEventIds.add(eventId);
  vlog(`✅ [CHATURBATE] NEW EVENT ACCEPTED - ID: ${eventId}`);
  
  if (method === 'tip') {
    const tip = obj.tip || obj;
    const username = obj.user ? obj.user.username : 'Anonymous';
    let tokens = tip.tokens;
    
    if (tokens === undefined || tokens === null) {
      tokens = obj.tokens || tip.amount || obj.amount || 0;
    }
    
    vlog(`[CHATURBATE] Processing tip: User=${username}, Tokens=${tokens}, Has message=${!!(tip.message || obj.message)}`);
    
    if (!tokens || tokens <= 0) {
      log(`⚠️  [CHATURBATE] INVALID TIP - Amount is ${tokens} (must be > 0)`);
      return;
    }
    
    log(`💰 [CHATURBATE] VALID TIP: ${username} tipped ${tokens} tokens`);

    const safe = sanitizeTipData(username, tokens, tip.message || obj.message || '');
    latestEvents.push({
      type: 'tip',
      username: safe.username,
      tokens: safe.tokens,
      message: safe.message,
      isAnon: tip.isanon || obj.isanon || false,
      timestamp: Date.now()
    });
    
    vlog(`✓ [CHATURBATE] Tip added to queue. Queue size: ${latestEvents.length}`);
  } else {
    const username = obj.user?.username || 'Unknown';
    
    if (method === 'userEnter') {
      elog(`\x1b[32m▶  [CHATURBATE] Event: userEnter "${username}"\x1b[0m`);
    } else if (method === 'userLeave') {
      elog(`\x1b[31m⬅  [CHATURBATE] Event: userLeave "${username}"\x1b[0m`);
    } else {
      vlog(`ℹ️  [CHATURBATE] NON-TIP EVENT IGNORED: ${method}`);
    }
  }
}

// ══════════════════════════════════════════════════════════
//  JOYSTICK.TV INTEGRATION
// ══════════════════════════════════════════════════════════

let joystickWs = null;
let joystickReconnectTimeout = null;
let joystickIsConnected = false;

function startJoystick() {
  // Check if ws module is available
  try {
    const WebSocket = require('ws');
    connectToJoystick(WebSocket);
  } catch (err) {
    log('❌ [JOYSTICK] ERROR: ws module not found');
    log('   Please install: npm install ws');
    log('   Joystick.tv support disabled');
    log('');
  }
}

function connectToJoystick(WebSocket) {
  if (!CONFIG.ENABLE_JOYSTICK) return;
  
  const basicAuth = Buffer.from(`${CONFIG.JOYSTICK_CLIENT_ID}:${CONFIG.JOYSTICK_CLIENT_SECRET}`).toString('base64');
  const wsUrl = `wss://joystick.tv/cable?token=${basicAuth}`;
  
  log('🟢 [JOYSTICK] Connecting to WebSocket...');
  
  try {
    joystickWs = new WebSocket(wsUrl, 'actioncable-v1-json');
    
    joystickWs.on('open', () => {
      log('✅ [JOYSTICK] Connected!');
      joystickIsConnected = true;
      
      const subscribeMessage = {
        command: 'subscribe',
        identifier: JSON.stringify({ channel: 'GatewayChannel' })
      };
      
      joystickWs.send(JSON.stringify(subscribeMessage));
      vlog('📡 [JOYSTICK] Subscribing to GatewayChannel...');
    });
    
    joystickWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleJoystickMessage(message);
      } catch (err) {
        log('❌ [JOYSTICK] Error parsing message: ' + err.message);
      }
    });
    
    joystickWs.on('error', (error) => {
      log('❌ [JOYSTICK] WebSocket error: ' + error.message);
    });
    
    joystickWs.on('close', () => {
      log('⚠️  [JOYSTICK] Disconnected');
      joystickIsConnected = false;
      
      if (CONFIG.ENABLE_JOYSTICK) {
        joystickReconnectTimeout = setTimeout(() => {
          log('🔄 [JOYSTICK] Attempting to reconnect...');
          connectToJoystick(WebSocket);
        }, 5000);
      }
    });
    
  } catch (err) {
    log('❌ [JOYSTICK] Failed to connect: ' + err.message);
    if (CONFIG.ENABLE_JOYSTICK) {
      joystickReconnectTimeout = setTimeout(() => connectToJoystick(WebSocket), 5000);
    }
  }
}

function handleJoystickMessage(message) {
  const type = message.type;
  
  if (type === 'ping') {
    vlog('💓 [JOYSTICK] Ping received (connection alive)');
    return;
  }
  
  if (type === 'confirm_subscription') {
    log('✅ [JOYSTICK] Subscription confirmed to GatewayChannel');
    return;
  }
  
  if (type === 'reject_subscription') {
    log('❌ [JOYSTICK] Subscription REJECTED - Check bot permissions!');
    return;
  }
  
  if (message.message) {
    const event = message.message;
    processJoystickEvent(event);
  }
}

function processJoystickEvent(event) {
  const eventType = event.event;
  
  vlog('📦 [JOYSTICK] RAW EVENT: ' + JSON.stringify(event));

  const eventId = `joystick_${event.id || Date.now()}`;

  if (processedEventIds.has(eventId)) {
    vlog('⏭️  [JOYSTICK] SKIPPED - Already processed event ID: ' + eventId);
    return;
  }

  processedEventIds.add(eventId);
  vlog('✅ [JOYSTICK] NEW EVENT ACCEPTED - ID: ' + eventId);
  
  if (eventType === 'StreamEvent') {
    const streamEventType = event.type;
    
    if (streamEventType === 'Tipped') {
      handleJoystickTip(event);
      sendEventsToClients();
    } else {
      vlog('ℹ️  [JOYSTICK] StreamEvent ignored: ' + streamEventType + ' (not a tip)');
    }
  }
  
  else if (eventType === 'UserPresence') {
    const presenceType = event.type;
    const username = event.text || 'Unknown';
    
    if (presenceType === 'enter_stream') {
      elog(`\x1b[32m▶  JOYSTICK] Event: userEnter "${username}"\x1b[0m`);
    } else if (presenceType === 'leave_stream') {
      elog(`\x1b[31m⬅  [JOYSTICK] Event: userLeave "${username}"\x1b[0m`);
    }
  }
  
  else if (eventType === 'ChatMessage') {
    vlog('ℹ️  [JOYSTICK] Chat message ignored (not a tip)');
  }

  else {
    vlog('ℹ️  [JOYSTICK] Unknown event type: ' + eventType);
  }
}

function handleJoystickTip(event) {
  try {
    const metadata = JSON.parse(event.metadata || '{}');
    
    const username = metadata.who || 'Anonymous';
    const tokens = metadata.how_much || 0;
    const tipMenuItem = metadata.tip_menu_item || null;
    
    vlog(`[JOYSTICK] Processing tip: User=${username}, Tokens=${tokens}, Menu Item=${tipMenuItem || 'none'}`);
    
    if (!tokens || tokens <= 0) {
      log(`⚠️  [JOYSTICK] INVALID TIP - Amount is ${tokens} (must be > 0)`);
      return;
    }
    
    log(`💰 [JOYSTICK] VALID TIP: ${username} tipped ${tokens} tokens` + (tipMenuItem ? ` for ${tipMenuItem}` : ''));

    const safe = sanitizeTipData(username, tokens, tipMenuItem || '');
    latestEvents.push({
      type: 'tip',
      username: safe.username,
      tokens: safe.tokens,
      message: safe.message,
      timestamp: Date.now()
    });
    
    vlog(`✓ [JOYSTICK] Tip added to queue. Queue size: ${latestEvents.length}`);
    
  } catch (err) {
    log('❌ [JOYSTICK] Error parsing tip metadata: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════
//  STRIPCHAT INTEGRATION
// ══════════════════════════════════════════════════════════

let stripchatPollTimeout = null;
let stripchatModelId = null;
let stripchatLastSeenId = null;

function startStripchat() {
  log('🔴 [STRIPCHAT] Starting tip polling for ' + CONFIG.SC_USERNAME + '...');
  pollStripchat();
}

async function pollStripchat() {
  if (!CONFIG.ENABLE_STRIPCHAT) return;

  try {
    // Resolve model ID on first run (or if lost)
    if (!stripchatModelId) {
      const camData = await fetchStripchatCamData();
      const userObj = camData.user && camData.user.user ? camData.user.user : camData.user;
      stripchatModelId = userObj && userObj.id ? String(userObj.id) : null;

      if (!stripchatModelId) {
        log('⚠️  [STRIPCHAT] Could not get model ID — stream may be offline. Retrying in 30s');
        stripchatPollTimeout = setTimeout(pollStripchat, 30000);
        return;
      }

      log('✅ [STRIPCHAT] Connected — polling tips for model ' + stripchatModelId);
    }

    // Fetch recent chat messages
    const messages = await fetchStripchatChat();

    // On the very first successful poll, mark all existing messages as seen
    // so we only process tips that arrive after the server starts
    if (stripchatLastSeenId === null) {
      const maxId = messages.reduce((max, m) => (m.id > max ? m.id : max), 0);
      stripchatLastSeenId = maxId;
      log('✅ [STRIPCHAT] Watching for new tips (skipped ' + messages.length + ' existing messages)');
      stripchatPollTimeout = setTimeout(pollStripchat, 2000);
      return;
    }

    // Only process messages newer than what we've already seen
    let newMaxId = stripchatLastSeenId;
    for (const msg of messages) {
      if (msg.id > stripchatLastSeenId) {
        if (msg.type === 'tip' || msg.type === 'privateTip') {
          processStripchatTip(msg);
        } else {
          vlog('[STRIPCHAT] Ignored message type: ' + msg.type);
        }
        if (msg.id > newMaxId) newMaxId = msg.id;
      }
    }
    stripchatLastSeenId = newMaxId;

  } catch (err) {
    vlog('⚠️  [STRIPCHAT] Poll error: ' + err.message);
    // If we lost the model ID (e.g., stream went offline), reset so we re-resolve next poll
    if (err.message.startsWith('HTTP')) stripchatModelId = null;
  }

  // Schedule next poll
  if (CONFIG.ENABLE_STRIPCHAT) {
    stripchatPollTimeout = setTimeout(pollStripchat, 2000);
  }
}

function processStripchatTip(msg) {
  const username = (msg.userData && msg.userData.username) || '';
  const tokens = parseInt((msg.details && msg.details.amount) || 0) || 0;
  const tipNote = (msg.details && msg.details.body) || '';
  const isAnon = (msg.details && msg.details.isAnonymous) || !username;

  const displayName = isAnon ? 'Anonymous' : username;
  // Use message ID for dedup when available; fall back to content hash
  const eventId = msg.id ? `sc_msg_${msg.id}` : `sc_tip_${displayName}_${tokens}_${msg.createdAt || ''}`;

  if (processedEventIds.has(eventId)) {
    vlog('⏭️  [STRIPCHAT] Skipped duplicate: ' + eventId);
    return;
  }

  processedEventIds.add(eventId);
  vlog('✅ [STRIPCHAT] NEW EVENT ACCEPTED - ID: ' + eventId);

  if (!tokens || tokens <= 0) {
    log('⚠️  [STRIPCHAT] INVALID TIP - Amount is ' + tokens + ' (must be > 0)');
    return;
  }

  log('💰 [STRIPCHAT] VALID TIP: ' + displayName + ' tipped ' + tokens + ' tokens');

  const safe = sanitizeTipData(displayName, tokens, tipNote);
  latestEvents.push({
    type: 'tip',
    username: safe.username,
    tokens: safe.tokens,
    message: safe.message,
    timestamp: Date.now()
  });

  sendEventsToClients();
  vlog('✓ [STRIPCHAT] Tip added to queue. Queue size: ' + latestEvents.length);
}

function fetchStripchatChat() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'stripchat.com',
      path: '/api/front/v2/models/username/' + CONFIG.SC_USERNAME + '/chat',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://stripchat.com/' + CONFIG.SC_USERNAME,
        'Cookie': 'age_verified=1; platform=desktop',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.messages || []);
        } catch (e) {
          reject(new Error('Invalid JSON from chat API'));
        }
      });
    }).on('error', reject);
  });
}

function fetchStripchatCamData() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'stripchat.com',
      path: '/api/front/v2/models/username/' + CONFIG.SC_USERNAME + '/cam',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://stripchat.com/' + CONFIG.SC_USERNAME,
        'Cookie': 'age_verified=1; platform=desktop',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from cam API')); }
      });
    }).on('error', reject);
  });
}


// ══════════════════════════════════════════════════════════════════
//  TWITCH INTEGRATION (EventSub WebSocket — channel.cheer / Bits)
// ══════════════════════════════════════════════════════════════════

let twitchWs = null;
let twitchReconnectTimeout = null;
let twitchBroadcasterId = null;
let twitchSessionId = null;

async function startTwitch() {
  log('🟣 [TWITCH] Starting Twitch EventSub integration for ' + CONFIG.TWITCH_CHANNEL + '...');

  if (CONFIG.TWITCH_CLI_TEST) {
    log('🟣 [TWITCH] CLI test mode — skipping broadcaster ID resolution');
    twitchBroadcasterId = 'cli_test_broadcaster';
  } else {
    await resolveTwitchBroadcasterId();
  }

  if (!twitchBroadcasterId) {
    log('❌ [TWITCH] Could not resolve broadcaster ID — Twitch integration disabled');
    return;
  }

  try {
    const WebSocket = require('ws');
    connectToTwitch(WebSocket);
  } catch (err) {
    log('❌ [TWITCH] ERROR: ws module not found');
    log('   Please install: npm install ws');
    log('   Twitch support disabled');
  }
}

function resolveTwitchBroadcasterId() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twitch.tv',
      path: '/helix/users?login=' + encodeURIComponent(CONFIG.TWITCH_CHANNEL),
      method: 'GET',
      headers: {
        'Client-Id': CONFIG.TWITCH_CLIENT_ID,
        'Authorization': 'Bearer ' + CONFIG.TWITCH_ACCESS_TOKEN
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const user = parsed.data && parsed.data[0];
          if (user && user.id) {
            twitchBroadcasterId = user.id;
            log('✅ [TWITCH] Broadcaster ID resolved: ' + twitchBroadcasterId);
          } else {
            log('❌ [TWITCH] Channel "' + CONFIG.TWITCH_CHANNEL + '" not found — check spelling and token validity');
          }
        } catch (e) {
          log('❌ [TWITCH] Error parsing /helix/users response: ' + e.message);
        }
        resolve();
      });
    }).on('error', (err) => {
      log('❌ [TWITCH] HTTP error resolving broadcaster ID: ' + err.message);
      resolve();
    });
  });
}

function connectToTwitch(WebSocket) {
  if (!CONFIG.ENABLE_TWITCH) return;

  log('🟣 [TWITCH] Connecting to EventSub WebSocket...');

  try {
    const wsUrl = CONFIG.TWITCH_CLI_TEST ? 'ws://127.0.0.1:8080/ws' : 'wss://eventsub.wss.twitch.tv/ws';
    twitchWs = new WebSocket(wsUrl);

    twitchWs.on('open', () => {
      log('✅ [TWITCH] WebSocket connected — waiting for session');
    });

    twitchWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleTwitchMessage(message, WebSocket);
      } catch (err) {
        log('❌ [TWITCH] Error parsing message: ' + err.message);
      }
    });

    twitchWs.on('error', (error) => {
      log('❌ [TWITCH] WebSocket error: ' + error.message);
    });

    twitchWs.on('close', () => {
      log('⚠️  [TWITCH] Disconnected');
      twitchSessionId = null;

      if (CONFIG.ENABLE_TWITCH) {
        twitchReconnectTimeout = setTimeout(() => {
          log('🔄 [TWITCH] Attempting to reconnect...');
          connectToTwitch(WebSocket);
        }, 5000);
      }
    });

  } catch (err) {
    log('❌ [TWITCH] Failed to connect: ' + err.message);
    if (CONFIG.ENABLE_TWITCH) {
      twitchReconnectTimeout = setTimeout(() => connectToTwitch(WebSocket), 5000);
    }
  }
}

function handleTwitchMessage(message, WebSocket) {
  const msgType = message.metadata && message.metadata.message_type;

  if (msgType === 'session_welcome') {
    twitchSessionId = message.payload.session.id;
    log('✅ [TWITCH] Session established — subscribing to channel.cheer');
    subscribeToTwitchEvents();
    return;
  }

  if (msgType === 'session_keepalive') {
    vlog('💓 [TWITCH] Keepalive received (connection alive)');
    return;
  }

  if (msgType === 'session_reconnect') {
    const reconnectUrl = message.payload.session.reconnect_url;
    log('🔄 [TWITCH] Server requested reconnect');
    try {
      const newWs = new WebSocket(reconnectUrl);
      newWs.on('open', () => {
        log('✅ [TWITCH] Reconnect WebSocket open');
        if (twitchWs) twitchWs.close();
        twitchWs = newWs;
      });
      newWs.on('message', (data) => {
        try { handleTwitchMessage(JSON.parse(data), WebSocket); }
        catch (err) { log('❌ [TWITCH] Error parsing reconnect message: ' + err.message); }
      });
      newWs.on('error', (err) => {
        log('❌ [TWITCH] Reconnect WebSocket error: ' + err.message);
      });
      newWs.on('close', () => {
        twitchSessionId = null;
        if (CONFIG.ENABLE_TWITCH) {
          twitchReconnectTimeout = setTimeout(() => connectToTwitch(WebSocket), 5000);
        }
      });
    } catch (err) {
      log('❌ [TWITCH] Failed to connect to reconnect URL: ' + err.message);
    }
    return;
  }

  if (msgType === 'notification') {
    handleTwitchNotification(message);
    return;
  }

  if (msgType === 'revocation') {
    log('⚠️  [TWITCH] Subscription revoked: ' + JSON.stringify(message.payload.subscription));
    return;
  }

  vlog('ℹ️  [TWITCH] Unhandled message type: ' + msgType);
}

function subscribeToTwitchEvents() {
  if (!twitchSessionId || !twitchBroadcasterId) {
    log('❌ [TWITCH] Cannot subscribe — missing session ID or broadcaster ID');
    return;
  }

  const body = JSON.stringify({
    type: 'channel.cheer',
    version: '1',
    condition: { broadcaster_user_id: twitchBroadcasterId },
    transport: {
      method: 'websocket',
      session_id: twitchSessionId
    }
  });

  const useCliTest = CONFIG.TWITCH_CLI_TEST;
  const options = {
    hostname: useCliTest ? '127.0.0.1' : 'api.twitch.tv',
    port: useCliTest ? 8080 : undefined,
    path: '/helix/eventsub/subscriptions',
    method: 'POST',
    headers: useCliTest
      ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      : { 'Client-Id': CONFIG.TWITCH_CLIENT_ID, 'Authorization': 'Bearer ' + CONFIG.TWITCH_ACCESS_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const req = (useCliTest ? http : https).request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 202) {
        log('✅ [TWITCH] Subscribed to channel.cheer for ' + CONFIG.TWITCH_CHANNEL);
      } else {
        log('❌ [TWITCH] EventSub subscription failed (HTTP ' + res.statusCode + '): ' + data);
        if (res.statusCode === 401) {
          log('   Check that your access token is valid and has the bits:read scope');
        }
      }
    });
  });

  req.on('error', (err) => {
    log('❌ [TWITCH] EventSub subscription request error: ' + err.message);
  });

  req.write(body);
  req.end();
}

function handleTwitchNotification(message) {
  const subscriptionType = message.metadata && message.metadata.subscription_type;
  const messageId = message.metadata && message.metadata.message_id;

  vlog('📦 [TWITCH] RAW NOTIFICATION type: ' + subscriptionType);

  if (subscriptionType === 'channel.cheer') {
    processTwitchCheer(message.payload.event, messageId);
  } else {
    vlog('ℹ️  [TWITCH] Notification for unhandled type: ' + subscriptionType);
  }
}

function processTwitchCheer(event, messageId) {
  vlog('📦 [TWITCH] RAW CHEER EVENT: ' + JSON.stringify(event));

  const eventId = messageId
    ? 'twitch_' + messageId
    : 'twitch_cheer_' + (event.broadcaster_user_id || '') + '_' + (event.user_id || 'anon') + '_' + (event.bits || 0) + '_' + Date.now();

  if (processedEventIds.has(eventId)) {
    vlog('⏭️  [TWITCH] SKIPPED - Already processed event ID: ' + eventId);
    return;
  }

  processedEventIds.add(eventId);
  vlog('✅ [TWITCH] NEW EVENT ACCEPTED - ID: ' + eventId);

  const isAnon = event.is_anonymous || false;
  const username = isAnon ? 'Anonymous' : (event.user_name || 'Anonymous');
  const bits = event.bits || 0;
  const message = event.message || '';

  if (!bits || bits <= 0) {
    log('⚠️  [TWITCH] INVALID CHEER - Amount is ' + bits + ' (must be > 0)');
    return;
  }

  log('💰 [TWITCH] VALID CHEER: ' + username + ' cheered ' + bits + ' bits');

  const safe = sanitizeTipData(username, bits, message);
  latestEvents.push({
    type: 'tip',
    username: safe.username,
    tokens: safe.tokens,
    message: safe.message,
    isAnon: isAnon,
    timestamp: Date.now()
  });

  sendEventsToClients();
  vlog('✓ [TWITCH] Cheer added to queue. Queue size: ' + latestEvents.length);
}

// ── Helper Functions ────────────────────────────────────────

function fetchEvents(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Graceful Shutdown ───────────────────────────────────────

process.on('SIGINT', () => {
  log('\n\n👋 Shutting down server...');
  
  if (joystickWs) {
    joystickWs.close();
  }

  if (joystickReconnectTimeout) {
    clearTimeout(joystickReconnectTimeout);
  }

  if (stripchatPollTimeout) {
    clearTimeout(stripchatPollTimeout);
  }

  if (twitchWs) {
    twitchWs.close();
  }

  if (twitchReconnectTimeout) {
    clearTimeout(twitchReconnectTimeout);
  }

  server.close();
  process.exit(0);
});
