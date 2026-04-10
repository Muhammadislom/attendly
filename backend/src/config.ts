import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  // Trim whitespace — Railway Raw Editor sometimes keeps trailing newlines
  // and stray spaces, which silently break HMAC/connection strings.
  return v.trim();
}

function parseBigIntSafe(raw: string | undefined): bigint {
  if (!raw) return 0n;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    console.warn(
      `⚠️  SUPER_ADMIN_ID="${trimmed}" is not a valid number, ignoring.`,
    );
    return 0n;
  }
  try {
    return BigInt(trimmed);
  } catch {
    return 0n;
  }
}

function parseUrlSafe(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Ignore obvious placeholders
  if (!/^https?:\/\//.test(trimmed)) {
    console.warn(
      `⚠️  WEBAPP_URL="${trimmed}" is not a valid https URL, ignoring.`,
    );
    return '';
  }
  return trimmed.replace(/\/$/, '');
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  botToken: required('BOT_TOKEN'),
  // Optional: if not set or invalid, no super-admin will be auto-assigned
  superAdminId: parseBigIntSafe(process.env.SUPER_ADMIN_ID),
  // Optional: if not set or invalid, the bot won't attach a WebApp button
  webappUrl: parseUrlSafe(process.env.WEBAPP_URL),
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
};
