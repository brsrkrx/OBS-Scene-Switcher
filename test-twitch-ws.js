// Mock Twitch EventSub WebSocket server for local testing.
// Mimics the real Twitch EventSub protocol so oss_server.js goes through
// the full WebSocket connection, handshake, and subscription flow.
//
// Usage:
//   1. node test-twitch-ws.js
//   2. Start oss_server.js (with TWITCH_CLI_TEST=true in config.json)
//   3. Open in browser to fire a test cheer:
//        http://localhost:8080/fire-cheer
//        http://localhost:8080/fire-cheer?bits=500&user=BigFan&message=Cheer500

const http = require('http');
const WebSocket = require('ws');

const PORT = 8080;

let activeWs = null;
let subscribed = false;

function uid() {
  return Math.random().toString(36).slice(2, 15);
}

const httpServer = http.createServer((req, res) => {

  // Subscription endpoint — oss_server.js POSTs here after the session is established
  if (req.url === '/helix/eventsub/subscriptions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('✅ Subscription received for: ' + data.type);
        subscribed = true;
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: [{ id: uid(), status: 'enabled', type: data.type, version: data.version }]
        }));
        console.log('');
        console.log('Ready to fire test events!');
        console.log('Open in your browser: http://localhost:' + PORT + '/fire-cheer');
        console.log('Optional params:      http://localhost:' + PORT + '/fire-cheer?bits=500&user=BigFan&message=Cheer500');
        console.log('');
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // Fire-cheer endpoint — open in browser to send a test cheer event
  if (req.url.startsWith('/fire-cheer') && req.method === 'GET') {
    if (!activeWs || activeWs.readyState !== WebSocket.OPEN) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('No OBS server connected yet — start oss_server.js first');
      return;
    }
    if (!subscribed) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Subscription not confirmed yet — wait a moment and try again');
      return;
    }

    const params = new URL(req.url, 'http://localhost').searchParams;
    const bits = Math.max(1, parseInt(params.get('bits') || '100', 10));
    const user = params.get('user') || 'TestViewer';
    const message = params.get('message') || 'Cheer' + bits;

    const notification = {
      metadata: {
        message_id: uid(),
        message_type: 'notification',
        message_timestamp: new Date().toISOString(),
        subscription_type: 'channel.cheer',
        subscription_version: '1'
      },
      payload: {
        subscription: {
          id: uid(),
          type: 'channel.cheer',
          version: '1',
          status: 'enabled',
          condition: { broadcaster_user_id: 'cli_test_broadcaster' }
        },
        event: {
          is_anonymous: false,
          user_id: 'test_user_001',
          user_login: user.toLowerCase(),
          user_name: user,
          broadcaster_user_id: 'cli_test_broadcaster',
          broadcaster_user_login: 'testchannel',
          broadcaster_user_name: 'testchannel',
          message: message,
          bits: bits
        }
      }
    };

    activeWs.send(JSON.stringify(notification));
    console.log('🎉 Cheer fired: ' + user + ' cheered ' + bits + ' bits');

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Cheer sent: ' + user + ' cheered ' + bits + ' bits\n\nCheck your OBS Scene Switcher overlay.');
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('🔌 OBS server connected');
  activeWs = ws;
  subscribed = false;

  const sessionId = uid();

  // Send session_welcome — triggers oss_server.js to subscribe
  ws.send(JSON.stringify({
    metadata: {
      message_id: uid(),
      message_type: 'session_welcome',
      message_timestamp: new Date().toISOString()
    },
    payload: {
      session: {
        id: sessionId,
        status: 'connected',
        connected_at: new Date().toISOString(),
        keepalive_timeout_seconds: 10,
        reconnect_url: null
      }
    }
  }));

  // Send keepalives so the connection stays alive
  const keepalive = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        metadata: {
          message_id: uid(),
          message_type: 'session_keepalive',
          message_timestamp: new Date().toISOString()
        },
        payload: {}
      }));
    } else {
      clearInterval(keepalive);
    }
  }, 9000);

  ws.on('close', () => {
    console.log('⚠️  OBS server disconnected');
    activeWs = null;
    clearInterval(keepalive);
  });

  ws.on('error', (err) => {
    console.log('WebSocket error: ' + err.message);
  });
});

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log('Mock Twitch EventSub server running on port ' + PORT);
  console.log('Waiting for OBS Scene Switcher to connect...');
  console.log('');
});
