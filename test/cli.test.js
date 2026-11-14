'use strict';

const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const test = require('node:test');
const { BOT_IDENTITIES } = require('../src/config/loadConfig');
const { runCli } = require('../index');

function capture() {
  let text = '';
  return {
    stream: new Writable({
      write(chunk, encoding, callback) {
        text += chunk.toString();
        callback();
      }
    }),
    read: () => text
  };
}

function env() {
  return {
    AXIOM_OFFLINE_SERVER_AUTHORIZED: 'true',
    AXIOM_MINECRAFT_HOST: 'ZCClanOnTOP.aternos.me',
    AXIOM_AUTHORIZED_OFFLINE_HOST: 'ZCClanOnTOP.aternos.me',
    AXIOM_ENABLED_BOTS: BOT_IDENTITIES.join(','),
    AXIOM_CHAT_PROACTIVE: 'false',
    AXIOM_CHAT_COMMANDS_ENABLED: 'false'
  };
}

test('dry run checks configuration and package compatibility without creating a bot connection', async () => {
  const stdout = capture();
  const stderr = capture();
  const result = await runCli(['--dry-run'], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: env(),
    cwd: process.cwd(),
    minecraftDataModule: { versions: { pc: [{ minecraftVersion: '26.2' }] } }
  });
  assert.equal(result.exitCode, 0);
  assert.equal(stderr.read(), '');
  assert.deepEqual(JSON.parse(stdout.read()).liveConnectionsOpened, 0);
});

test('CLI rejects unsupported options without starting a worker', async () => {
  const stdout = capture();
  const stderr = capture();
  const result = await runCli(['--not-a-command'], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: env(),
    cwd: process.cwd()
  });
  assert.equal(result.exitCode, 1);
  assert.match(stderr.read(), /Unknown option/);
});
