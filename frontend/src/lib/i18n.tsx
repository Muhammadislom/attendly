import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { tg } from './telegram';

export type Lang = 'ru' | 'uz';

// Flat dictionary. Keep keys semantic so the same string can be reused
// across pages. Uses {0}, {1} … as positional parameters.
const dict = {
  ru: {
    // common
    'common.retry': 'Повторить',
    'common.refresh': 'Обновить',
    'common.cancel': 'Отмена',
    'common.save': 'Сохранить',
    'common.saving': 'Сохранение...',
    'common.create': 'Создать',
    'common.add': 'Добавить',
    'common.adding': 'Добавление...',
    'common.delete': 'Удалить',
    'common.edit': 'Изменить',
    'common.remove': 'Убрать',
    'common.loading': 'Загрузка...',
    'common.optional': 'Необязательно',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.back': 'Назад',
    'common.name': 'Название',
    'common.position': 'Должность',
    'common.phone': 'Телефон',
    'common.fullName': 'ФИО',
    'common.error': 'Ошибка',
    'common.notFound': 'Не найдено',
    'common.notLinked': 'Не привязан',
    'common.code': 'Код',
    'common.how': 'Как это работает?',

    // auth / fallback
    'auth.openViaTelegram': 'Откройте через Telegram',
    'auth.openViaTelegramHint':
      'Это мини-приложение работает только внутри Telegram. Откройте бота и нажмите кнопку «Открыть» рядом с полем ввода или команду /app.',

    // roles
    'role.SUPER_ADMIN': 'Супер-админ',
    'role.MANAGER': 'Управляющий',
    'role.ASSISTANT': 'Ассистент',
    'role.STAFF': 'Сотрудник',
    'role.NONE': 'Нет роли',

    // home
    'home.title': 'Главная',
    'home.greeting': 'Привет, {0}!',
    'home.greetingAnon': 'Привет!',
    'home.waiting': 'Ожидание назначения',
    'home.waitingHint':
      'Свяжитесь с вашим управляющим или супер-админом чтобы получить доступ.',
    'home.menu.users': 'Пользователи',
    'home.menu.usersSub': 'Все пользователи бота и назначение управляющих',
    'home.menu.orgs': 'Мои организации',
    'home.menu.orgsSub': 'Управление сотрудниками, ассистентами и отчётами',
    'home.menu.mark': 'Отметить посещение',
    'home.menu.markSub': 'Отметьте кто пришёл сегодня',
    'home.menu.history': 'Мои посещения',
    'home.menu.historySub': 'История моих посещений',

    // admin users
    'admin.title': 'Пользователи',
    'admin.denied': 'Доступ запрещён',
    'admin.deniedHint': 'Только для супер-админа',
    'admin.search': 'Поиск по имени, @username или ID...',
    'admin.noName': 'Без имени',
    'admin.makeManager': 'Управляющий',
    'admin.removeManager': 'Снять',
    'admin.help.title': 'Кто такие роли в системе?',
    'admin.help.superAdmin':
      'SUPER_ADMIN — только вы. Управляете ролями: назначаете управляющих. Не создаёте организации.',
    'admin.help.manager':
      'MANAGER (Управляющий) — создаёт организации, добавляет сотрудников и ассистентов, получает отчёты.',
    'admin.help.assistant':
      'ASSISTANT (Ассистент) — отмечает посещаемость сотрудников в окне отметки. Назначается автоматически, когда управляющий его добавил.',
    'admin.help.staff':
      'STAFF (Сотрудник) — может только смотреть свою историю посещений. Назначается автоматически, когда сотрудник ввёл код привязки в боте.',
    'admin.help.none':
      'NONE — обычный пользователь без особых прав. Присваивается всем новым юзерам после /start.',
    'admin.help.action':
      'Нажмите «Управляющий», чтобы назначить пользователя управляющим — после этого он сможет создавать организации.',
    'admin.cantPromoteAssistant':
      'Ассистент. Нельзя назначить управляющим — сначала уберите его из всех организаций.',
    'admin.assistantBadge': 'Назначен ассистентом',

    // admin dashboard
    'adminDash.title': 'Панель супер-админа',
    'adminDash.help.title': 'Что здесь видно',
    'adminDash.help.body':
      'Это сводка по всей системе: сколько у вас пользователей, организаций, сотрудников, и сколько отметок было сегодня.',
    'adminDash.totalUsers': 'Всего пользователей',
    'adminDash.totalOrgs': 'Организаций',
    'adminDash.totalStaff': 'Сотрудников',
    'adminDash.totalAssistants': 'Ассистентов',
    'adminDash.todayAttendance': 'Отметок сегодня',
    'adminDash.recentUsers': 'Новых за 7 дней',
    'adminDash.byRole': 'Распределение по ролям',
    'adminDash.menuStats': 'Статистика',
    'adminDash.menuStatsSub': 'Сводка по всей системе',
    'adminDash.menuOrgs': 'Все организации',
    'adminDash.menuOrgsSub': 'Список организаций всех управляющих',

    // admin orgs
    'adminOrgs.title': 'Все организации',
    'adminOrgs.help.title': 'Что это за список',
    'adminOrgs.help.body':
      'Здесь все организации в системе — со всеми управляющими. Это режим только для чтения: создавать и удалять организации могут сами управляющие.',
    'adminOrgs.empty': 'В системе пока нет организаций',
    'adminOrgs.search': 'Поиск по названию или управляющему...',
    'adminOrgs.manager': 'Управляющий: {0}',
    'adminOrgs.noManagerName': 'без имени',

    // admin org detail
    'adminOrgDetail.readOnly': 'Только для чтения',
    'adminOrgDetail.todaySummary': 'Сегодня',
    'adminOrgDetail.present': 'Пришли',
    'adminOrgDetail.late': 'Опоздали',
    'adminOrgDetail.absent': 'Отсутств.',
    'adminOrgDetail.unmarked': 'Не отмечены',
    'adminOrgDetail.staffList': 'Сотрудники',
    'adminOrgDetail.assistants': 'Ассистенты',
    'adminOrgDetail.noStaff': 'Нет сотрудников',
    'adminOrgDetail.noAssistants': 'Нет ассистентов',

    // admin user detail
    'adminUserDetail.managedOrgs': 'Управляет организациями',
    'adminUserDetail.assistantIn': 'Ассистент в',
    'adminUserDetail.staffIn': 'Сотрудник в',
    'adminUserDetail.noLinks': 'Нет привязок к организациям',
    'adminUserDetail.joined': 'Зарегистрирован: {0}',
    'adminUserDetail.attendance': 'Последние посещения',

    // admin today
    'adminToday.title': 'Сегодня',
    'adminToday.help.title': 'Что здесь видно',
    'adminToday.help.body':
      'Статус отметки за сегодня во всех организациях. Видно: окно открыто, закрыто или ещё не началось, и сколько сотрудников уже отмечено.',
    'adminToday.before': 'Ещё не открыто',
    'adminToday.open': 'Открыто',
    'adminToday.after': 'Закрыто',
    'adminToday.marked': '{0} из {1} отмечено',
    'adminToday.allDone': 'Все отмечены',
    'adminToday.noneYet': 'Никто не отмечен',
    'adminToday.empty': 'Нет организаций',

    // admin activity
    'adminActivity.title': 'Лента событий',
    'adminActivity.help.title': 'Что здесь видно',
    'adminActivity.help.body':
      'Последние события в системе: новые пользователи, новые организации, отметки посещаемости. Сортировано по времени, самые свежие сверху.',
    'adminActivity.userEvent': 'Новый пользователь',
    'adminActivity.orgEvent': 'Новая организация',
    'adminActivity.markEvent': 'Отметка',
    'adminActivity.empty': 'Событий пока нет',

    // admin inactive
    'adminInactive.title': 'Неактивные организации',
    'adminInactive.help.title': 'Что это',
    'adminInactive.help.body':
      'Организации, в которых не было ни одной отметки за последние 7 дней. Возможно, стоит связаться с управляющим.',
    'adminInactive.lastMark': 'Последняя отметка: {0}',
    'adminInactive.never': 'Отметок не было',
    'adminInactive.empty': 'Все организации активны',

    // admin broadcast
    'adminBroadcast.title': 'Рассылка',
    'adminBroadcast.help.title': 'Как работает рассылка',
    'adminBroadcast.help.body':
      'Отправляет текстовое сообщение через бота всем пользователям (или по роли). Отправить обратно нельзя — проверьте текст!',
    'adminBroadcast.text': 'Текст сообщения',
    'adminBroadcast.placeholder': 'Текст рассылки...',
    'adminBroadcast.target': 'Кому',
    'adminBroadcast.targetAll': 'Всем',
    'adminBroadcast.send': 'Отправить',
    'adminBroadcast.sending': 'Отправляется...',
    'adminBroadcast.confirm':
      'Вы уверены? Сообщение будет отправлено и его нельзя будет отменить.',
    'adminBroadcast.sent': 'Отправлено: {0}',
    'adminBroadcast.failed': 'Ошибок: {0}',
    'adminBroadcast.done': 'Рассылка завершена',
    'adminBroadcast.enterText': 'Введите текст',

    // manager orgs list
    'manager.title': 'Мои организации',
    'manager.addOrg': '+ Добавить организацию',
    'manager.newOrg': 'Новая организация',
    'manager.orgNamePlaceholder': 'Кофейня Uptown',
    'manager.orgNameHint': 'Как будет называться объект у вас в списке',
    'manager.windowStart': 'Начало окна',
    'manager.windowEnd': 'Конец окна',
    'manager.tzHint':
      'Часовой пояс: Asia/Tashkent. После закрытия окна вы получите отчёт в Telegram.',
    'manager.noOrgs': 'У вас пока нет организаций',
    'manager.noOrgsHint': 'Нажмите «Добавить организацию», чтобы начать',
    'manager.enterName': 'Введите название',
    'manager.invalidWindow':
      'Время окончания должно быть позже времени начала',
    'manager.help.title': 'Что такое организация?',
    'manager.help.body1':
      'Организация — это ваш объект учёта посещаемости (кофейня, магазин, офис). В ней будут:',
    'manager.help.bullets':
      '• Сотрудники — те, чью посещаемость отмечают.\n• Ассистенты — те, кто отмечает посещаемость в приложении.\n• Окно отметки — промежуток времени, когда можно отмечать. После закрытия окна вам автоматически приходит отчёт в Telegram.',

    // manager org detail
    'orgDetail.window': 'Окно отметки: ⏰ {0} — {1} ({2})',
    'orgDetail.tab.staff': '👥 Персонал',
    'orgDetail.tab.assistants': '🧑‍💼 Ассистенты',
    'orgDetail.tab.report': '📊 Отчёт',
    'orgDetail.tab.settings': '⚙️ Настройки',

    // staff tab
    'staffTab.help.title': 'Как добавить сотрудника',
    'staffTab.help.body1':
      'Сотрудник — это человек, чью посещаемость отмечают ассистенты (например, повар, уборщица, продавец). Ему не нужен Telegram — просто введите ФИО.',
    'staffTab.help.body2':
      'Если сотрудник хочет сам видеть свою историю посещений в боте — включите «Создать код привязки» при добавлении (или нажмите кнопку «Код» позже). Отдайте код сотруднику, он отправит его боту как сообщение и привяжет свой Telegram.',
    'staffTab.addStaff': '+ Добавить сотрудника',
    'staffTab.new': 'Новый сотрудник',
    'staffTab.enterFullName': 'Введите ФИО',
    'staffTab.namePlaceholder': 'Иванов Иван',
    'staffTab.positionPlaceholder': 'Повар',
    'staffTab.phonePlaceholder': '+998 90 123 45 67',
    'staffTab.invite': 'Создать код привязки к Telegram',
    'staffTab.inviteHint':
      'Нужен только если сотрудник сам хочет видеть свою историю',
    'staffTab.empty': 'Пока никого нет',
    'staffTab.linked': '🔗 Привязан к Telegram',
    'staffTab.sendCode': 'Код: отправьте в бот',
    'staffTab.confirmDelete': 'Удалить сотрудника?',

    // assistants tab
    'asstTab.help.title': 'Как добавить ассистента',
    'asstTab.help.body1':
      'Ассистент — это человек, который будет отмечать посещаемость сотрудников в приложении (например, администратор смены).',
    'asstTab.help.step1':
      'Шаг 1. Попросите ассистента открыть бота и нажать /start — без этого бот его «не знает».',
    'asstTab.help.step2':
      'Шаг 2. Введите его @username (например, @ivanov) или числовой Telegram ID. Узнать ID можно командой /id в боте — он пришлёт в ответ число вида 123456789.',
    'asstTab.add': 'Добавить ассистента',
    'asstTab.label': '@username или Telegram ID',
    'asstTab.placeholder': '@ivanov или 123456789',
    'asstTab.hint': 'Ассистент должен был хотя бы раз нажать /start в боте',
    'asstTab.enterIdentifier': 'Введите @username или ID',
    'asstTab.empty': 'Ассистентов пока нет',
    'asstTab.confirmRemove': 'Убрать ассистента?',

    // settings tab
    'settingsTab.help.title': 'Что такое окно отметки?',
    'settingsTab.help.body1':
      'Окно отметки — это промежуток времени, в который ассистент может отмечать посещаемость сотрудников. Например, 07:00 — 08:00: ассистент открывает приложение утром и отмечает «пришёл / опоздал / отсутствует».',
    'settingsTab.help.body2':
      'После закрытия окна отметить уже нельзя — отчёт «замораживается» и автоматически уходит вам в Telegram. Часовой пояс: {0}.',
    'settingsTab.deleteOrg': 'Удалить организацию',
    'settingsTab.confirmDelete':
      'Удалить организацию? Все сотрудники и записи будут потеряны.',

    // report tab
    'report.help.title': 'Что показывает отчёт',
    'report.help.body1':
      'Здесь вы видите посещаемость за выбранный день. По умолчанию показывается сегодняшний день — выберите другую дату, чтобы посмотреть историю.',
    'report.help.body2':
      'Сотрудники, которых ассистент не отметил до закрытия окна, автоматически считаются отсутствующими (❌).',
    'report.date': 'Дата',
    'report.present': 'Пришли',
    'report.late': 'Опоздали',
    'report.absent': 'Отсутств.',

    // assistant pick
    'assistantPick.title': 'Отметить посещение',
    'assistantPick.help.title': 'Как отмечать посещаемость',
    'assistantPick.help.body1':
      'Выберите организацию, где нужно отметить сотрудников. Вы увидите список всех сотрудников и сможете отметить каждого: пришёл, опоздал или отсутствует.',
    'assistantPick.help.body2':
      '⚠️ Отмечать можно только в пределах окна отметки — время указано на каждой карточке. После закрытия окна приложение заблокирует отметку.',
    'assistantPick.empty': 'Вы не назначены ни в одну организацию',
    'assistantPick.emptyHint': 'Попросите управляющего добавить вас в ассистенты',

    // assistant mark
    'mark.help.title': 'Как отмечать',
    'mark.help.body1': 'Напротив каждого сотрудника — три кнопки:',
    'mark.help.body2':
      '✅ Пришёл — сотрудник на месте вовремя.\n🟡 Опоздал — пришёл, но с опозданием.\n❌ Отсутствует — не пришёл.',
    'mark.help.body3':
      'Нажмите нужную кнопку — отметка сохранится автоматически. Можно менять сколько угодно раз, пока окно открыто. После закрытия окна управляющий получит итоговый отчёт.',
    'mark.open': 'Открыто',
    'mark.closed': 'Закрыто',
    'mark.window': 'Окно: {0} — {1}',
    'mark.closedBanner':
      'Окно отметки закрыто. Отметки нельзя изменить — отчёт отправлен управляющему.',
    'mark.presentShort': 'Пришли',
    'mark.lateShort': 'Опоздали',
    'mark.notMarked': 'Не отмечены',

    // staff history
    'staffHistory.title': 'Мои посещения',
    'staffHistory.help.title': 'Что я здесь вижу?',
    'staffHistory.help.body1':
      'Здесь отображается ваша история посещений за последние 60 дней. Ассистент отмечает каждый ваш рабочий день — а вы можете посмотреть статистику.',
    'staffHistory.help.body2':
      'Если список пустой — попросите управляющего выдать вам код привязки и отправьте его боту как сообщение. После этого ваш Telegram будет связан с профилем сотрудника.',
    'staffHistory.empty': 'Вы не привязаны к профилю сотрудника',
    'staffHistory.emptyHint':
      'Попросите у управляющего код привязки и отправьте его боту',
    'staffHistory.present': 'Пришёл',
    'staffHistory.late': 'Опоздал',
    'staffHistory.absent': 'Отсутствовал',
    'staffHistory.noRecords': 'Записей пока нет',
  },
  uz: {
    // common
    'common.retry': 'Qayta urinish',
    'common.refresh': 'Yangilash',
    'common.cancel': 'Bekor qilish',
    'common.save': 'Saqlash',
    'common.saving': 'Saqlanmoqda...',
    'common.create': 'Yaratish',
    'common.add': 'Qo‘shish',
    'common.adding': 'Qo‘shilmoqda...',
    'common.delete': 'O‘chirish',
    'common.edit': 'O‘zgartirish',
    'common.remove': 'Olib tashlash',
    'common.loading': 'Yuklanmoqda...',
    'common.optional': 'Ixtiyoriy',
    'common.yes': 'Ha',
    'common.no': 'Yo‘q',
    'common.back': 'Orqaga',
    'common.name': 'Nomi',
    'common.position': 'Lavozim',
    'common.phone': 'Telefon',
    'common.fullName': 'F.I.Sh.',
    'common.error': 'Xato',
    'common.notFound': 'Topilmadi',
    'common.notLinked': 'Bog‘lanmagan',
    'common.code': 'Kod',
    'common.how': 'Bu qanday ishlaydi?',

    // auth / fallback
    'auth.openViaTelegram': 'Telegram orqali oching',
    'auth.openViaTelegramHint':
      'Bu mini-ilova faqat Telegram ichida ishlaydi. Botni oching va xabar maydoni yonidagi «Ochish» tugmasini bosing yoki /app buyrug‘ini yuboring.',

    // roles
    'role.SUPER_ADMIN': 'Super admin',
    'role.MANAGER': 'Menejer',
    'role.ASSISTANT': 'Yordamchi',
    'role.STAFF': 'Xodim',
    'role.NONE': 'Rolsiz',

    // home
    'home.title': 'Bosh sahifa',
    'home.greeting': 'Salom, {0}!',
    'home.greetingAnon': 'Salom!',
    'home.waiting': 'Tayinlash kutilmoqda',
    'home.waitingHint':
      'Kirish uchun menejeringiz yoki super admin bilan bog‘laning.',
    'home.menu.users': 'Foydalanuvchilar',
    'home.menu.usersSub':
      'Barcha bot foydalanuvchilari va menejerlarni tayinlash',
    'home.menu.orgs': 'Mening tashkilotlarim',
    'home.menu.orgsSub': 'Xodimlar, yordamchilar va hisobotlarni boshqarish',
    'home.menu.mark': 'Davomatni belgilash',
    'home.menu.markSub': 'Bugun kim kelganini belgilang',
    'home.menu.history': 'Mening davomatim',
    'home.menu.historySub': 'Mening davomatim tarixi',

    // admin users
    'admin.title': 'Foydalanuvchilar',
    'admin.denied': 'Ruxsat yo‘q',
    'admin.deniedHint': 'Faqat super admin uchun',
    'admin.search': 'Ism, @username yoki ID bo‘yicha qidiruv...',
    'admin.noName': 'Ismsiz',
    'admin.makeManager': 'Menejer',
    'admin.removeManager': 'Olib tashlash',
    'admin.help.title': 'Tizimda rollar nima?',
    'admin.help.superAdmin':
      'SUPER_ADMIN — faqat siz. Rollarni boshqarasiz: menejerlarni tayinlaysiz. Tashkilot yaratmaysiz.',
    'admin.help.manager':
      'MANAGER (Menejer) — tashkilot yaratadi, xodim va yordamchilar qo‘shadi, hisobot oladi.',
    'admin.help.assistant':
      'ASSISTANT (Yordamchi) — belgilash oynasi davomida xodimlarning davomatini belgilaydi. Menejer uni qo‘shganda avtomatik tayinlanadi.',
    'admin.help.staff':
      'STAFF (Xodim) — faqat o‘z davomat tarixini ko‘ra oladi. Xodim botda bog‘lash kodini kiritgach avtomatik tayinlanadi.',
    'admin.help.none':
      'NONE — maxsus huquqlarsiz oddiy foydalanuvchi. /start dan keyin barcha yangi foydalanuvchilarga beriladi.',
    'admin.help.action':
      'Foydalanuvchini menejer sifatida tayinlash uchun «Menejer» tugmasini bosing — shundan so‘ng u tashkilot yarata oladi.',
    'admin.cantPromoteAssistant':
      'Yordamchi. Menejer qilib bo‘lmaydi — avval uni barcha tashkilotlardan olib tashlang.',
    'admin.assistantBadge': 'Yordamchi sifatida tayinlangan',

    // admin dashboard
    'adminDash.title': 'Super admin paneli',
    'adminDash.help.title': 'Bu yerda nima ko‘rinadi',
    'adminDash.help.body':
      'Bu butun tizim bo‘yicha umumiy ma’lumot: nechta foydalanuvchi, tashkilot, xodim borligi va bugun nechta belgilash bo‘lganligi.',
    'adminDash.totalUsers': 'Jami foydalanuvchilar',
    'adminDash.totalOrgs': 'Tashkilotlar',
    'adminDash.totalStaff': 'Xodimlar',
    'adminDash.totalAssistants': 'Yordamchilar',
    'adminDash.todayAttendance': 'Bugungi belgilashlar',
    'adminDash.recentUsers': '7 kunda yangi',
    'adminDash.byRole': 'Rollar bo‘yicha taqsimlash',
    'adminDash.menuStats': 'Statistika',
    'adminDash.menuStatsSub': 'Butun tizim bo‘yicha umumiy ma’lumot',
    'adminDash.menuOrgs': 'Barcha tashkilotlar',
    'adminDash.menuOrgsSub': 'Barcha menejerlarning tashkilotlari',

    // admin orgs
    'adminOrgs.title': 'Barcha tashkilotlar',
    'adminOrgs.help.title': 'Bu qanday ro‘yxat',
    'adminOrgs.help.body':
      'Tizimdagi barcha tashkilotlar va ularning menejerlari. Bu faqat o‘qish rejimi: tashkilot yaratish va o‘chirishni faqat menejerlar qila oladi.',
    'adminOrgs.empty': 'Tizimda hali tashkilotlar yo‘q',
    'adminOrgs.search': 'Nom yoki menejer bo‘yicha qidiruv...',
    'adminOrgs.manager': 'Menejer: {0}',
    'adminOrgs.noManagerName': 'ismsiz',

    // admin org detail
    'adminOrgDetail.readOnly': 'Faqat o\'qish',
    'adminOrgDetail.todaySummary': 'Bugun',
    'adminOrgDetail.present': 'Keldi',
    'adminOrgDetail.late': 'Kechikdi',
    'adminOrgDetail.absent': 'Kelmadi',
    'adminOrgDetail.unmarked': 'Belgilanmagan',
    'adminOrgDetail.staffList': 'Xodimlar',
    'adminOrgDetail.assistants': 'Yordamchilar',
    'adminOrgDetail.noStaff': 'Xodimlar yo\'q',
    'adminOrgDetail.noAssistants': 'Yordamchilar yo\'q',

    // admin user detail
    'adminUserDetail.managedOrgs': 'Boshqaradigan tashkilotlar',
    'adminUserDetail.assistantIn': 'Yordamchi sifatida',
    'adminUserDetail.staffIn': 'Xodim sifatida',
    'adminUserDetail.noLinks': 'Tashkilotlarga bog\'lanmagan',
    'adminUserDetail.joined': 'Ro\'yxatdan o\'tgan: {0}',
    'adminUserDetail.attendance': 'Oxirgi davomatlar',

    // admin today
    'adminToday.title': 'Bugun',
    'adminToday.help.title': 'Bu yerda nima ko\'rinadi',
    'adminToday.help.body':
      'Barcha tashkilotlarda bugungi belgilash holati. Ko\'rinadi: oyna ochiq, yopiq yoki hali boshlanmagan, va qancha xodim belgilangan.',
    'adminToday.before': 'Hali ochilmagan',
    'adminToday.open': 'Ochiq',
    'adminToday.after': 'Yopilgan',
    'adminToday.marked': '{0} dan {1} belgilangan',
    'adminToday.allDone': 'Hammasi belgilangan',
    'adminToday.noneYet': 'Hech kim belgilanmagan',
    'adminToday.empty': 'Tashkilotlar yo\'q',

    // admin activity
    'adminActivity.title': 'Voqealar lentasi',
    'adminActivity.help.title': 'Bu yerda nima ko\'rinadi',
    'adminActivity.help.body':
      'Tizimdagi oxirgi voqealar: yangi foydalanuvchilar, yangi tashkilotlar, davomat belgilari. Vaqt bo\'yicha tartiblangan, eng yangisi tepada.',
    'adminActivity.userEvent': 'Yangi foydalanuvchi',
    'adminActivity.orgEvent': 'Yangi tashkilot',
    'adminActivity.markEvent': 'Belgilash',
    'adminActivity.empty': 'Hali voqealar yo\'q',

    // admin inactive
    'adminInactive.title': 'Nofaol tashkilotlar',
    'adminInactive.help.title': 'Bu nima',
    'adminInactive.help.body':
      'Oxirgi 7 kunda hech qanday belgilash bo\'lmagan tashkilotlar. Ehtimol, menejer bilan bog\'lanish kerak.',
    'adminInactive.lastMark': 'Oxirgi belgilash: {0}',
    'adminInactive.never': 'Belgilash bo\'lmagan',
    'adminInactive.empty': 'Barcha tashkilotlar faol',

    // admin broadcast
    'adminBroadcast.title': 'Xabar tarqatish',
    'adminBroadcast.help.title': 'Xabar tarqatish qanday ishlaydi',
    'adminBroadcast.help.body':
      'Bot orqali barcha foydalanuvchilarga (yoki rolga ko\'ra) matnli xabar yuboradi. Qaytarib bo\'lmaydi — matnni tekshiring!',
    'adminBroadcast.text': 'Xabar matni',
    'adminBroadcast.placeholder': 'Xabar matni...',
    'adminBroadcast.target': 'Kimga',
    'adminBroadcast.targetAll': 'Hammaga',
    'adminBroadcast.send': 'Yuborish',
    'adminBroadcast.sending': 'Yuborilmoqda...',
    'adminBroadcast.confirm':
      'Ishonchingiz komilmi? Xabar yuboriladi va bekor qilib bo\'lmaydi.',
    'adminBroadcast.sent': 'Yuborildi: {0}',
    'adminBroadcast.failed': 'Xatolar: {0}',
    'adminBroadcast.done': 'Tarqatish tugadi',
    'adminBroadcast.enterText': 'Matnni kiriting',

    // manager orgs list
    'manager.title': 'Mening tashkilotlarim',
    'manager.addOrg': '+ Tashkilot qo‘shish',
    'manager.newOrg': 'Yangi tashkilot',
    'manager.orgNamePlaceholder': 'Uptown Kafesi',
    'manager.orgNameHint': 'Ro‘yxatingizda ko‘rinadigan nom',
    'manager.windowStart': 'Oyna boshi',
    'manager.windowEnd': 'Oyna oxiri',
    'manager.tzHint':
      'Vaqt zonasi: Asia/Tashkent. Oyna yopilgach Telegram’da hisobot olasiz.',
    'manager.noOrgs': 'Sizda hali tashkilotlar yo‘q',
    'manager.noOrgsHint': 'Boshlash uchun «Tashkilot qo‘shish» tugmasini bosing',
    'manager.enterName': 'Nomni kiriting',
    'manager.invalidWindow':
      'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak',
    'manager.help.title': 'Tashkilot nima?',
    'manager.help.body1':
      'Tashkilot — bu sizning davomat nazorat obyektingiz (kafe, do‘kon, ofis). U ichida:',
    'manager.help.bullets':
      '• Xodimlar — davomati belgilanadigan shaxslar.\n• Yordamchilar — ilovada davomatni belgilaydigan shaxslar.\n• Belgilash oynasi — davomatni belgilash mumkin bo‘lgan vaqt. Oyna yopilgach Telegram’da hisobot keladi.',

    // manager org detail
    'orgDetail.window': 'Belgilash oynasi: ⏰ {0} — {1} ({2})',
    'orgDetail.tab.staff': '👥 Xodimlar',
    'orgDetail.tab.assistants': '🧑‍💼 Yordamchilar',
    'orgDetail.tab.report': '📊 Hisobot',
    'orgDetail.tab.settings': '⚙️ Sozlamalar',

    // staff tab
    'staffTab.help.title': 'Xodim qanday qo‘shiladi',
    'staffTab.help.body1':
      'Xodim — davomati yordamchilar tomonidan belgilanadigan shaxs (masalan, oshpaz, farrosh, sotuvchi). Unga Telegram kerak emas — faqat F.I.Sh. kiriting.',
    'staffTab.help.body2':
      'Agar xodim o‘z davomat tarixini botda ko‘rmoqchi bo‘lsa — qo‘shish vaqtida «Bog‘lash kodi» ni yoqing (yoki keyinroq «Kod» tugmasini bosing). Kodni xodimga bering — u botga xabar sifatida yuborib, o‘z Telegramini bog‘laydi.',
    'staffTab.addStaff': '+ Xodim qo‘shish',
    'staffTab.new': 'Yangi xodim',
    'staffTab.enterFullName': 'F.I.Sh. ni kiriting',
    'staffTab.namePlaceholder': 'Ivanov Ivan',
    'staffTab.positionPlaceholder': 'Oshpaz',
    'staffTab.phonePlaceholder': '+998 90 123 45 67',
    'staffTab.invite': 'Telegramga bog‘lash kodini yaratish',
    'staffTab.inviteHint':
      'Faqat xodim o‘z tarixini ko‘rmoqchi bo‘lsa kerak bo‘ladi',
    'staffTab.empty': 'Hozircha hech kim yo‘q',
    'staffTab.linked': '🔗 Telegramga bog‘langan',
    'staffTab.sendCode': 'Kod: botga yuboring',
    'staffTab.confirmDelete': 'Xodimni o‘chirilsinmi?',

    // assistants tab
    'asstTab.help.title': 'Yordamchi qanday qo‘shiladi',
    'asstTab.help.body1':
      'Yordamchi — ilovada xodimlar davomatini belgilaydigan shaxs (masalan, smena ma’muri).',
    'asstTab.help.step1':
      '1-qadam. Yordamchidan botni ochib /start bosishini so‘rang — usiz bot uni «tanimaydi».',
    'asstTab.help.step2':
      '2-qadam. Uning @username (masalan, @ivanov) yoki raqamli Telegram ID sini kiriting. ID ni botdagi /id buyrug‘i bilan bilish mumkin — bot 123456789 ko‘rinishidagi raqamni yuboradi.',
    'asstTab.add': 'Yordamchi qo‘shish',
    'asstTab.label': '@username yoki Telegram ID',
    'asstTab.placeholder': '@ivanov yoki 123456789',
    'asstTab.hint':
      'Yordamchi botda kamida bir marta /start bosgan bo‘lishi kerak',
    'asstTab.enterIdentifier': '@username yoki ID kiriting',
    'asstTab.empty': 'Hozircha yordamchilar yo‘q',
    'asstTab.confirmRemove': 'Yordamchi olib tashlansinmi?',

    // settings tab
    'settingsTab.help.title': 'Belgilash oynasi nima?',
    'settingsTab.help.body1':
      'Belgilash oynasi — yordamchi xodimlar davomatini belgilashi mumkin bo‘lgan vaqt oralig‘i. Masalan, 07:00 — 08:00: yordamchi ertalab ilovani ochib «keldi / kechikdi / kelmadi» deb belgilaydi.',
    'settingsTab.help.body2':
      'Oyna yopilgach belgilash mumkin emas — hisobot «muzlatiladi» va Telegram’ga avtomatik yuboriladi. Vaqt zonasi: {0}.',
    'settingsTab.deleteOrg': 'Tashkilotni o‘chirish',
    'settingsTab.confirmDelete':
      'Tashkilot o‘chirilsinmi? Barcha xodimlar va yozuvlar yo‘qoladi.',

    // report tab
    'report.help.title': 'Hisobot nimani ko‘rsatadi',
    'report.help.body1':
      'Bu yerda siz tanlangan kun uchun davomatni ko‘rasiz. Odatda bugungi kun ko‘rsatiladi — tarixni ko‘rish uchun boshqa sanani tanlang.',
    'report.help.body2':
      'Oyna yopilgunga qadar yordamchi belgilamagan xodimlar avtomatik ravishda kelmagan (❌) hisoblanadi.',
    'report.date': 'Sana',
    'report.present': 'Keldi',
    'report.late': 'Kechikdi',
    'report.absent': 'Kelmadi',

    // assistant pick
    'assistantPick.title': 'Davomatni belgilash',
    'assistantPick.help.title': 'Davomat qanday belgilanadi',
    'assistantPick.help.body1':
      'Xodimlarni belgilash kerak bo‘lgan tashkilotni tanlang. Barcha xodimlar ro‘yxatini ko‘rasiz va har birini belgilay olasiz: keldi, kechikdi yoki kelmadi.',
    'assistantPick.help.body2':
      '⚠️ Belgilash faqat belgilash oynasi ichida mumkin — vaqt har bir kartochkada ko‘rsatilgan. Oyna yopilgach ilova belgilashni bloklaydi.',
    'assistantPick.empty': 'Siz hech qaysi tashkilotga tayinlanmagansiz',
    'assistantPick.emptyHint':
      'Menejerdan sizni yordamchi qilib qo‘shishni so‘rang',

    // assistant mark
    'mark.help.title': 'Qanday belgilash kerak',
    'mark.help.body1': 'Har bir xodim ro‘parasida uchta tugma bor:',
    'mark.help.body2':
      '✅ Keldi — xodim o‘z vaqtida joyda.\n🟡 Kechikdi — keldi, lekin kechikib.\n❌ Kelmadi — kelmagan.',
    'mark.help.body3':
      'Kerakli tugmani bosing — belgilash avtomatik saqlanadi. Oyna ochiq bo‘lgunicha xohlagancha o‘zgartirish mumkin. Oyna yopilgach menejer yakuniy hisobotni oladi.',
    'mark.open': 'Ochiq',
    'mark.closed': 'Yopiq',
    'mark.window': 'Oyna: {0} — {1}',
    'mark.closedBanner':
      'Belgilash oynasi yopiq. Belgilarni o‘zgartirib bo‘lmaydi — hisobot menejerga yuborilgan.',
    'mark.presentShort': 'Keldi',
    'mark.lateShort': 'Kechikdi',
    'mark.notMarked': 'Belgilanmagan',

    // staff history
    'staffHistory.title': 'Mening davomatim',
    'staffHistory.help.title': 'Bu yerda nimani ko‘raman?',
    'staffHistory.help.body1':
      'Bu yerda oxirgi 60 kunlik davomat tarixingiz ko‘rsatiladi. Yordamchi har bir ish kuningizni belgilaydi — siz esa statistikani ko‘rishingiz mumkin.',
    'staffHistory.help.body2':
      'Agar ro‘yxat bo‘sh bo‘lsa — menejerdan bog‘lash kodi so‘rang va uni botga xabar sifatida yuboring. Shundan so‘ng Telegramingiz xodim profili bilan bog‘lanadi.',
    'staffHistory.empty': 'Siz hech qaysi xodim profiliga bog‘lanmagansiz',
    'staffHistory.emptyHint':
      'Menejerdan bog‘lash kodini so‘rang va botga yuboring',
    'staffHistory.present': 'Keldi',
    'staffHistory.late': 'Kechikdi',
    'staffHistory.absent': 'Kelmadi',
    'staffHistory.noRecords': 'Hali yozuvlar yo‘q',
  },
} as const;

export type TKey = keyof (typeof dict)['ru'];

function format(template: string, params: (string | number)[]): string {
  if (params.length === 0) return template;
  return template.replace(/\{(\d+)\}/g, (_, i) =>
    String(params[Number(i)] ?? ''),
  );
}

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, ...params: (string | number)[]) => string;
}>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key,
});

function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'ru' || saved === 'uz') return saved;
  } catch {}
  const code: string | undefined = tg()?.initDataUnsafe?.user?.language_code;
  if (code && code.toLowerCase().startsWith('uz')) return 'uz';
  return 'ru';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch {}
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: TKey, ...params: (string | number)[]) => {
      const template =
        (dict[lang] as Record<string, string>)[key] ||
        (dict.ru as Record<string, string>)[key] ||
        (key as string);
      return format(template, params);
    },
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
