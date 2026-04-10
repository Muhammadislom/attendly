import { DateTime } from 'luxon';
import { prisma } from '../db.js';
import { bot } from '../bot/index.js';
import { AttendanceStatus } from '@prisma/client';

function statusEmoji(s: AttendanceStatus | null) {
  if (s === 'PRESENT') return '✅';
  if (s === 'LATE') return '🟡';
  return '❌';
}

function statusText(s: AttendanceStatus | null) {
  if (s === 'PRESENT') return 'Пришёл';
  if (s === 'LATE') return 'Опоздал';
  return 'Отсутствует';
}

export async function sendDailyReport(orgId: number) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { manager: true },
  });
  if (!org || !org.manager?.telegramId) return;
  const date = DateTime.now().setZone(org.timezone).toFormat('yyyy-LL-dd');
  const staff = await prisma.staff.findMany({
    where: { organizationId: org.id, active: true },
    orderBy: { fullName: 'asc' },
  });
  const attendance = await prisma.attendance.findMany({
    where: { organizationId: org.id, date },
  });
  const map = new Map(attendance.map((a) => [a.staffId, a.status]));

  const present = staff.filter((s) => map.get(s.id) === 'PRESENT').length;
  const late = staff.filter((s) => map.get(s.id) === 'LATE').length;
  const absent = staff.length - present - late;

  const lines: string[] = [];
  lines.push(`📊 *Отчёт по посещаемости*`);
  lines.push(`🏢 ${org.name}`);
  lines.push(`📅 ${date}`);
  lines.push('');
  lines.push(`✅ Пришли: *${present}*`);
  lines.push(`🟡 Опоздали: *${late}*`);
  lines.push(`❌ Отсутствуют: *${absent}*`);
  lines.push(`👥 Всего: *${staff.length}*`);
  lines.push('');
  lines.push('*Детали:*');
  for (const s of staff) {
    const st = map.get(s.id) || null;
    lines.push(`${statusEmoji(st)} ${escapeMd(s.fullName)} — _${statusText(st)}_`);
  }

  try {
    await bot.telegram.sendMessage(
      String(org.manager.telegramId),
      lines.join('\n'),
      { parse_mode: 'Markdown' },
    );
    await prisma.organization.update({
      where: { id: org.id },
      data: { lastReportSent: new Date() },
    });
  } catch (err) {
    console.error('Failed to send report', err);
  }
}

function escapeMd(s: string): string {
  return s.replace(/([_*`\[])/g, '\\$1');
}
