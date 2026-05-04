import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DateTime } from 'luxon';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { authMiddleware, requireRole } from './auth.js';
import { clean } from './serialize.js';
import { bot } from '../bot/index.js';
import { Role, AttendanceStatus } from '@prisma/client';

function todayIso(tz: string) {
  return DateTime.now().setZone(tz).toFormat('yyyy-LL-dd');
}

// Returns an error message if the mark window range is invalid
// (end must be strictly later than start in the same day), or null if OK.
function validateWindow(
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
): string | null {
  if (endHour * 60 + endMin <= startHour * 60 + startMin) {
    return 'Время окончания должно быть позже времени начала';
  }
  return null;
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
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              managedOrgs: true,
              assistantOf: true,
              staffLink: true,
            },
          },
        },
      });
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
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return reply.code(404).send({ error: 'Not found' });
      // Refuse to change SUPER_ADMIN through this endpoint.
      if (target.role === Role.SUPER_ADMIN) {
        return reply.code(400).send({ error: 'Нельзя изменить супер-админа' });
      }
      // Assistants cannot be promoted to manager — they have active duties
      // in organizations they assist. Manager must remove them from every
      // org first; then their role drops back to NONE and promotion is OK.
      if (body.role === 'MANAGER' && target.role === Role.ASSISTANT) {
        return reply.code(400).send({
          error:
            'Ассистент не может быть назначен управляющим. Сначала уберите его из всех организаций.',
        });
      }
      const updated = await prisma.user.update({
        where: { id },
        data: { role: body.role as Role },
      });
      return clean(updated);
    },
  );

  // System-wide overview for super admin: counts of users by role,
  // organizations, staff, today's attendance entries.
  app.get(
    '/api/admin/stats',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async () => {
      const [
        totalUsers,
        totalOrgs,
        totalStaff,
        totalAssistants,
        usersByRole,
        todayAttendance,
        recentUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.staff.count({ where: { active: true } }),
        prisma.assistant.count(),
        prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        prisma.attendance.count({
          where: { date: DateTime.now().setZone('Asia/Tashkent').toFormat('yyyy-LL-dd') },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: DateTime.now().minus({ days: 7 }).toJSDate() },
          },
        }),
      ]);
      const byRole: Record<string, number> = {
        SUPER_ADMIN: 0,
        MANAGER: 0,
        ASSISTANT: 0,
        STAFF: 0,
        NONE: 0,
      };
      for (const row of usersByRole) {
        byRole[row.role] = row._count._all;
      }
      return {
        totalUsers,
        totalOrgs,
        totalStaff,
        totalAssistants,
        todayAttendance,
        recentUsers,
        byRole,
      };
    },
  );

  // List of every organization in the system with its manager.
  app.get(
    '/api/admin/orgs',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async () => {
      const orgs = await prisma.organization.findMany({
        include: {
          manager: true,
          _count: { select: { staff: true, assistants: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return clean(orgs);
    },
  );

  // Read-only org detail for super admin: full org with manager, staff,
  // assistants, and today's attendance roll-up.
  app.get(
    '/api/admin/orgs/:id',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const org = await prisma.organization.findUnique({
        where: { id: Number(id) },
        include: {
          manager: true,
          staff: { orderBy: { fullName: 'asc' } },
          assistants: { include: { user: true } },
        },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });
      const date = todayIso(org.timezone);
      const attendance = await prisma.attendance.findMany({
        where: { organizationId: org.id, date },
      });
      const map = new Map(attendance.map((a) => [a.staffId, a.status]));
      const present = attendance.filter((a) => a.status === 'PRESENT').length;
      const late = attendance.filter((a) => a.status === 'LATE').length;
      const absent = attendance.filter((a) => a.status === 'ABSENT').length;
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
      return clean({
        org,
        date,
        windowStart: start.toISO(),
        windowEnd: end.toISO(),
        isOpen: now >= start && now <= end,
        staffWithStatus: org.staff.map((s) => ({
          ...s,
          status: map.get(s.id) || null,
        })),
        summary: {
          total: org.staff.length,
          present,
          late,
          absent,
          unmarked: org.staff.length - present - late - absent,
        },
      });
    },
  );

  // Read-only user detail for super admin: full profile with all the
  // organizations they manage, assist, and work in.
  app.get(
    '/api/admin/users/:id',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        include: {
          managedOrgs: {
            include: { _count: { select: { staff: true } } },
            orderBy: { createdAt: 'desc' },
          },
          assistantOf: { include: { organization: true } },
          staffLink: {
            include: {
              organization: true,
              attendance: { orderBy: { date: 'desc' }, take: 30 },
            },
          },
        },
      });
      if (!user) return reply.code(404).send({ error: 'Not found' });
      return clean(user);
    },
  );

  // Today's marking status across every organization in the system.
  // Useful for super admin to see who has and hasn't started yet.
  app.get(
    '/api/admin/today',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async () => {
      const orgs = await prisma.organization.findMany({
        include: {
          manager: true,
          _count: { select: { staff: true } },
        },
        orderBy: { name: 'asc' },
      });
      const result = await Promise.all(
        orgs.map(async (org) => {
          const date = todayIso(org.timezone);
          const [marked, totalStaff] = await Promise.all([
            prisma.attendance.count({
              where: { organizationId: org.id, date },
            }),
            prisma.staff.count({
              where: { organizationId: org.id, active: true },
            }),
          ]);
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
          let windowState: 'before' | 'open' | 'after';
          if (now < start) windowState = 'before';
          else if (now > end) windowState = 'after';
          else windowState = 'open';
          return {
            id: org.id,
            name: org.name,
            timezone: org.timezone,
            markStartHour: org.markStartHour,
            markStartMin: org.markStartMin,
            markEndHour: org.markEndHour,
            markEndMin: org.markEndMin,
            manager: {
              id: org.manager.id,
              firstName: org.manager.firstName,
              lastName: org.manager.lastName,
              username: org.manager.username,
            },
            totalStaff,
            marked,
            windowState,
            date,
          };
        }),
      );
      return clean(result);
    },
  );

  // Recent activity feed for super admin: latest signups, new orgs,
  // and attendance marks. Synthesised from existing tables — no audit
  // log table needed.
  app.get(
    '/api/admin/activity',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async () => {
      const [users, orgs, marks] = await Promise.all([
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
        prisma.organization.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: { manager: true },
        }),
        prisma.attendance.findMany({
          orderBy: { markedAt: 'desc' },
          take: 25,
          include: { staff: true, organization: true },
        }),
      ]);
      // Resolve marker names for attendance entries
      const markerIds = [...new Set(marks.map((m) => m.markedById).filter(Boolean))] as number[];
      const markerUsers = markerIds.length
        ? await prisma.user.findMany({ where: { id: { in: markerIds } } })
        : [];
      const markerMap = new Map(markerUsers.map((u) => [u.id, u]));
      type Event = {
        type: 'user' | 'org' | 'mark';
        at: string;
        title: string;
        subtitle: string;
        meta?: any;
      };
      const events: Event[] = [];
      for (const u of users) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          u.username ||
          `id ${u.telegramId}`;
        events.push({
          type: 'user',
          at: u.createdAt.toISOString(),
          title: name,
          subtitle: u.username ? `@${u.username}` : `id ${u.telegramId}`,
          meta: { userId: u.id, role: u.role },
        });
      }
      for (const o of orgs) {
        const mgrName =
          [o.manager.firstName, o.manager.lastName].filter(Boolean).join(' ') ||
          o.manager.username ||
          `id ${o.manager.telegramId}`;
        events.push({
          type: 'org',
          at: o.createdAt.toISOString(),
          title: o.name,
          subtitle: mgrName,
          meta: { orgId: o.id, managerId: o.manager.id },
        });
      }
      for (const m of marks) {
        const marker = m.markedById ? markerMap.get(m.markedById) : null;
        const markerName = marker
          ? [marker.firstName, marker.lastName].filter(Boolean).join(' ') ||
            marker.username ||
            `id ${marker.telegramId}`
          : '?';
        events.push({
          type: 'mark',
          at: m.markedAt.toISOString(),
          title: `${m.staff.fullName} — ${m.status}`,
          subtitle: `${m.organization.name} · ${markerName}`,
          meta: {
            orgId: m.organizationId,
            staffId: m.staffId,
            status: m.status,
          },
        });
      }
      events.sort((a, b) => (a.at < b.at ? 1 : -1));
      return events.slice(0, 40);
    },
  );

  // Organizations with no attendance recorded in the last 7 days.
  app.get(
    '/api/admin/inactive-orgs',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async () => {
      const orgs = await prisma.organization.findMany({
        include: {
          manager: true,
          _count: { select: { staff: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const sevenDaysAgo = DateTime.now()
        .minus({ days: 7 })
        .toFormat('yyyy-LL-dd');
      const result = [];
      for (const org of orgs) {
        const recent = await prisma.attendance.findFirst({
          where: { organizationId: org.id, date: { gte: sevenDaysAgo } },
        });
        if (recent) continue;
        const last = await prisma.attendance.findFirst({
          where: { organizationId: org.id },
          orderBy: { markedAt: 'desc' },
        });
        result.push({
          id: org.id,
          name: org.name,
          createdAt: org.createdAt.toISOString(),
          totalStaff: org._count.staff,
          lastMarkAt: last?.markedAt?.toISOString() || null,
          manager: {
            id: org.manager.id,
            firstName: org.manager.firstName,
            lastName: org.manager.lastName,
            username: org.manager.username,
          },
        });
      }
      return result;
    },
  );

  // Broadcast a plain-text message to every user in the system, optionally
  // filtered by role. The bot sends sequentially with a small delay so we
  // stay well under Telegram's 30 msg/sec rate limit; per-user errors
  // (blocked bot, deleted account, etc.) are counted, not raised.
  app.post(
    '/api/admin/broadcast',
    { preHandler: requireRole(Role.SUPER_ADMIN) },
    async (req, reply) => {
      const body = z
        .object({
          text: z.string().min(1).max(4000),
          target: z
            .enum(['ALL', 'MANAGER', 'ASSISTANT', 'STAFF', 'NONE'])
            .default('ALL'),
        })
        .parse(req.body);
      const where =
        body.target === 'ALL' ? {} : { role: body.target as Role };
      const users = await prisma.user.findMany({
        where,
        select: { id: true, telegramId: true },
      });
      let sent = 0;
      let failed = 0;
      for (const u of users) {
        try {
          await bot.telegram.sendMessage(String(u.telegramId), body.text);
          sent++;
        } catch {
          failed++;
        }
        // ~25 messages per second to stay under the 30/sec limit
        await new Promise((r) => setTimeout(r, 40));
      }
      return reply.send({ total: users.length, sent, failed });
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
    async (req, reply) => {
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
      const err = validateWindow(
        body.markStartHour,
        body.markStartMin,
        body.markEndHour,
        body.markEndMin,
      );
      if (err) return reply.code(400).send({ error: err });
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
      const err = validateWindow(
        body.markStartHour ?? org.markStartHour,
        body.markStartMin ?? org.markStartMin,
        body.markEndHour ?? org.markEndHour,
        body.markEndMin ?? org.markEndMin,
      );
      if (err) return reply.code(400).send({ error: err });
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

  app.patch(
    '/api/manager/staff/:staffId',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { staffId } = z.object({ staffId: z.string() }).parse(req.params);
      const body = z
        .object({
          fullName: z.string().min(1).optional(),
          position: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
        })
        .parse(req.body);
      const staff = await prisma.staff.findUnique({
        where: { id: Number(staffId) },
        include: { organization: true },
      });
      if (!staff || staff.organization.managerId !== req.user!.id)
        return reply.code(404).send({ error: 'Not found' });
      const updated = await prisma.staff.update({
        where: { id: staff.id },
        data: {
          ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
          ...(body.position !== undefined
            ? { position: body.position || null }
            : {}),
          ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        },
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

  // Add assistant by @username or numeric telegram id. User must have run
  // /start in the bot at least once so we have them in our DB.
  app.post(
    '/api/manager/orgs/:id/assistants',
    { preHandler: requireRole(Role.MANAGER) },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const body = z
        .object({ identifier: z.string().min(1) })
        .parse(req.body);
      const org = await prisma.organization.findFirst({
        where: { id: Number(id), managerId: req.user!.id },
      });
      if (!org) return reply.code(404).send({ error: 'Not found' });

      // Accept "@username", "username", or numeric telegram id
      const raw = body.identifier.trim().replace(/^@/, '');
      let user = null;
      if (/^\d+$/.test(raw)) {
        user = await prisma.user.findUnique({
          where: { telegramId: BigInt(raw) },
        });
      } else {
        user = await prisma.user.findFirst({
          where: { username: { equals: raw, mode: 'insensitive' } },
        });
      }
      if (!user)
        return reply.code(404).send({
          error:
            'Пользователь не найден. Попросите его открыть бота и нажать /start, затем повторите.',
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
