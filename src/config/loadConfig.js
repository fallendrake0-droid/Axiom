'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BOT_IDENTITIES = Object.freeze([
  'hsqoswqi',
  'qojjosqsjiox',
  'soiqsjowisjo',
  'sqisoqwsi',
  'sqosuqwos'
]);

const DEFAULTS = Object.freeze({
  minecraftHost: 'ZCClanOnTOP.aternos.me',
  minecraftPort: 25565,
  minecraftVersion: '26.2',
  minecraftAuth: 'offline',
  authorisedOfflineHost: 'ZCClanOnTOP.aternos.me',
  maxLiveConnections: 1,
  loginStaggerMs: 4000,
  viewDistance: 4,
  reconnectMaxAttempts: 5,
  reconnectBaseMs: 5000,
  reconnectMaxMs: 120000,
  memorySoftLimitMb: 350,
  memoryCriticalLimitMb: 450,
  eventLoopSoftLimitMs: 150,
  chatEnabled: true,
  chatProactive: false,
  chatCooldownMs: 7000,
  chatGlobalMaxPerMinute: 3,
  chatCommandsEnabled: false,
  allowExperimentalProtocol: false,
  dataDir: './data',
  logLevel: 'info'
});

class ConfigValidationError extends Error {
  constructor(errors) {
    super(`Configuration invalid:\n- ${errors.join('\n- ')}`);
    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}

function parseDotEnv(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsAt = line.indexOf('=');
    if (equalsAt <= 0) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadDotEnvFile(filePath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) return { exists: false, values: {} };
  return { exists: true, values: parseDotEnv(fs.readFileSync(filePath, 'utf8')) };
}

function stringValue(env, key, fallback) {
  const value = env[key];
  return value === undefined || value === '' ? fallback : String(value).trim();
}

function booleanValue(env, key, fallback) {
  const value = env[key];
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return Symbol.for(`invalid-boolean:${key}`);
}

function integerValue(env, key, fallback) {
  const value = env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function parseEnabledBots(raw) {
  if (Array.isArray(raw)) return raw.map((value) => String(value).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function loadConfig({ env = process.env, cwd = process.cwd(), dotEnvValues } = {}) {
  const fileValues = dotEnvValues || loadDotEnvFile(path.resolve(cwd, '.env')).values;
  const values = { ...fileValues, ...env };

  const config = {
    server: {
      host: stringValue(values, 'AXIOM_MINECRAFT_HOST', DEFAULTS.minecraftHost),
      port: integerValue(values, 'AXIOM_MINECRAFT_PORT', DEFAULTS.minecraftPort),
      version: stringValue(values, 'AXIOM_MINECRAFT_VERSION', DEFAULTS.minecraftVersion),
      auth: stringValue(values, 'AXIOM_MINECRAFT_AUTH', DEFAULTS.minecraftAuth),
      offlineServerAuthorized: booleanValue(
        values,
        'AXIOM_OFFLINE_SERVER_AUTHORIZED',
        false
      ),
      authorizedOfflineHost: stringValue(
        values,
        'AXIOM_AUTHORIZED_OFFLINE_HOST',
        DEFAULTS.authorisedOfflineHost
      ),
      allowExperimentalProtocol: booleanValue(
        values,
        'AXIOM_ALLOW_EXPERIMENTAL_PROTOCOL',
        DEFAULTS.allowExperimentalProtocol
      )
    },
    swarm: {
      botIdentities: parseEnabledBots(
        stringValue(values, 'AXIOM_ENABLED_BOTS', BOT_IDENTITIES.join(','))
      ),
      maxLiveConnections: integerValue(
        values,
        'AXIOM_MAX_LIVE_CONNECTIONS',
        DEFAULTS.maxLiveConnections
      ),
      loginStaggerMs: integerValue(values, 'AXIOM_LOGIN_STAGGER_MS', DEFAULTS.loginStaggerMs),
      viewDistance: integerValue(values, 'AXIOM_VIEW_DISTANCE', DEFAULTS.viewDistance)
    },
    reconnect: {
      maxAttempts: integerValue(
        values,
        'AXIOM_RECONNECT_MAX_ATTEMPTS',
        DEFAULTS.reconnectMaxAttempts
      ),
      baseMs: integerValue(values, 'AXIOM_RECONNECT_BASE_MS', DEFAULTS.reconnectBaseMs),
      maxMs: integerValue(values, 'AXIOM_RECONNECT_MAX_MS', DEFAULTS.reconnectMaxMs)
    },
    resources: {
      memorySoftLimitMb: integerValue(
        values,
        'AXIOM_MEMORY_SOFT_LIMIT_MB',
        DEFAULTS.memorySoftLimitMb
      ),
      memoryCriticalLimitMb: integerValue(
        values,
        'AXIOM_MEMORY_CRITICAL_LIMIT_MB',
        DEFAULTS.memoryCriticalLimitMb
      ),
      eventLoopSoftLimitMs: integerValue(
        values,
        'AXIOM_EVENT_LOOP_SOFT_LIMIT_MS',
        DEFAULTS.eventLoopSoftLimitMs
      )
    },
    chat: {
      enabled: booleanValue(values, 'AXIOM_CHAT_ENABLED', DEFAULTS.chatEnabled),
      proactive: booleanValue(values, 'AXIOM_CHAT_PROACTIVE', DEFAULTS.chatProactive),
      cooldownMs: integerValue(values, 'AXIOM_CHAT_COOLDOWN_MS', DEFAULTS.chatCooldownMs),
      globalMaxPerMinute: integerValue(
        values,
        'AXIOM_CHAT_GLOBAL_MAX_PER_MINUTE',
        DEFAULTS.chatGlobalMaxPerMinute
      ),
      commandsEnabled: booleanValue(
        values,
        'AXIOM_CHAT_COMMANDS_ENABLED',
        DEFAULTS.chatCommandsEnabled
      )
    },
    runtime: {
      dataDir: path.resolve(cwd, stringValue(values, 'AXIOM_DATA_DIR', DEFAULTS.dataDir)),
      logLevel: stringValue(values, 'AXIOM_LOG_LEVEL', DEFAULTS.logLevel).toLowerCase()
    }
  };

  validateConfig(config);
  return deepFreeze(config);
}

function validateConfig(config) {
  const errors = [];
  const invalidBoolean = (value) => typeof value === 'symbol';
  const everyPositiveInteger = (value) => Number.isInteger(value) && value > 0;

  if (!/^[a-zA-Z0-9.-]+$/.test(config.server.host)) {
    errors.push('AXIOM_MINECRAFT_HOST must be a hostname, not a URL or shell fragment.');
  }
  if (!Number.isInteger(config.server.port) || config.server.port < 1 || config.server.port > 65535) {
    errors.push('AXIOM_MINECRAFT_PORT must be an integer between 1 and 65535.');
  }
  if (!config.server.version) errors.push('AXIOM_MINECRAFT_VERSION is required and cannot be auto.');
  if (config.server.version.toLowerCase() === 'auto') {
    errors.push('AXIOM_MINECRAFT_VERSION must be pinned; automatic protocol selection is disabled.');
  }
  if (config.server.auth !== 'offline') {
    errors.push('This initial worker supports only the explicitly authorised offline profile.');
  }
  if (invalidBoolean(config.server.offlineServerAuthorized)) {
    errors.push('AXIOM_OFFLINE_SERVER_AUTHORIZED must be exactly true or false.');
  }
  if (invalidBoolean(config.server.allowExperimentalProtocol)) {
    errors.push('AXIOM_ALLOW_EXPERIMENTAL_PROTOCOL must be exactly true or false.');
  }
  if (config.server.auth === 'offline' && !config.server.offlineServerAuthorized) {
    errors.push(
      'Offline-mode connection requires AXIOM_OFFLINE_SERVER_AUTHORIZED=true after owner confirmation.'
    );
  }
  if (config.server.host.toLowerCase() !== config.server.authorizedOfflineHost.toLowerCase()) {
    errors.push(
      'Offline-mode host must exactly match AXIOM_AUTHORIZED_OFFLINE_HOST; arbitrary offline targets are refused.'
    );
  }
  if (!Array.isArray(config.swarm.botIdentities) || config.swarm.botIdentities.length !== BOT_IDENTITIES.length) {
    errors.push(`AXIOM_ENABLED_BOTS must contain all ${BOT_IDENTITIES.length} approved bot identities exactly once.`);
  } else {
    const identities = new Set(config.swarm.botIdentities);
    if (identities.size !== BOT_IDENTITIES.length || BOT_IDENTITIES.some((identity) => !identities.has(identity))) {
      errors.push('AXIOM_ENABLED_BOTS may only contain the five approved identities, without duplicates.');
    }
  }
  if (
    !Number.isInteger(config.swarm.maxLiveConnections) ||
    config.swarm.maxLiveConnections < 1 ||
    config.swarm.maxLiveConnections > BOT_IDENTITIES.length
  ) {
    errors.push(`AXIOM_MAX_LIVE_CONNECTIONS must be an integer from 1 to ${BOT_IDENTITIES.length}.`);
  }
  if (!Number.isInteger(config.swarm.loginStaggerMs) || config.swarm.loginStaggerMs < 2500) {
    errors.push('AXIOM_LOGIN_STAGGER_MS must be at least 2500ms to avoid connection bursts.');
  }
  if (!Number.isInteger(config.swarm.viewDistance) || config.swarm.viewDistance < 2 || config.swarm.viewDistance > 10) {
    errors.push('AXIOM_VIEW_DISTANCE must be an integer from 2 to 10.');
  }
  if (!everyPositiveInteger(config.reconnect.maxAttempts) || config.reconnect.maxAttempts > 10) {
    errors.push('AXIOM_RECONNECT_MAX_ATTEMPTS must be an integer from 1 to 10.');
  }
  if (!everyPositiveInteger(config.reconnect.baseMs) || !everyPositiveInteger(config.reconnect.maxMs)) {
    errors.push('Reconnect delays must be positive integers.');
  } else if (config.reconnect.baseMs > config.reconnect.maxMs) {
    errors.push('AXIOM_RECONNECT_BASE_MS cannot exceed AXIOM_RECONNECT_MAX_MS.');
  }
  if (!everyPositiveInteger(config.resources.memorySoftLimitMb) || !everyPositiveInteger(config.resources.memoryCriticalLimitMb)) {
    errors.push('Resource memory limits must be positive integers.');
  } else if (config.resources.memorySoftLimitMb >= config.resources.memoryCriticalLimitMb) {
    errors.push('AXIOM_MEMORY_SOFT_LIMIT_MB must be lower than AXIOM_MEMORY_CRITICAL_LIMIT_MB.');
  }
  if (!everyPositiveInteger(config.resources.eventLoopSoftLimitMs)) {
    errors.push('AXIOM_EVENT_LOOP_SOFT_LIMIT_MS must be a positive integer.');
  }
  for (const [key, value] of Object.entries({
    AXIOM_CHAT_ENABLED: config.chat.enabled,
    AXIOM_CHAT_PROACTIVE: config.chat.proactive,
    AXIOM_CHAT_COMMANDS_ENABLED: config.chat.commandsEnabled
  })) {
    if (invalidBoolean(value)) errors.push(`${key} must be exactly true or false.`);
  }
  if (config.chat.commandsEnabled) {
    errors.push('AXIOM_CHAT_COMMANDS_ENABLED must remain false; in-game chat is never an operator channel.');
  }
  if (config.chat.proactive) {
    errors.push('AXIOM_CHAT_PROACTIVE is not implemented in this first slice and must remain false.');
  }
  if (!everyPositiveInteger(config.chat.cooldownMs) || config.chat.cooldownMs < 1000) {
    errors.push('AXIOM_CHAT_COOLDOWN_MS must be at least 1000ms.');
  }
  if (!Number.isInteger(config.chat.globalMaxPerMinute) || config.chat.globalMaxPerMinute < 1 || config.chat.globalMaxPerMinute > 20) {
    errors.push('AXIOM_CHAT_GLOBAL_MAX_PER_MINUTE must be an integer from 1 to 20.');
  }
  if (!['debug', 'info', 'warn', 'error'].includes(config.runtime.logLevel)) {
    errors.push('AXIOM_LOG_LEVEL must be debug, info, warn, or error.');
  }
  if (errors.length > 0) throw new ConfigValidationError(errors);
}

function redactConfig(config) {
  return {
    server: {
      host: config.server.host,
      port: config.server.port,
      version: config.server.version,
      auth: config.server.auth,
      offlineServerAuthorized: config.server.offlineServerAuthorized,
      authorizedOfflineHost: config.server.authorizedOfflineHost,
      allowExperimentalProtocol: config.server.allowExperimentalProtocol
    },
    swarm: { ...config.swarm },
    reconnect: { ...config.reconnect },
    resources: { ...config.resources },
    chat: { ...config.chat },
    runtime: { dataDir: config.runtime.dataDir, logLevel: config.runtime.logLevel }
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

module.exports = {
  BOT_IDENTITIES,
  ConfigValidationError,
  DEFAULTS,
  loadConfig,
  loadDotEnvFile,
  parseDotEnv,
  redactConfig,
  validateConfig
};
