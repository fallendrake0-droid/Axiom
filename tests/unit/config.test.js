'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { DomainError, ERROR_CODES } = require('../../src/core/DomainError');
const {
  BOT_IDENTITIES,
  ConfigLoader,
  DEFAULT_CONFIG,
  SUPPORTED_MINECRAFT_VERSIONS
} = require('../../src/config/ConfigLoader');

function targetProfile(overrides = {}) {
  return {
    id: 'zcclan-authorised',
    host: 'ZCClanOnTOP.aternos.me',
    port: 25565,
    edition: 'java',
    version: '26.2',
    authMode: 'offline_owner_authorised',
    serverApprovedByOperator: false,
    aternos: true,
    operatorSessionRequired: true,
    connectionCap: 5,
    loginSpacingMs: 5000,
    protectedRegions: [],
    allowedDimensions: ['minecraft:overworld'],
    allowPvp: false,
    compatibilityState: 'blocked_unverified',
    ...overrides
  };
}

function loader(options = {}) {
  return new ConfigLoader({
    env: {},
    runtimeVersion: 'v22.22.3',
    ...options
  });
}

function assertDomainError(expectedCode, fn) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

test('safe defaults are immutable, contain five logical identities, and do not enable networked adapters', () => {
  const config = loader().loadFromObject({});

  assert.equal(config.bots.configuredIdentities.length, 5);
  assert.deepEqual(config.bots.configuredIdentities, BOT_IDENTITIES);
  assert.equal(config.dashboard.enabled, false);
  assert.equal(config.discord.enabled, false);
  assert.equal(config.ai.providers.ollama.enabled, false);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.bots.configuredIdentities), true);
  assert.throws(() => { config.bots.maxIdentities = 1; }, TypeError);
  assert.equal(DEFAULT_CONFIG.bots.maxIdentities, 5);
});

test('example configuration validates but remains unable to connect to the 26.2 target', () => {
  const examplePath = path.resolve(__dirname, '../../config/axiom.config.example.json');
  const config = loader().loadFromObject(JSON.parse(fs.readFileSync(examplePath, 'utf8')));
  const configLoader = loader();
  configLoader.loadFromObject(config);

  assert.equal(config.serverProfiles[0].host, 'ZCClanOnTOP.aternos.me');
  assertDomainError(ERROR_CODES.MINECRAFT_VERSION_UNSUPPORTED, () => {
    configLoader.assertConnectionAllowed('zcclan-authorised', { operatorSessionApproved: true });
  });
  assert.deepEqual(SUPPORTED_MINECRAFT_VERSIONS, ['26.1']);
});

test('unknown and prototype-polluting properties fail closed', () => {
  assertDomainError(ERROR_CODES.CONFIG_UNKNOWN_PROPERTY, () => {
    loader().loadFromObject({ ai: { unexpectedProviderToggle: true } });
  });

  const polluted = JSON.parse('{"__proto__":{"polluted":true}}');
  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject(polluted);
  });
  assert.equal({}.polluted, undefined);
});

test('bot identity and capacity constraints prevent duplicate or oversized swarms', () => {
  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({
      bots: {
        configuredIdentities: [
          { id: 'bot-1', username: 'AlphaBot', enabled: true },
          { id: 'bot-2', username: 'alphabot', enabled: true }
        ]
      }
    });
  });

  const sixBots = Array.from({ length: 6 }, (_, index) => ({
    id: `bot-${index + 1}`,
    username: `botname${index + 1}`,
    enabled: true
  }));
  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({ bots: { configuredIdentities: sixBots } });
  });

  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({ bots: { certifiedLiveConnectionCeiling: 5, requestedLiveConnectionCeiling: 1 } });
  });
});

test('Aternos profiles cannot auto-connect and require explicit per-session authority', () => {
  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({
      serverProfiles: [targetProfile({ version: '26.1', compatibilityState: 'verified', serverApprovedByOperator: true })],
      bots: { autoConnect: true }
    });
  });

  const configLoader = loader();
  configLoader.loadFromObject({
    serverProfiles: [targetProfile({ version: '26.1', compatibilityState: 'verified', serverApprovedByOperator: true })]
  });
  assertDomainError(ERROR_CODES.OPERATOR_SESSION_REQUIRED, () => {
    configLoader.assertConnectionAllowed('zcclan-authorised');
  });
  assert.equal(configLoader.assertConnectionAllowed('zcclan-authorised', { operatorSessionApproved: true }).version, '26.1');
});

test('hosted providers, Discord, and dashboard fail closed without required secrets and IDs', () => {
  assertDomainError(ERROR_CODES.CONFIG_SECRET_MISSING, () => {
    loader().loadFromObject({
      ai: {
        providers: {
          gemini: { enabled: true, model: 'candidate-free-model', freeAccessAcknowledged: true }
        }
      }
    });
  });

  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({ discord: { enabled: true } });
  });

  assertDomainError(ERROR_CODES.CONFIG_SECRET_MISSING, () => {
    loader().loadFromObject({
      discord: { enabled: true, guildId: '123456789012345', authorizedUserIds: ['123456789012345'] }
    });
  });

  assertDomainError(ERROR_CODES.CONFIG_SECRET_MISSING, () => {
    loader().loadFromObject({ dashboard: { enabled: true } });
  });

  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({ dashboard: { bindHost: '0.0.0.0' } });
  });
});

test('provider transport policy and configuration events are bounded and redacted', () => {
  const events = [];
  const configLoader = loader({ emitEvent: (event) => events.push(event) });
  const config = configLoader.loadFromObject({
    ai: {
      providers: {
        ollama: { baseUrl: 'https://ollama.private.example' }
      }
    }
  });

  assert.equal(config.ai.providers.ollama.enabled, false);
  assert.deepEqual(events, [{ type: 'config.loaded', schemaVersion: 1, configHash: configLoader.configHash }]);
  const snapshot = configLoader.redactedSnapshot();
  assert.equal(snapshot.ai.providers.ollama.baseUrl, '[REDACTED]');
  assert.equal(snapshot.persistence.path, '[REDACTED]');

  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({ ai: { providers: { ollama: { baseUrl: 'http://ollama.private.example' } } } });
  });
});

test('load enforces private configuration file permissions outside Windows', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-config-'));
  const configPath = path.join(directory, 'axiom.config.json');
  try {
    fs.writeFileSync(configPath, '{}', { mode: 0o600 });
    fs.chmodSync(configPath, 0o600);
    assert.equal(loader({ configPath, platform: 'linux' }).load().schemaVersion, 1);

    fs.chmodSync(configPath, 0o644);
    assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
      loader({ configPath, platform: 'linux' }).load();
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('configuration observers cannot change a valid result and missing-file errors do not disclose local paths', () => {
  const configLoader = loader({ emitEvent: () => { throw new Error('observer failed'); } });
  assert.equal(configLoader.loadFromObject({}).schemaVersion, 1);

  const missing = loader({ configPath: path.resolve(__dirname, '../../private/does-not-exist.json') });
  assertDomainError(ERROR_CODES.CONFIG_FILE_NOT_FOUND, () => missing.load());
  try {
    missing.load();
  } catch (error) {
    assert.equal(JSON.stringify(error.toJSON()).includes('private/does-not-exist'), false);
  }
});

test('Discord development configuration requires a guild ID before token validation', () => {
  assertDomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, () => {
    loader().loadFromObject({ discord: { enabled: true, authorizedUserIds: ['123456789012345'] } });
  });
});
