import { WebSocket } from 'ws';

const BASE_HTTP = 'http://127.0.0.1:8787';
const BASE_WS = 'ws://127.0.0.1:8787';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testHttpEndpoints() {
  console.log('\n--- 1. Testing HTTP Health Endpoints ---');

  // Test /health
  const healthRes = await fetch(`${BASE_HTTP}/health`);
  const healthData = await healthRes.json();
  console.log('GET /health Status:', healthRes.status, healthData);
  if (healthRes.status !== 200 || healthData.name !== 'DropLink Signaling Server' || healthData.status !== 'online') {
    throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
  }

  // Test GET /
  const rootRes = await fetch(`${BASE_HTTP}/`);
  const rootData = await rootRes.json();
  console.log('GET / Status:', rootRes.status, rootData);
  if (rootRes.status !== 200 || rootData.status !== 'online') {
    throw new Error(`Root GET failed: ${JSON.stringify(rootData)}`);
  }

  // Test OPTIONS CORS
  const optRes = await fetch(`${BASE_HTTP}/health`, { method: 'OPTIONS' });
  console.log('OPTIONS /health Status:', optRes.status, 'CORS Header:', optRes.headers.get('Access-Control-Allow-Origin'));
  if (optRes.status !== 204 || optRes.headers.get('Access-Control-Allow-Origin') !== '*') {
    throw new Error('CORS OPTIONS preflight check failed');
  }

  console.log('✓ HTTP endpoints passed successfully');
}

async function testWebSocketProtocol() {
  console.log('\n--- 2. Testing WebSocket Signaling Protocol & Durable Object ---');

  const wsA = new WebSocket(BASE_WS);
  await new Promise((resolve, reject) => {
    wsA.on('open', resolve);
    wsA.on('error', reject);
  });
  console.log('✓ Device A connected to Worker via WebSocket');

  // Step 1: Device A creates room
  const devA = {
    id: 'dev_desktop_1',
    name: 'MacBook Pro',
    type: 'desktop',
    os: 'mac',
    browser: 'chrome',
    status: 'connected',
    joinedAt: Date.now(),
  };

  let roomCode = '';

  const roomCreatedPromise = new Promise((resolve) => {
    wsA.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'room-created') {
        roomCode = msg.payload.room.id;
        console.log(`✓ Device A created room: ${roomCode}`);
        resolve(msg);
      }
    });
  });

  wsA.send(
    JSON.stringify({
      type: 'create-room',
      payload: { device: devA },
      requestId: 'req_create_1',
    })
  );

  await roomCreatedPromise;
  if (!roomCode || roomCode.length !== 6) {
    throw new Error(`Invalid room code created: ${roomCode}`);
  }

  // Step 2: Device B connects and joins room
  const wsB = new WebSocket(BASE_WS);
  await new Promise((resolve, reject) => {
    wsB.on('open', resolve);
    wsB.on('error', reject);
  });
  console.log('✓ Device B connected to Worker via WebSocket');

  const devB = {
    id: 'dev_mobile_2',
    name: 'iPhone 15',
    type: 'mobile',
    os: 'ios',
    browser: 'safari',
    status: 'connected',
    joinedAt: Date.now(),
  };

  const devBJoinedPromise = new Promise((resolve) => {
    wsB.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'room-joined') {
        console.log(`✓ Device B received room-joined for room: ${msg.payload.room.id}`);
        resolve(msg);
      }
    });
  });

  const devASeesDeviceJoinedPromise = new Promise((resolve) => {
    wsA.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'device-joined') {
        console.log(`✓ Device A received device-joined for peer: ${msg.payload.device.name}`);
        resolve(msg);
      }
    });
  });

  wsB.send(
    JSON.stringify({
      type: 'join-room',
      payload: { roomCode, device: devB },
      requestId: 'req_join_1',
    })
  );

  await Promise.all([devBJoinedPromise, devASeesDeviceJoinedPromise]);

  // Step 3: WebRTC Offer Relay (A -> B)
  const devBOfferPromise = new Promise((resolve) => {
    wsB.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'webrtc-offer') {
        console.log('✓ Device B received relayed webrtc-offer from Device A');
        resolve(msg);
      }
    });
  });

  wsA.send(
    JSON.stringify({
      type: 'webrtc-offer',
      payload: {
        roomId: roomCode,
        sdp: { type: 'offer', sdp: 'v=0 dummy-offer-sdp' },
        senderId: devA.id,
        targetId: devB.id,
      },
    })
  );

  await devBOfferPromise;

  // Step 4: WebRTC Answer Relay (B -> A)
  const devAAnswerPromise = new Promise((resolve) => {
    wsA.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'webrtc-answer') {
        console.log('✓ Device A received relayed webrtc-answer from Device B');
        resolve(msg);
      }
    });
  });

  wsB.send(
    JSON.stringify({
      type: 'webrtc-answer',
      payload: {
        roomId: roomCode,
        sdp: { type: 'answer', sdp: 'v=0 dummy-answer-sdp' },
        senderId: devB.id,
        targetId: devA.id,
      },
    })
  );

  await devAAnswerPromise;

  // Step 5: WebRTC ICE candidate Relay (A -> B)
  const devBIcePromise = new Promise((resolve) => {
    wsB.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'webrtc-ice') {
        console.log('✓ Device B received relayed webrtc-ice candidate from Device A');
        resolve(msg);
      }
    });
  });

  wsA.send(
    JSON.stringify({
      type: 'webrtc-ice',
      payload: {
        roomId: roomCode,
        candidate: { candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 50000 typ host', sdpMid: '0' },
        senderId: devA.id,
        targetId: devB.id,
      },
    })
  );

  await devBIcePromise;

  // Step 6: Ping -> Pong
  const pongPromise = new Promise((resolve) => {
    wsA.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'pong') {
        console.log('✓ Device A received pong response');
        resolve(msg);
      }
    });
  });

  wsA.send(JSON.stringify({ type: 'ping', payload: {} }));
  await pongPromise;

  // Clean close
  wsA.close();
  wsB.close();
  await wait(200);
  console.log('✓ All WebSocket tests completed successfully');
}

async function run() {
  try {
    await testHttpEndpoints();
    await testWebSocketProtocol();
    console.log('\n=================================================');
    console.log('🎉 ALL CLOUDFLARE WORKER VALIDATION TESTS PASSED!');
    console.log('=================================================\n');
    await wait(200);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

run();
