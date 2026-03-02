// ============================================================
// OBS Scene Switcher Server
// ============================================================
// Supports both Chaturbate and Joystick.tv platforms
// Enable/disable platforms in configuration
// ============================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ── Logging Setup ───────────────────────────────────────────
const logFile = path.join(__dirname, 'oss_server_debug.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(message);
  try { fs.appendFileSync(logFile, logMessage + '\n'); } catch (err) {}
}

function vlog(message) {
  if (CONFIG && CONFIG.VERBOSE_LOGGING) log(message);
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
    PORT: config.server.port || 3000,
    VERBOSE_LOGGING: config.server.verbose_logging ?? false
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

// ── Check and Auto-Install WebSocket Library ───────────────
async function checkAndInstallWebSocket() {
  if (!CONFIG.ENABLE_JOYSTICK) {
    return; // Not needed if Joystick is disabled
  }
  
  // Check if ws module exists
  try {
    require.resolve('ws');
    log('✅ WebSocket library (ws) found');
    return; // Already installed
  } catch (err) {
    // ws not found - offer to install
    console.log('\n⚠️  WebSocket library not found!');
    console.log('Joystick.tv support requires the "ws" library.');
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
          console.log('Joystick.tv support will be disabled.');
          console.log('To enable it later, install ws and restart the server.\n');
          CONFIG.ENABLE_JOYSTICK = false; // Disable Joystick since ws not available
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
    if (lastConfig) res.write('data: ' + lastConfig + '\n\n');
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

function sendEventsToClients() {
  if (clients.length > 0 && latestEvents.length > 0) {
    vlog(`📤 SERVER: Sending ${latestEvents.length} events to ${clients.length} connected client(s)`);

    const message = JSON.stringify({ events: latestEvents });
    clients.forEach((client, index) => {
      vlog(`📤 SERVER: Sending to client ${index + 1}`);
      client.write('data: ' + message + '\n\n');
    });

    vlog(`✓ SERVER: Events sent and cleared (${latestEvents.length} events)`);
    latestEvents = [];
  } else if (latestEvents.length > 0) {
    log(`⚠️ SERVER: Have ${latestEvents.length} events but NO connected clients`);
  }
}

// ── Start Server ───────────────────────────────────────────
async function startServer() {
  // Check and install WebSocket library if needed
  await checkAndInstallWebSocket();
  
  // Validate configuration
  log('🚀 Starting OBS Scene Switcher Server...');
  log('');
  log('Platform Status:');
  log('   Chaturbate: ' + (CONFIG.ENABLE_CHATURBATE ? '✅ ENABLED' : '⭕ DISABLED'));
  log('   Joystick.tv: ' + (CONFIG.ENABLE_JOYSTICK ? '✅ ENABLED' : '⭕ DISABLED'));
  log('');

  if (!CONFIG.ENABLE_CHATURBATE && !CONFIG.ENABLE_JOYSTICK) {
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
      console.log(`\x1b[32m📦 [CHATURBATE] Event: userEnter "${username}"\x1b[0m`);
    } else if (method === 'userLeave') {
      console.log(`\x1b[31m📦 [CHATURBATE] Event: userLeave "${username}"\x1b[0m`);
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

  const eventId = `joystick_${event.id || Date.now()}_${Math.random()}`;

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
      console.log(`\x1b[32m📦 [JOYSTICK] Event: userEnter "${username}"\x1b[0m`);
    } else if (presenceType === 'leave_stream') {
      console.log(`\x1b[31m📦 [JOYSTICK] Event: userLeave "${username}"\x1b[0m`);
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
  
  server.close();
  process.exit(0);
});
