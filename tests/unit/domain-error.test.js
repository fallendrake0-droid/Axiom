'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { DomainError, ERROR_CODES, redactDetail } = require('../../src/core/DomainError');

test('DomainError returns a safe serialisable error envelope', () => {
  const error = new DomainError(ERROR_CODES.FORBIDDEN, 'Action is not permitted', {
    retryable: false,
    details: { apiKey: 'must-not-leak', nested: { token: 'must-not-leak', retained: 'ok' } }
  });

  assert.deepEqual(error.toJSON(), {
    error: {
      code: ERROR_CODES.FORBIDDEN,
      message: 'Action is not permitted',
      retryable: false,
      details: { apiKey: '[REDACTED]', nested: { token: '[REDACTED]', retained: 'ok' } }
    }
  });
});

test('DomainError.wrap preserves a typed error and shields raw error messages', () => {
  const typed = new DomainError(ERROR_CODES.INVALID_INPUT, 'Invalid request');
  assert.equal(DomainError.wrap(typed), typed);

  const wrapped = DomainError.wrap(new Error('postgres://password@private-host'), ERROR_CODES.INTERNAL_ERROR, 'Internal failure');
  assert.equal(wrapped.code, ERROR_CODES.INTERNAL_ERROR);
  assert.equal(wrapped.safeMessage, 'Internal failure');
  assert.equal(JSON.stringify(wrapped.toJSON()).includes('private-host'), false);
});

test('detail redaction bounds cyclic and secret-bearing structures', () => {
  const detail = { authorization: 'Bearer hidden', long: 'x'.repeat(700) };
  detail.self = detail;
  const result = redactDetail(detail);

  assert.equal(result.authorization, '[REDACTED]');
  assert.equal(result.long.endsWith('…'), true);
  assert.equal(result.self, '[circular]');
});
