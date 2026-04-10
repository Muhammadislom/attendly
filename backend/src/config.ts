import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  botToken: required('BOT_TOKEN'),
  // Optional: if not set, no super-admin will be auto-assigned
  superAdminId: process.env.SUPER_ADMIN_ID
    ? BigInt(process.env.SUPER_ADMIN_ID)
    : 0n,
  // Optional: if not set, the bot won't attach a WebApp button
  webappUrl: process.env.WEBAPP_URL || '',
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
};
