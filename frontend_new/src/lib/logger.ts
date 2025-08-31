/*
  Lightweight environment-aware logger for the Next.js frontend.
  - Verbose (debug/info) in development
  - Minimal (warn/error) in production
*/

/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const env = typeof process !== 'undefined' ? process.env.NODE_ENV : 'production';
const defaultLevel: LogLevel = env === 'development' ? 'debug' : 'warn';

let currentLevel: LogLevel = defaultLevel;

export const setLogLevel = (level: LogLevel) => {
  currentLevel = level;
};

const shouldLog = (level: LogLevel) => levelOrder[level] >= levelOrder[currentLevel];

const format = (level: LogLevel, msg: any, meta?: Record<string, unknown>) => {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}]`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${String(msg)} :: ${JSON.stringify(meta)}`;
  }
  return `${base} ${String(msg)}`;
};

const logger = {
  debug: (msg: any, meta?: Record<string, unknown>) => {
    if (!shouldLog('debug')) return;
    console.debug(format('debug', msg, meta));
  },
  info: (msg: any, meta?: Record<string, unknown>) => {
    if (!shouldLog('info')) return;
    console.info(format('info', msg, meta));
  },
  warn: (msg: any, meta?: Record<string, unknown>) => {
    if (!shouldLog('warn')) return;
    console.warn(format('warn', msg, meta));
  },
  error: (msg: any, meta?: Record<string, unknown>) => {
    if (!shouldLog('error')) return;
    console.error(format('error', msg, meta));
  },
  group: (label: string) => {
    if (!shouldLog('debug')) return;
    if (console.groupCollapsed) console.groupCollapsed(label);
  },
  groupEnd: () => {
    if (!shouldLog('debug')) return;
    if (console.groupEnd) console.groupEnd();
  },
};

export default logger;
