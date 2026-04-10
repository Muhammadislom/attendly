import cron from 'node-cron';
import { DateTime } from 'luxon';
import { prisma } from '../db.js';
import { sendDailyReport } from '../services/report.js';

// Runs every minute. For each org, checks whether "now" (in its timezone) has just
// passed its markEnd time today and a report hasn't been sent yet today.
export function startScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      const orgs = await prisma.organization.findMany();
      for (const org of orgs) {
        const now = DateTime.now().setZone(org.timezone);
        const end = now.set({
          hour: org.markEndHour,
          minute: org.markEndMin,
          second: 0,
          millisecond: 0,
        });
        // Send report in the minute right after the window closes
        if (now < end) continue;
        if (now.diff(end, 'minutes').minutes > 5) continue;
        const today = now.toFormat('yyyy-LL-dd');
        const last = org.lastReportSent
          ? DateTime.fromJSDate(org.lastReportSent).setZone(org.timezone).toFormat('yyyy-LL-dd')
          : null;
        if (last === today) continue;
        await sendDailyReport(org.id);
      }
    } catch (err) {
      console.error('Scheduler error', err);
    }
  });
  console.log('⏰ Scheduler started');
}
