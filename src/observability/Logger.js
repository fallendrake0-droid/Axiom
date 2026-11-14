'use strict';

const { redact } = require('./Redaction');

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

function normalizeLevel(level) {
  const normalized = String(level || 'info').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(LEVELS, normalized)) {
    throw new TypeError(`Unsupported log level: ${level}`);
  }
  return normalized;
}

class Logger {
  constructor(options = {}) {
    this.level = normalizeLevel(options.level || 'info');
    this.bindings = Object.freeze({ ...(options.bindings || {}) });
    this.sink = typeof options.sink === 'function'
      ? options.sink
      : (record) => process.stdout.write(`${JSON.stringify(record)}\n`);
    this.clock = typeof options.clock === 'function' ? options.clock : () => new Date().toISOString();
  }

  child(bindings = {}) {
    return new Logger({
      level: this.level,
      bindings: { ...this.bindings, ...bindings },
      sink: this.sink,
      clock: this.clock
    });
  }

  log(level, message, context = {}) {
    const normalizedLevel = normalizeLevel(level);
    if (LEVELS[normalizedLevel] < LEVELS[this.level]) return false;
    const record = redact({
      ...this.bindings,
      ...context,
      timestamp: this.clock(),
      level: normalizedLevel,
      message: String(message)
    });
    this.sink(record);
    return true;
  }

  debug(message, context) { return this.log('debug', message, context); }
  info(message, context) { return this.log('info', message, context); }
  warn(message, context) { return this.log('warn', message, context); }
  error(message, context) { return this.log('error', message, context); }
}

function createLogger(options) {
  return new Logger(options);
}

module.exports = {
  Logger,
  createLogger,
  LEVELS
};
