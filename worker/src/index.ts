import { SignalingRoom, Env } from './signalingRoom';

export { SignalingRoom };

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
        },
      });
    }

    // Health check endpoints: GET / or GET /health
    if (
      request.method === 'GET' &&
      (url.pathname === '/' || url.pathname === '/health') &&
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
    ) {
      return new Response(
        JSON.stringify({
          name: 'DropLink Signaling Server',
          status: 'online',
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // WebSocket Upgrade routing to Durable Object
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      // Connect to unified room hub (droplink-global-hub)
      // All clients must share the same Durable Object instance so rooms can be created and joined reliably
      const doId = env.SIGNALING_ROOM.idFromName('droplink-global-hub');
      const stub = env.SIGNALING_ROOM.get(doId);

      return stub.fetch(request);
    }

    // Default 404 for unmatched routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
