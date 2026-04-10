import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DateTime } from 'luxon';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { authMiddleware, requireRole } from './auth.js';
import { clean } from './serialize.js';
import { Role, AttendanceStatus } from '@prisma/client';

function todayIso(tz: string) {
  return DateTime.now().setZone(tz).toFormat('yyyy-LL-dd');
}

export async function registerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---------- Common ----------
  app.get('/api/me', async (req) => {
    const user = req.user!;
    // Gather context
    const [managedOrgs, assistantOf, staffLinks] = await Promise.all([
      prisma.organization.findMany({ where: { managerId: user.id } }),
      prisma.assistant.findMany({
        where: { userId: user.id },
        include: { organization: true },
      }),
      prisma.staff.findMany({
        where: { userId: user.id },
        include: { organization: true },
      }),
    ]);
    return clean({
      user,
      managedOrgs,
      assistantOf,
      staffLinks,
    });
  });

  // ---------- Super Admin ----------
  app.get(
    '/api/admin/users',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async () => {
      const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
      return clean(users);
    },
  );

  app.post(
    '/api/admin/users/:id/role',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params);
      // Super admin only toggles MANAGER status. Assistant/Staff roles are
      // assigned automatically (manager adds an assistant -> ASSISTANT;
      // staff enters invite code -> STAFF).
      const body = z
        .object({ role: z.enum(['MANAGER', 'NONE']) })
        .parse(req.body);
      const id = Number(params.id);
      const updated = await prisma.user.update({
        where: { id },
        data: { role: body.role as Role },
      });
      return clean(updated);
    },
  );

  // ---------- Manager ----------
  app.get(
    '/api/manager/orgs',
    { preHandler: requireRole(Role.MANAGER) },
    async (req) => {
      const orgs = await prisma.organization.findMany({
        where: { managerId: req.user!.id },
        include: { _count: { select: { staff: true, assistants: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return clean(orgs);
    },
  );

  app.post(
    '/api/manager/orgs',
    { preHandler: requireRole(Role.MANAGER) },
    async (req) => {
      const body = z
        .object({
          name: z.string().min(1),
          markStartHour: z.number().int().min(0).max(23).default(7),
          markStartMin: z.number().int().min(0).max(59).default(0),
          markEndHour: z.number().int().min(0).max(23).default(8),
          markEndMin: z.number().int().min(0).max(59).default(0),
          timezone: z.string().default('Asia/Tashkent'),
        })
        .parse(req.body);
      const org = await prisma.organization.create({
        data: { ...body, managerId: req.user!.id },
      });
      return clean(org);
    },
  );

  app.get(
    '/api/manager/orgs/:id',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
        include: {
          staff: { orderBy: { createdAt: 'desc' } },
          assistants: { include: { user: true } },
        },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      return clean(org);
    },
  );

  app.put(
    '/api/manager/orgs/:id',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const body = z
        .object({
          name: z.string().min(1).optional(),
          markStartHour: z.number().int().min(0).max(23).optional(),
          markStartMin: z.number().int().min(0).max(59).optional(),
          markEndHour: z.number().int().min(0).max(23).optional(),
          markEndMin: z.number().int().min(0).max(59).optional(),
          timezone: z.string().optional(),
        })
        .parse(req.body);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      const updated = await prisma.organization.update({
        where: { id: org.id },
        data: body,
      });
      return clean(updated);
    },
  );

  app.delete(
    '/api/manager/orgs/:id',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      await prisma.organization.delete({ where: { id: org.id } });
      return { ok: true };
    },
  );

  // Add staff (no telegram link required)
  app.post(
    '/api/manager/orgs/:id/staff',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const body = z
        .object({
          fullName: z.string().min(1),
          position: z.string().optional(),
          phone: z.string().optional(),
          generateInvite: z.boolean().default(false),
        })
        .parse(req.body);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      const inviteCode = body.generateInvite
        ? crypto.randomBytes(6).toString('hex')
        : null;
      const staff = await prisma.staff.create({
        data: {
          organizationId: org.id,
          fullName: body.fullName,
          position: body.position ?? null,
          phone: body.phone ?? null,
          inviteCode,
        },
      });
      return clean(staff);
    },
  );

  app.post(
    '/api/manager/staff/:staffId/invite',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { staffId } = z.object({ staffId: z.string() }).parse(req.params);
      const staff = await prisma.staff.findUnique({
        where: { id: Number(staffId) },
        include: { organization: true },
      });
      if (!staff || staff.organization.managerId !== req.user!.id)
        return reply.code(404).send({ error: 'Not found' });
      const code = crypto.randomBytes(6).toString('hex');
      const updated = await prisma.staff.update({
        where: { id: staff.id },
        data: { inviteCode: code, userId: null },
      });
      return clean(updated);
    },
  );

  app.delete(
    '/api/manager/staff/:staffId',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { staffId } = z.object({ staffId: z.string() }).parse(req.params);
      const staff = await prisma.staff.findUnique({
        where: { id: Number(staffId) },
        include: { organization: true },
      });
      if (!staff || staff.organization.managerId !== req.user!.id)
        return reply.code(404).send({ error: 'Not found' });
      await prisma.staff.delete({ where: { id: staff.id } });
      return { ok: true };
    },
  );

  // Add assistant by telegram id (user must have started the bot first)
  app.post(
    '/api/manager/orgs/:id/assistants',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const body = z.object({ telegramId: z.string() }).parse(req.body);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(body.telegramId) },
      });
      if (!user)
        return reply.code(404).send({
          error: 'Пользователь не найден. Попросите его сначала запустить бота командой /start.',
        });
      const assistant = await prisma.assistant.upsert({
        where: {
          organizationId_userId: { organizationId: org.id, userId: user.id },
        },
        update: {},
        create: { organizationId: org.id, userId: user.id },
      });
      // Promote role if not already higher
      if (user.role === Role.NONE || user.role === Role.STAFF) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: Role.ASSISTANT },
        });
      }
      return clean(assistant);
    },
  );

  app.delete(
    '/api/manager/assistants/:id',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const asst = await prisma.assistant.findUnique({
        where: { id: Number(id) },
        include: { organization: true },
      });
      if (!asst || asst.organization.managerId !== req.user!.id)
        return reply.code(404).send({ error: 'Not found' });
      await prisma.assistant.delete({ where: { id: asst.id } });
      return { ok: true };
    },
  );

  // ---------- Assistant ----------
  app.get(
    '/api/assistant/orgs',
    { preHandler: requireRole(Role.ASSISTANT) },
    async (req) => {
      const assistants = await prisma.assistant.findMany({
        where: { userId: req.user!.id },
        include: { organization: true },
      });
      return clean(assistants.map((a) => a.organization));
    },
  );

  app.get(
    '/api/assistant/orgs/:id/today',
    { preHandler: requireRole(Role.ASSISTANT) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const orgId = Number(id);
      const check = await prisma.assistant.findFirst({
        where: { organizationId: orgId, userId: req.user!.id },
      });
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org || !check)
        return reply.code(403).send({ error: 'Forbidden' });
      const date = todayIso(org.timezone);
      const staff = await prisma.staff.findMany({
        where: { organizationId: orgId, active: true },
        orderBy: { fullName: 'asc' },
      });
      const attendance = await prisma.attendance.findMany({
        where: { organizationId: orgId, date },
      });
      const map = new Map(attendance.map((a) => [a.staffId, a]));
      const now = DateTime.now().setZone(org.timezone);
      const start = now.set({
        hour: org.markStartHour,
        minute: org.markStartMin,
        second: 0,
      });
      const end = now.set({
        hour: org.markEndHour,
        minute: org.markEndMin,
        second: 0,
      });
      const isOpen = now >= start && now <= end;
      return clean({
        org,
        date,
        isOpen,
        windowStart: start.toISO(),
        windowEnd: end.toISO(),
        now: now.toISO(),
        staff: staff.map((s) => ({
          ...s,
          status: map.get(s.id)?.status || null,
        })),
      });
    },
  );

  app.post(
    '/api/assistant/orgs/:id/mark',
    { preHandler: requireRole(Role.ASSISTANT) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const body = z
        .object({
          staffId: z.number().int(),
          status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
        })
        .parse(req.body);
      const orgId = Number(id);
      const check = await prisma.assistant.findFirst({
        where: { organizationId: orgId, userId: req.user!.id },
      });
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org || !check)
        return reply.code(403).send({ error: 'Forbidden' });
      const now = DateTime.now().setZone(org.timezone);
      const end = now.set({
        hour: org.markEndHour,
        minute: org.markEndMin,
        second: 0,
      });
      if (now > end) {
        return reply.code(400).send({ error: 'Окно уже закрыто на сегодня' });
      }
      const date = todayIso(org.timezone);
      const attendance = await prisma.attendance.upsert({
        where: { staffId_date: { staffId: body.staffId, date } },
        update: {
          status: body.status as AttendanceStatus,
          markedById: req.user!.id,
        },
        create: {
          organizationId: orgId,
          staffId: body.staffId,
          date,
          status: body.status as AttendanceStatus,
          markedById: req.user!.id,
        },
      });
      return clean(attendance);
    },
  );

  // ---------- Staff ----------
  app.get('/api/staff/history', async (req) => {
    const staffLinks = await prisma.staff.findMany({
      where: { userId: req.user!.id },
      include: {
        organization: true,
        attendance: { orderBy: { date: 'desc' }, take: 60 },
      },
    });
    return clean(staffLinks);
  });

  // ---------- Reports (for manager) ----------
  app.get(
    '/api/manager/orgs/:id/report',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const query = z
        .object({ date: z.string().optional() })
        .parse(req.query);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      const date = query.date || todayIso(org.timezone);
      const [staff, attendance] = await Promise.all([
        prisma.staff.findMany({
          where: { organizationId: org.id, active: true },
          orderBy: { fullName: 'asc' },
        }),
        prisma.attendance.findMany({
          where: { organizationId: org.id, date },
        }),
      ]);
      const map = new Map(attendance.map((a) => [a.staffId, a.status]));
      return clean({
        org,
        date,
        rows: staff.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          position: s.position,
          status: map.get(s.id) || 'ABSENT',
        })),
      });
    },
  );
}
