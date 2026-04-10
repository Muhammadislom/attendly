// Helper to convert bigint fields to strings for JSON
export function clean<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}
