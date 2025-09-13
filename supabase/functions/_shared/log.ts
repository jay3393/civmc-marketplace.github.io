export type LogLevel = 'info' | 'error' | 'warn';

function pick(obj: Record<string, unknown>, allowed: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = obj[key];
    }
  }
  return out;
}

export function log(level: LogLevel, msg: string, extra: Record<string, unknown> = {}, allow: string[] = []) {
  const base = { t: new Date().toISOString(), msg };
  const safe = pick(extra, allow);
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)({ ...base, ...safe });
}

export function logExec(exec: string, level: LogLevel, msg: string, extra: Record<string, unknown> = {}, allow: string[] = []) {
  log(level, msg, { exec, ...extra }, ['exec', ...allow]);
}

export function allowFields<T extends Record<string, unknown>>(obj: T, allowed: string[]): Record<string, unknown> {
  return pick(obj as Record<string, unknown>, allowed);
}
