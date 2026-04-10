import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { startBot } from './bot/index.js';
import { registerRoutes } from './api/routes.js';
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true }));

  await registerRoutes(app);

  await app.listen({ port: config.port, host: config.host });
  console.log(`🚀 API listening on http://${config.host}:${config.port}`);

  await startBot();
  startScheduler();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
