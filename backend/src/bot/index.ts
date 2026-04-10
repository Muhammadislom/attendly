import { Telegraf, Markup } from 'telegraf';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { Role } from '@prisma/client';
import { pickLang, t } from './i18n.js';

export const bot = new Telegraf(config.botToken);

async function upsertUser(ctx: any) {
  const from = ctx.from;
  if (!from) return null;
  const isSuper =
    config.superAdminId !== 0n && BigInt(from.id) === config.superAdminId;
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
  const lang = pickLang(ctx.from?.language_code);

  const greeting =
    user.role === Role.SUPER_ADMIN
      ? t(lang, 'start.superAdmin')
      : user.role === Role.MANAGER
      ? t(lang, 'start.manager')
      : user.role === Role.ASSISTANT
      ? t(lang, 'start.assistant')
      : user.role === Role.STAFF
      ? t(lang, 'start.staff')
      : t(lang, 'start.none');

  if (config.webappUrl) {
    await ctx.reply(
      greeting,
      Markup.keyboard([
        [Markup.button.webApp(t(lang, 'btn.openApp'), config.webappUrl)],
      ]).resize(),
    );
  } else {
    await ctx.reply(greeting + t(lang, 'start.webappNotSet'));
  }
});

bot.command('app', async (ctx) => {
  const lang = pickLang(ctx.from?.language_code);
  if (!config.webappUrl) {
    return ctx.reply(t(lang, 'app.webappNotSet'));
  }
  await ctx.reply(
    t(lang, 'app.openAppPrompt'),
    Markup.inlineKeyboard([
      Markup.button.webApp(t(lang, 'btn.open'), config.webappUrl),
    ]),
  );
});

bot.command('id', async (ctx) => {
  const lang = pickLang(ctx.from?.language_code);
  await ctx.reply(t(lang, 'id.yours', ctx.from.id), { parse_mode: 'Markdown' });
});

// Link a staff profile via invite code sent as plain text
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  if (!/^link:[a-zA-Z0-9]{6,}$/.test(text)) return next?.();
  const lang = pickLang(ctx.from?.language_code);
  const code = text.slice(5);
  const staff = await prisma.staff.findUnique({ where: { inviteCode: code } });
  if (!staff) {
    return ctx.reply(t(lang, 'link.notFound'));
  }
  if (staff.userId) {
    return ctx.reply(t(lang, 'link.alreadyLinked'));
  }
  const user = await upsertUser(ctx);
  if (!user) return;
  await prisma.staff.update({
    where: { id: staff.id },
    data: { userId: user.id, inviteCode: null },
  });
  // Make sure role is at least STAFF if not greater
  if (user.role === Role.NONE) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.STAFF },
    });
  }
  await ctx.reply(t(lang, 'link.success', staff.fullName));
});

export async function startBot() {
  // Set the default chat menu button to a Web App button so every user gets
  // an always-visible "Open" button next to the chat input that launches the
  // WebApp WITH proper initData. This is the most reliable entry point — it
  // doesn't depend on the user tapping the right reply-keyboard button, and
  // it overrides any stale BotFather "menu button" configuration that might
  // have been set up without web_app metadata.
  if (config.webappUrl) {
    try {
      // Use neutral "Open" label (Telegram will show this as-is to every user).
      // Per-user localization of reply-keyboard/inline buttons still happens
      // on each message via the i18n helper above.
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: 'Open',
          web_app: { url: config.webappUrl },
        },
      });
      console.log('📱 Chat menu button set to WebApp:', config.webappUrl);
    } catch (err: any) {
      console.warn('⚠️ Failed to set chat menu button:', err?.message || err);
    }
  }

  // launch() never resolves while polling is running. We intentionally do NOT
  // await it so the rest of the server can boot. But we MUST attach a catch
  // handler — otherwise a Telegram API error (e.g. 409 Conflict during a
  // zero-downtime redeploy when the previous instance still holds getUpdates)
  // becomes an unhandled rejection and crashes the process, taking the API and
  // WebApp down with it.
  bot
    .launch({ dropPendingUpdates: true })
    .catch((err) => {
      console.error('🤖 Telegram bot crashed:', err?.message || err);
      // Don't exit — keep API + WebApp alive. Railway will redeploy if needed.
    });
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  console.log('🤖 Telegram bot started');
}
