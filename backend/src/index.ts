import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { startBot } from './bot/index.js';
import { registerRoutes } from './api/routes.js';
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true }));

  await registerRoutes(app);

  // Serve the built frontend from /public (sibling of dist in the Docker image)
  const publicDir = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
      wildcard: false,
      decorateReply: false,
    });
    // SPA fallback: any non-API route serves index.html
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/health')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.type('text/html').send(
        fs.readFileSync(path.join(publicDir, 'index.html')),
      );
    });
    console.log(`📦 Serving frontend from ${publicDir}`);
  } else {
    console.log('ℹ️  No public/ directory found, skipping static frontend');
  }

  await app.listen({ port: config.port, host: config.host });
  console.log(`🚀 API listening on http://${config.host}:${config.port}`);

  await startBot();
  startScheduler();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
