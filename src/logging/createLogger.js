'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
const SENSITIVE_KEY = /token|password|secret|authorization|cookie|api[_-]?key/i;

function redact(value, depth = 0) {
  if (depth > 6) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, SENSITIVE_KEY.test(key) ? '[redacted]' : redact(child, depth + 1)])
    );
  }
  if (typeof value === 'string') return value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
  return value;
}

function createLogger({ level = 'info', dataDir = null, stdout = process.stdout, now = () => new Date() } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const logFile = dataDir ? path.join(dataDir, 'logs', 'axiom.log') : null;

  function write(logLevel, message, context = {}) {
    if (LEVELS[logLevel] < threshold) return;
    const entry = {
      timestamp: now().toISOString(),
      level: logLevel,
      message: String(message),
      ...redact(context)
    };
    const line = `${JSON.stringify(entry)}\n`;
    stdout.write(line);
    if (!logFile) return;
    try {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.appendFileSync(logFile, line, { encoding: 'utf8', mode: 0o600 });
    } catch (error) {
      // Logging must not crash bot teardown. The console already received the event.
      stdout.write(`${JSON.stringify({ timestamp: now().toISOString(), level: 'error', message: 'Failed to persist log entry', error: error.message })}\n`);
    }
  }

  return Object.freeze({
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
    child: (baseContext) => ({
      debug: (message, context) => write('debug', message, { ...baseContext, ...context }),
      info: (message, context) => write('info', message, { ...baseContext, ...context }),
      warn: (message, context) => write('warn', message, { ...baseContext, ...context }),
      error: (message, context) => write('error', message, { ...baseContext, ...context })
    })
  });
}

module.exports = { createLogger, redact };
