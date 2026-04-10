import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  botToken: required('BOT_TOKEN'),
  superAdminId: BigInt(required('SUPER_ADMIN_ID')),
  webappUrl: required('WEBAPP_URL'),
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
};
