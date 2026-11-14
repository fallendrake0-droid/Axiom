'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { DomainError, ERROR_CODES } = require('../../src/core/DomainError');
const { run } = require('../../src/cli/start');

function sink() {
  const values = [];
  return {
    values,
    write(value) {
      values.push(value);
    }
  };
}

test('safe start validates configuration and starts no networked service', () => {
  const stdout = sink();
  const stderr = sink();
  const result = run({
    loadConfiguration: () => ({
      config: { schemaVersion: 1 },
      loader: { configHash: 'safe-config-hash' }
    }),
    stdout,
    stderr
  });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.result, {
    status: 'FOUNDATION_READY',
    mode: 'configuration_only',
    schemaVersion: 1,
    configHash: 'safe-config-hash',
    networkStarted: false,
    liveConnections: 0,
    message: 'Configuration validated. No networked AXIOM service was started.'
  });
  assert.deepEqual(JSON.parse(stdout.values.join('')), result.result);
  assert.deepEqual(stderr.values, []);
});

test('safe start returns only a typed safe error when configuration cannot load', () => {
  const stdout = sink();
  const stderr = sink();
  const result = run({
    loadConfiguration: () => {
      throw new DomainError(ERROR_CODES.CONFIG_FILE_NOT_FOUND, 'Configuration file was not found', {
        details: { path: '/private/config.json' }
      });
    },
    stdout,
    stderr
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.result.error.code, ERROR_CODES.CONFIG_FILE_NOT_FOUND);
  assert.equal(result.result.error.message, 'Configuration file was not found');
  assert.equal(JSON.stringify(result.result).includes('/private/config.json'), false);
  assert.deepEqual(stdout.values, []);
  assert.deepEqual(JSON.parse(stderr.values.join('')), result.result);
});

test('CLI fails safely when the private local configuration file is missing', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-start-missing-'));
  const cliPath = path.resolve(__dirname, '../../src/cli/start.js');

  try {
    const child = spawnSync(process.execPath, [cliPath], {
      cwd: directory,
      encoding: 'utf8'
    });

    assert.equal(child.status, 1);
    assert.equal(child.stdout, '');
    const result = JSON.parse(child.stderr);
    assert.equal(result.error.code, ERROR_CODES.CONFIG_FILE_NOT_FOUND);
    assert.equal(result.error.message, 'Configuration file was not found');
    assert.equal(JSON.stringify(result).includes(directory), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI starts only the safe foundation with a private local configuration file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-start-'));
  const configDirectory = path.join(directory, 'config');
  const sourceExample = path.resolve(__dirname, '../../config/axiom.config.example.json');
  const cliPath = path.resolve(__dirname, '../../src/cli/start.js');

  try {
    fs.mkdirSync(configDirectory);
    fs.copyFileSync(sourceExample, path.join(configDirectory, 'axiom.config.json'));
    fs.chmodSync(path.join(configDirectory, 'axiom.config.json'), 0o600);

    const child = spawnSync(process.execPath, [cliPath], {
      cwd: directory,
      encoding: 'utf8'
    });

    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stderr, '');
    const result = JSON.parse(child.stdout);
    assert.equal(result.status, 'FOUNDATION_READY');
    assert.equal(result.mode, 'configuration_only');
    assert.equal(result.networkStarted, false);
    assert.equal(result.liveConnections, 0);
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.configHash.length, 64);
    assert.equal(child.stdout.includes('ZCClanOnTOP.aternos.me'), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
