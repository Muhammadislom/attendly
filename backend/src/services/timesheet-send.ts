import { generateTimesheetXlsx } from './timesheet.js';
import { bot } from '../bot/index.js';
import { t, BotLang } from '../bot/i18n.js';

export async function sendTimesheetToUser(opts: {
  orgId: number;
  from: string;
  to: string;
  telegramId: bigint;
  lang: BotLang;
}): Promise<void> {
  const { buffer, filename } = await generateTimesheetXlsx(
    opts.orgId,
    opts.from,
    opts.to,
  );
  await bot.telegram.sendDocument(
    String(opts.telegramId),
    { source: buffer, filename },
    { caption: t(opts.lang, 'tabel.caption', opts.from, opts.to) },
  );
}
