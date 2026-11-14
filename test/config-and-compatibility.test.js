'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  BOT_IDENTITIES,
  ConfigValidationError,
  loadConfig,
  redactConfig
} = require('../src/config/loadConfig');
const {
  inspectProtocolCompatibility,
  normalizeVersionList
} = require('../src/minecraft/compatibility');
const { ServerValidationError, validateServerStatus, versionMatches } = require('../src/minecraft/ServerProbe');

function authorizedEnv(overrides = {}) {
  return {
    AXIOM_OFFLINE_SERVER_AUTHORIZED: 'true',
    AXIOM_AUTHORIZED_OFFLINE_HOST: 'ZCClanOnTOP.aternos.me',
    AXIOM_MINECRAFT_HOST: 'ZCClanOnTOP.aternos.me',
    AXIOM_MINECRAFT_VERSION: '26.2',
    AXIOM_ENABLED_BOTS: BOT_IDENTITIES.join(','),
    AXIOM_CHAT_PROACTIVE: 'false',
    AXIOM_CHAT_COMMANDS_ENABLED: 'false',
    ...overrides
  };
}

test('configuration accepts only the acknowledged authorised offline target', () => {
  const config = loadConfig({ env: authorizedEnv(), cwd: process.cwd(), dotEnvValues: {} });
  assert.equal(config.server.host, 'ZCClanOnTOP.aternos.me');
  assert.equal(config.server.offlineServerAuthorized, true);
  assert.equal(config.swarm.maxLiveConnections, 1);
  assert.deepEqual(config.swarm.botIdentities, BOT_IDENTITIES);
  assert.equal(redactConfig(config).server.auth, 'offline');
});

test('configuration fails closed for arbitrary offline hosts and in-game command enablement', () => {
  assert.throws(
    () =>
      loadConfig({
        env: authorizedEnv({ AXIOM_MINECRAFT_HOST: 'unapproved.example', AXIOM_CHAT_COMMANDS_ENABLED: 'true' }),
        cwd: process.cwd(),
        dotEnvValues: {}
      }),
    (error) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.match(error.message, /Offline-mode host must exactly match/);
      assert.match(error.message, /CHAT_COMMANDS_ENABLED/);
      return true;
    }
  );
});

test('configuration requires an explicit offline authorisation acknowledgement', () => {
  assert.throws(
    () => loadConfig({ env: authorizedEnv({ AXIOM_OFFLINE_SERVER_AUTHORIZED: 'false' }), cwd: process.cwd(), dotEnvValues: {} }),
    /Offline-mode connection requires/
  );
});

test('server status must advertise the pinned version before any bot login', () => {
  const status = validateServerStatus({
    host: 'ZCClanOnTOP.aternos.me',
    port: 25565,
    requestedVersion: '26.2',
    status: { version: { name: '26.2', protocol: 999 }, players: { online: 1, max: 20 }, latency: 4 }
  });
  assert.deepEqual(status, {
    version: { name: '26.2', protocol: 999 },
    players: { online: 1, max: 20 },
    latency: 4
  });
  assert.equal(versionMatches('26.2-Spigot', '26.2'), true);
  assert.equal(versionMatches('26.20', '26.2'), false);
  assert.throws(
    () => validateServerStatus({ host: 'host', port: 25565, requestedVersion: '26.2', status: { version: { name: '1.21.11' } } }),
    ServerValidationError
  );
});

test('protocol compatibility accepts exact versions and does not silently substitute close versions', () => {
  const minecraftDataModule = {
    versions: {
      pc: [
        { minecraftVersion: '26.2', majorVersion: '26.2' },
        { minecraftVersion: '26.2-rc-2' },
        { minecraftVersion: '1.21.11' }
      ]
    }
  };
  const compatible = inspectProtocolCompatibility({ requestedVersion: '26.2', minecraftDataModule });
  assert.equal(compatible.compatible, true);
  assert.equal(compatible.experimental, false);

  const unsupported = inspectProtocolCompatibility({ requestedVersion: '26.3', minecraftDataModule });
  assert.equal(unsupported.compatible, false);
  assert.match(unsupported.reason, /will not substitute/);

  const experimental = inspectProtocolCompatibility({
    requestedVersion: '26.3',
    allowExperimentalProtocol: true,
    minecraftDataModule
  });
  assert.equal(experimental.compatible, true);
  assert.equal(experimental.experimental, true);
  assert.deepEqual(normalizeVersionList(minecraftDataModule.versions.pc), ['1.21.11', '26.2', '26.2-rc-2']);
});
