import { Telegraf, Markup } from 'telegraf';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { Role } from '@prisma/client';

export const bot = new Telegraf(config.botToken);

async function upsertUser(ctx: any) {
  const from = ctx.from;
  if (!from) return null;
  const isSuper = BigInt(from.id) === config.superAdminId;
  return prisma.user.upsert({
    where: { telegramId: BigInt(from.id) },
    update: {
      firstName: from.first_name ?? '',
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      ...(isSuper ? { role: Role.SUPER_ADMIN } : {}),
    },
    create: {
      telegramId: BigInt(from.id),
      firstName: from.first_name ?? '',
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      role: isSuper ? Role.SUPER_ADMIN : Role.NONE,
    },
  });
}

bot.start(async (ctx) => {
  const user = await upsertUser(ctx);
  if (!user) return;

  const greeting =
    user.role === Role.SUPER_ADMIN
      ? 'Добро пожаловать, супер-админ!\n\nОткройте приложение для управления пользователями и назначения управляющих.'
      : user.role === Role.MANAGER
      ? 'Добро пожаловать, управляющий!\n\nОткройте приложение для управления организациями, сотрудниками и ассистентами.'
      : user.role === Role.ASSISTANT
      ? 'Добро пожаловать, ассистент!\n\nОткройте приложение чтобы отметить посещаемость сегодня.'
      : user.role === Role.STAFF
      ? 'Добро пожаловать!\n\nОткройте приложение чтобы посмотреть свои посещения.'
      : 'Привет! Вы зарегистрированы. Если управляющий добавит вас в организацию — откройте приложение.';

  await ctx.reply(
    greeting,
    Markup.keyboard([
      [Markup.button.webApp('📱 Открыть приложение', config.webappUrl)],
    ]).resize(),
  );
});

bot.command('app', async (ctx) => {
  await ctx.reply(
    'Откройте приложение:',
    Markup.inlineKeyboard([
      Markup.button.webApp('📱 Открыть', config.webappUrl),
    ]),
  );
});

bot.command('id', async (ctx) => {
  await ctx.reply(`Ваш Telegram ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// Link a staff profile via invite code sent as plain text
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  if (!/^link:[a-zA-Z0-9]{6,}$/.test(text)) return next?.();
  const code = text.slice(5);
  const staff = await prisma.staff.findUnique({ where: { inviteCode: code } });
  if (!staff) {
    return ctx.reply('Код не найден или уже использован.');
  }
  if (staff.userId) {
    return ctx.reply('Этот профиль уже привязан.');
  }
  const user = await upsertUser(ctx);
  if (!user) return;
  await prisma.staff.update({
    where: { id: staff.id },
    data: { userId: user.id, inviteCode: null },
  });
  // Make sure role is at least STAFF if not greater
  if (user.role === Role.NONE) {
    await prisma.user.update({ where: { id: user.id }, data: { role: Role.STAFF } });
  }
  await ctx.reply(`Аккаунт успешно привязан к профилю: ${staff.fullName}`);
});

export async function startBot() {
  bot.launch();
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  console.log('🤖 Telegram bot started');
}
