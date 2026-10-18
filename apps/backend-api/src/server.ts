import 'dotenv/config';
import { buildApp } from './app';
import { getServerConfig } from './config/server';

async function start() {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  try {
    const config = getServerConfig();
    app = await buildApp({ config });
    const shutdown = async () => {
      try { await app!.close(); }
      catch { console.error('Backend shutdown failed'); process.exitCode = 1; }
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    await app.listen({ host: '0.0.0.0', port: config.port });
    console.info('Backend listening');
  } catch {
    console.error('Backend startup failed; check server configuration and availability');
    try { await app?.close(); } catch { /* Startup failure remains the reported error. */ }
    process.exitCode = 1;
  }
}

if (require.main === module) void start();
