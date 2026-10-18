import { createServer } from 'node:http';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import content from './content.json';
import academy from './academy.json';
import conference from './conference.json';
import registry from './registry.json';
const responses: Record<string, unknown> = { ...content, ...academy, ...conference };
export async function startFixtureServer(port = 0): Promise<{ origin: string; close(): Promise<void> }> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://127.0.0.1');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (url.pathname === '/health') { res.end('offline'); return; }
    if (url.pathname === '/assets/synthetic.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end(readFileSync(resolve(__dirname, 'assets/synthetic.svg'))); return; }
    res.setHeader('Content-Type', 'application/json');
    let payload = responses[url.pathname];
    if (url.pathname === '/pharmacists') payload = registry;
    if (/^\/pharmacists\/\d+$/.test(url.pathname)) payload = registry.find(p => p.id === Number(url.pathname.split('/').pop()));
    if (process.env.OFFLINE_FIXTURE_LOG) appendFileSync(process.env.OFFLINE_FIXTURE_LOG, JSON.stringify({ method: req.method, path: url.pathname, queryKeys: [...url.searchParams.keys()].sort(), status: payload === undefined ? 501 : req.method === 'GET' ? 200 : 500, payloadShape: Array.isArray(payload) ? `array:${payload.length}` : typeof payload }) + '\n');
    if (payload === undefined) { res.writeHead(501).end(JSON.stringify({ message: 'UNEXPECTED_FIXTURE_REQUEST', method: req.method, path: url.pathname })); return; }
    if (req.method !== 'GET') {
      // Explicit failure fixtures are in-memory only; this server has no forwarding path.
      const status = req.headers['x-fixture-status'] === '403' ? 403 : 500;
      res.writeHead(status).end(JSON.stringify({ message: 'Synthetic mutation failure' })); return;
    }
    res.end(JSON.stringify(payload));
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  return { origin: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
