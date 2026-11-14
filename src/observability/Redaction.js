'use strict';

const SENSITIVE_KEY_PATTERN = /(?:api[_-]?key|authorization|bearer|cookie|credential|pass(?:word)?|private[_-]?key|secret|session|token)/i;
const PRIVATE_ADDRESS_KEY_PATTERN = /(?:baseurl|host|hostname|url|path|certificate|cert|ca)/i;

function redact(value, options = {}, depth = 0, seen = new WeakSet()) {
  const {
    maxDepth = 6,
    maxArrayLength = 50,
    maxStringLength = 2048,
    redactPrivateAddresses = false
  } = options;

  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > maxStringLength ? `${value.slice(0, maxStringLength)}…` : value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'symbol' || typeof value === 'function') return '[unserializable]';
  if (value instanceof Error) {
    return {
      name: value.name,
      code: value.code || undefined,
      message: value.safeMessage || 'Internal error'
    };
  }
  if (depth >= maxDepth) return '[truncated]';
  if (typeof value !== 'object') return '[unserializable]';
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, maxArrayLength).map((entry) => redact(entry, options, depth + 1, seen));
  }

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key) || (redactPrivateAddresses && PRIVATE_ADDRESS_KEY_PATTERN.test(key))) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redact(child, options, depth + 1, seen);
    }
  }
  return output;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  redact,
  stableStringify,
  SENSITIVE_KEY_PATTERN
};
