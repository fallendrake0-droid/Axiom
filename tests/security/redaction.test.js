'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createLogger } = require('../../src/observability/Logger');
const { redact, stableStringify } = require('../../src/observability/Redaction');

test('redaction removes credentials recursively and handles circular values', () => {
  const value = {
    apiKey: 'key-123',
    nested: { discordToken: 'discord-secret', ok: 'retain' },
    serverHost: 'private.example'
  };
  value.self = value;

  const result = redact(value, { redactPrivateAddresses: true });
  assert.deepEqual(result, {
    apiKey: '[REDACTED]',
    nested: { discordToken: '[REDACTED]', ok: 'retain' },
    serverHost: '[REDACTED]',
    self: '[circular]'
  });
});

test('structured logger emits safe JSON records and respects level threshold', () => {
  const records = [];
  const logger = createLogger({
    level: 'info',
    bindings: { module: 'ConfigLoader' },
    clock: () => '2026-11-14T00:00:00.000Z',
    sink: (record) => records.push(record)
  });

  assert.equal(logger.debug('ignored', { token: 'nope' }), false);
  assert.equal(logger.info('Loaded', { apiKey: 'hidden', nested: { password: 'hidden' } }), true);
  assert.deepEqual(records, [{
    timestamp: '2026-11-14T00:00:00.000Z',
    level: 'info',
    message: 'Loaded',
    module: 'ConfigLoader',
    apiKey: '[REDACTED]',
    nested: { password: '[REDACTED]' }
  }]);
});

test('logger protects fixed record metadata from untrusted context', () => {
  const records = [];
  const logger = createLogger({
    clock: () => '2026-11-14T00:00:00.000Z',
    sink: (record) => records.push(record)
  });

  logger.warn('Safe message', { level: 'debug', timestamp: 'forged', message: 'forged' });
  assert.deepEqual(records, [{
    level: 'warn',
    timestamp: '2026-11-14T00:00:00.000Z',
    message: 'Safe message'
  }]);
});

test('stableStringify is deterministic for configuration hashing', () => {
  assert.equal(stableStringify({ z: 1, a: { b: 2, a: 3 } }), '{"a":{"a":3,"b":2},"z":1}');
});
