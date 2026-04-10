// Simple per-user i18n for bot replies. Picks the user's language from
// Telegram's `language_code` (e.g. "ru", "uz", "uz-UZ"). Falls back to ru.

export type BotLang = 'ru' | 'uz';

export function pickLang(code: string | undefined | null): BotLang {
  if (code && code.toLowerCase().startsWith('uz')) return 'uz';
  return 'ru';
}

const dict = {
  ru: {
    'start.superAdmin':
      'Добро пожаловать, супер-админ!\n\nОткройте приложение для управления пользователями и назначения управляющих.',
    'start.manager':
      'Добро пожаловать, управляющий!\n\nОткройте приложение для управления организациями, сотрудниками и ассистентами.',
    'start.assistant':
      'Добро пожаловать, ассистент!\n\nОткройте приложение чтобы отметить посещаемость сегодня.',
    'start.staff':
      'Добро пожаловать!\n\nОткройте приложение чтобы посмотреть свои посещения.',
    'start.none':
      'Привет! Вы зарегистрированы. Если управляющий добавит вас в организацию — откройте приложение.',
    'start.webappNotSet': '\n\n⚠️ WebApp ещё не настроен администратором.',
    'app.webappNotSet': '⚠️ WebApp ещё не настроен.',
    'app.openAppPrompt': 'Откройте приложение:',
    'btn.openApp': '📱 Открыть приложение',
    'btn.open': '📱 Открыть',
    'id.yours': 'Ваш Telegram ID: `{0}`',
    'link.notFound': 'Код не найден или уже использован.',
    'link.alreadyLinked': 'Этот профиль уже привязан.',
    'link.success': 'Аккаунт успешно привязан к профилю: {0}',
  },
  uz: {
    'start.superAdmin':
      'Xush kelibsiz, super admin!\n\nFoydalanuvchilarni boshqarish va menejerlarni tayinlash uchun ilovani oching.',
    'start.manager':
      'Xush kelibsiz, menejer!\n\nTashkilot, xodim va yordamchilarni boshqarish uchun ilovani oching.',
    'start.assistant':
      'Xush kelibsiz, yordamchi!\n\nBugungi davomatni belgilash uchun ilovani oching.',
    'start.staff':
      'Xush kelibsiz!\n\nO‘z davomatingizni ko‘rish uchun ilovani oching.',
    'start.none':
      'Salom! Siz ro‘yxatdan o‘tdingiz. Menejer sizni tashkilotga qo‘shganda ilovani oching.',
    'start.webappNotSet':
      '\n\n⚠️ WebApp administrator tomonidan hali sozlanmagan.',
    'app.webappNotSet': '⚠️ WebApp hali sozlanmagan.',
    'app.openAppPrompt': 'Ilovani oching:',
    'btn.openApp': '📱 Ilovani ochish',
    'btn.open': '📱 Ochish',
    'id.yours': 'Sizning Telegram ID: `{0}`',
    'link.notFound': 'Kod topilmadi yoki allaqachon ishlatilgan.',
    'link.alreadyLinked': 'Bu profil allaqachon bog‘langan.',
    'link.success': 'Akkaunt profilga muvaffaqiyatli bog‘landi: {0}',
  },
} as const;

export type TKey = keyof (typeof dict)['ru'];

export function t(
  lang: BotLang,
  key: TKey,
  ...params: (string | number)[]
): string {
  const template =
    (dict[lang] as Record<string, string>)[key] ||
    (dict.ru as Record<string, string>)[key] ||
    (key as string);
  if (params.length === 0) return template;
  return template.replace(/\{(\d+)\}/g, (_, i) =>
    String(params[Number(i)] ?? ''),
  );
}
