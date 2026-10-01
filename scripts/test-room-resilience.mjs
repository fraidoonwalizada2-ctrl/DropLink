import http from 'http';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';

const PORT = 3099;
const SERVER_URL = `ws://127.0.0.1:${PORT}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws, type, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for message type: ${type}`));
    }, timeoutMs);

    const onMessage = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === type) {
          clearTimeout(timer);
          ws.off('message', onMessage);
          resolve(msg);
        }
      } catch (err) {
        // ignore parse error
      }
    };

    ws.on('message', onMessage);
  });
}

async function runTests() {
  console.log('--- Starting DropLink Room Lifecycle & Resilience Test ---');

  // Start server on test port
  const serverProcess = spawn('node', ['server/dist/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => process.stdout.write('[Server] ' + d));
  serverProcess.stderr.on('data', (d) => process.stderr.write('[Server Err] ' + d));

  // Give server 2 seconds to start
  await sleep(2500);

  try {
    // 1. Device A connects and creates room
    console.log('[Test 1] Device A connects and creates room...');
    const wsA1 = await createClient(SERVER_URL);
    const devA = { id: 'dev_host_1', name: 'Device A (Host)', type: 'desktop', os: 'windows', browser: 'chrome', status: 'connected', joinedAt: Date.now() };

    const createPromise = waitForMessage(wsA1, 'room-created');
    wsA1.send(JSON.stringify({ type: 'create-room', payload: { device: devA }, requestId: 'req_1' }));
    const createMsg = await createPromise;
    const roomCode = createMsg.payload.room.id;
    console.log(`✓ Room created with code: ${roomCode}`);

    // 2. Device A disconnects (simulating page reload, navigation, or socket blip)
    console.log('[Test 2] Simulating Device A socket close (page reload/navigation)...');
    wsA1.close();
    await sleep(500);

    // 3. Device B connects and joins the room with the code
    console.log('[Test 3] Device B joins the room while Device A is disconnected...');
    const wsB = await createClient(SERVER_URL);
    const devB = { id: 'dev_guest_2', name: 'Device B (Phone)', type: 'mobile', os: 'ios', browser: 'safari', status: 'connected', joinedAt: Date.now() };

    const joinBPromise = waitForMessage(wsB, 'room-joined');
    wsB.send(JSON.stringify({ type: 'join-room', payload: { roomCode, device: devB }, requestId: 'req_2' }));
    const joinBMsg = await joinBPromise;
    console.log(`✓ Device B successfully joined room: ${joinBMsg.payload.room.id}. Room was preserved despite Device A disconnect!`);

    // 4. Device A reconnects (e.g. page finished loading / socket reconnected)
    console.log('[Test 4] Device A reconnects with same deviceId and rejoins room...');
    const wsA2 = await createClient(SERVER_URL);
    const joinA2Promise = waitForMessage(wsA2, 'room-joined');
    const bSeesDeviceJoined = waitForMessage(wsB, 'device-joined');

    wsA2.send(JSON.stringify({ type: 'join-room', payload: { roomCode, device: devA }, requestId: 'req_3' }));
    const joinA2Msg = await joinA2Promise;
    const devJoinedOnB = await bSeesDeviceJoined;
    console.log(`✓ Device A re-joined room: ${joinA2Msg.payload.room.id}. Device B received device-joined for: ${devJoinedOnB.payload.device.name}`);

    // 5. Host closes room explicitly
    console.log('[Test 5] Host explicitly closes room...');
    const bSeesRoomClosed = waitForMessage(wsB, 'room-closed');
    wsA2.send(JSON.stringify({ type: 'close-room', payload: { roomId: roomCode, deviceId: devA.id } }));
    const closeMsg = await bSeesRoomClosed;
    console.log(`✓ Device B received room-closed notification: ${closeMsg.payload.reason}`);

    // 6. Verify room is now destroyed
    console.log('[Test 6] Verify room code is no longer joinable after host closed it...');
    const wsC = await createClient(SERVER_URL);
    const devC = { id: 'dev_guest_3', name: 'Device C', type: 'desktop', os: 'windows', browser: 'edge', status: 'connected', joinedAt: Date.now() };
    const errPromise = waitForMessage(wsC, 'error');
    wsC.send(JSON.stringify({ type: 'join-room', payload: { roomCode, device: devC }, requestId: 'req_4' }));
    const errMsg = await errPromise;
    console.log(`✓ Join correctly rejected after explicit close: ${errMsg.payload.errorType}`);

    wsA2.close();
    wsB.close();
    wsC.close();

    console.log('\n=============================================');
    console.log('🎉 ALL ROOM LIFECYCLE & RESILIENCE TESTS PASSED!');
    console.log('=============================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  } finally {
    serverProcess.kill();
  }
}

runTests();
