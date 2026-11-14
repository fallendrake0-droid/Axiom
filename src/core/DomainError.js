'use strict';

const SENSITIVE_KEY_PATTERN = /(?:api[_-]?key|authorization|bearer|cookie|credential|pass(?:word)?|private[_-]?key|secret|session|token)/i;

const ERROR_CODES = Object.freeze({
  CONFIG_FILE_NOT_FOUND: 'CONFIG_FILE_NOT_FOUND',
  CONFIG_INVALID_JSON: 'CONFIG_INVALID_JSON',
  CONFIG_VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',
  CONFIG_UNKNOWN_PROPERTY: 'CONFIG_UNKNOWN_PROPERTY',
  CONFIG_SECRET_MISSING: 'CONFIG_SECRET_MISSING',
  CONNECTION_NOT_APPROVED: 'CONNECTION_NOT_APPROVED',
  OPERATOR_SESSION_REQUIRED: 'OPERATOR_SESSION_REQUIRED',
  MINECRAFT_VERSION_UNSUPPORTED: 'MINECRAFT_VERSION_UNSUPPORTED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

function redactDetail(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') return value.length > 512 ? `${value.slice(0, 512)}…` : value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'function' || typeof value === 'symbol') return '[unserializable]';
  if (depth >= 5) return '[truncated]';
  if (value instanceof Error) {
    return {
      name: value.name,
      code: value.code || undefined,
      message: value instanceof DomainError ? value.safeMessage : 'Internal error'
    };
  }
  if (typeof value !== 'object') return '[unserializable]';
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, 25).map((item) => redactDetail(item, depth + 1, seen));

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactDetail(item, depth + 1, seen);
  }
  return output;
}

class DomainError extends Error {
  constructor(code, safeMessage, options = {}) {
    super(String(safeMessage || 'Operation failed'), options.cause ? { cause: options.cause } : undefined);
    this.name = 'DomainError';
    this.code = code || ERROR_CODES.INTERNAL_ERROR;
    this.safeMessage = String(safeMessage || 'Operation failed');
    this.retryable = Boolean(options.retryable);
    this.details = redactDetail(options.details || {});
    Error.captureStackTrace?.(this, DomainError);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.safeMessage,
        retryable: this.retryable,
        details: this.details
      }
    };
  }

  static wrap(error, fallbackCode = ERROR_CODES.INTERNAL_ERROR, safeMessage = 'Internal error') {
    if (error instanceof DomainError) return error;
    return new DomainError(fallbackCode, safeMessage, { cause: error });
  }
}

module.exports = {
  DomainError,
  ERROR_CODES,
  redactDetail
};
