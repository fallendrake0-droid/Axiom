'use strict';

const { DomainError, ERROR_CODES } = require('../core/DomainError');

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function fail(code, message, details = {}) {
  throw new DomainError(code, message, { details });
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, path) {
  if (!isPlainObject(value)) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must be an object`, { path });
  }
  return value;
}

function assertNoDangerousKeys(value, path = 'config', seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must not contain circular references`, { path });
  }
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path}.${key} is forbidden`, { path: `${path}.${key}` });
    }
    assertNoDangerousKeys(child, `${path}.${key}`, seen);
  }
}

function assertKnownKeys(value, allowedKeys, path) {
  assertPlainObject(value, path);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail(ERROR_CODES.CONFIG_UNKNOWN_PROPERTY, `${path}.${key} is not allowed`, { path: `${path}.${key}` });
    }
  }
}

function assertString(value, path, options = {}) {
  const { min = 0, max = 4096, pattern = null, allowEmpty = min === 0 } = options;
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || value.length < min || value.length > max) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must be a string of length ${min}..${max}`, { path });
  }
  if (pattern && !pattern.test(value)) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} has an invalid format`, { path });
  }
  return value;
}

function assertBoolean(value, path) {
  if (typeof value !== 'boolean') {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must be a boolean`, { path });
  }
  return value;
}

function assertInteger(value, path, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must be an integer in ${min}..${max}`, { path, min, max });
  }
  return value;
}

function assertArray(value, path, options = {}) {
  const { min = 0, max = 100 } = options;
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must be an array with ${min}..${max} values`, { path, min, max });
  }
  return value;
}

function assertEnum(value, path, choices) {
  if (!choices.includes(value)) {
    fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${path} must be one of: ${choices.join(', ')}`, { path, choices });
  }
  return value;
}

function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const item of value) copy.push(deepClone(item, seen));
    return copy;
  }
  assertPlainObject(value, 'value');
  const copy = {};
  seen.set(value, copy);
  for (const [key, item] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      fail(ERROR_CODES.CONFIG_VALIDATION_FAILED, `value.${key} is forbidden`, { key });
    }
    copy[key] = deepClone(item, seen);
  }
  return copy;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function deepMerge(base, overlay) {
  const output = deepClone(base);
  if (overlay === undefined) return output;
  assertPlainObject(overlay, 'config');
  assertNoDangerousKeys(overlay);

  for (const [key, incoming] of Object.entries(overlay)) {
    if (isPlainObject(incoming) && isPlainObject(output[key])) {
      output[key] = deepMerge(output[key], incoming);
    } else {
      output[key] = deepClone(incoming);
    }
  }
  return output;
}

module.exports = {
  DANGEROUS_KEYS,
  assertArray,
  assertBoolean,
  assertEnum,
  assertInteger,
  assertKnownKeys,
  assertNoDangerousKeys,
  assertPlainObject,
  assertString,
  deepClone,
  deepFreeze,
  deepMerge,
  isPlainObject
};
