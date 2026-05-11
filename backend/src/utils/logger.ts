export function log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  console[level === 'info' ? 'log' : level](`[${ts}] [${level.toUpperCase()}] ${message}${metaStr}`);
}
