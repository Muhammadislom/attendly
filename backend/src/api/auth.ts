import crypto from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { Role, User } from '@prisma/client';

// Verify Telegram WebApp initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyInitData(initData: string): Record<string, string> | null {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return null;
  urlParams.delete('hash');

  const dataCheckString = [...urlParams.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.botToken)
    .digest();

  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computed !== hash) return null;

  // Optional freshness check (24h)
  const authDate = Number(urlParams.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  return Object.fromEntries(urlParams.entries());
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  // Only protect /api/* routes. Public routes (/, /health, static assets, SPA fallback)
  // must pass through without Telegram initData so Railway healthcheck and the WebApp
  // HTML itself can load.
  if (!req.url.startsWith('/api/')) return;

  const initData = req.headers['x-telegram-init-data'];
  if (typeof initData !== 'string') {
    return reply.code(401).send({ error: 'Missing initData' });
  }
  const data = verifyInitData(initData);
  if (!data) {
    return reply.code(401).send({ error: 'Invalid initData' });
  }
  let tgUser: any;
  try {
    tgUser = JSON.parse(data.user || '{}');
  } catch {
    return reply.code(401).send({ error: 'Invalid user payload' });
  }
  if (!tgUser.id) return reply.code(401).send({ error: 'No user id' });

  const isSuper = BigInt(tgUser.id) === config.superAdminId;
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(tgUser.id) },
    update: {
      firstName: tgUser.first_name ?? '',
      lastName: tgUser.last_name ?? null,
      username: tgUser.username ?? null,
      ...(isSuper ? { role: Role.SUPER_ADMIN } : {}),
    },
    create: {
      telegramId: BigInt(tgUser.id),
      firstName: tgUser.first_name ?? '',
      lastName: tgUser.last_name ?? null,
      username: tgUser.username ?? null,
      role: isSuper ? Role.SUPER_ADMIN : Role.NONE,
    },
  });

  req.user = user;
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
