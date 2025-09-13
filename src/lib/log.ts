export type LogLevel = 'info' | 'error' | 'warn';

export function log(level: LogLevel, msg: string, extra: Record<string, unknown> = {}, allow: string[] = []) {
  const base = { t: new Date().toISOString(), level, msg };
  const safe: Record<string, unknown> = {};
  const record = extra as Record<string, unknown>;
  for (const key of allow) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      safe[key] = record[key];
    }
  }
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)({ ...base, ...safe });
}
