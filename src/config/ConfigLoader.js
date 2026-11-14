'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DomainError, ERROR_CODES } = require('../core/DomainError');
const {
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
  deepMerge
} = require('../shared/validation');
const { redact, stableStringify } = require('../observability/Redaction');

const BOT_IDENTITIES = Object.freeze([
  Object.freeze({ id: 'bot-1', username: 'hsqoswqi', enabled: true }),
  Object.freeze({ id: 'bot-2', username: 'qojjosqsjiox', enabled: true }),
  Object.freeze({ id: 'bot-3', username: 'soiqsjowisjo', enabled: true }),
  Object.freeze({ id: 'bot-4', username: 'sqisoqwsi', enabled: true }),
  Object.freeze({ id: 'bot-5', username: 'sqosuqwos', enabled: true })
]);

const SUPPORTED_MINECRAFT_VERSIONS = Object.freeze(['26.1']);
const PROVIDER_NAMES = Object.freeze(['ollama', 'gemini', 'groq']);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

const DEFAULT_CONFIG = deepFreeze({
  schemaVersion: 1,
  deployment: {
    mode: 'development',
    nodeMinMajor: 22,
    timezone: 'UTC',
    shutdownDeadlineMs: 15_000
  },
  serverProfiles: [],
  bots: {
    configuredIdentities: BOT_IDENTITIES,
    maxIdentities: 5,
    requestedLiveConnectionCeiling: 5,
    certifiedLiveConnectionCeiling: 1,
    autoConnect: false,
    viewDistance: 'tiny',
    reconnect: {
      maxTransientAttempts: 2,
      delaysMs: [5_000, 15_000]
    }
  },
  ai: {
    primary: 'ollama',
    automaticFailover: false,
    maxInFlight: 1,
    maxQueued: 3,
    requestBudget: { perHour: 20, perDay: 100 },
    providers: {
      ollama: {
        enabled: false,
        model: 'qwen2.5:0.5b',
        baseUrl: 'https://ollama.private.example',
        connectTimeoutMs: 2_500,
        warmTimeoutMs: 8_000,
        coldTimeoutMs: 20_000,
        keepAlive: '0'
      },
      gemini: { enabled: false, model: '', freeAccessAcknowledged: false },
      groq: { enabled: false, model: '', freeAccessAcknowledged: false }
    }
  },
  chat: {
    enabled: true,
    replyMode: 'mentions_and_questions',
    proactiveOllamaOnly: false,
    globalCooldownMs: 30_000,
    perBotCooldownMs: 60_000,
    maxVisibleChars: 200,
    threadMaxTurns: 12,
    threadTtlMs: 1_800_000,
    maxThreads: 64,
    storeRawChat: false
  },
  discord: {
    enabled: false,
    guildId: '',
    authorizedUserIds: [],
    registerCommandsOnStartup: false
  },
  dashboard: {
    enabled: false,
    bindHost: '127.0.0.1',
    port: 3080,
    sessionTtlMinutes: 60,
    requireHttpsOutsideLoopback: true
  },
  persistence: {
    path: '~/.local/share/axiom/axiom.sqlite',
    taskRetentionDays: 7,
    auditRetentionDays: 30,
    chatRetentionHours: 24
  },
  performance: {
    sampleIntervalMs: 5_000,
    eventLoopWarningMs: 50,
    pathfinderTickBudgetMs: 10,
    maxConcurrentPathfinders: 1,
    queueMax: 100,
    cacheMaxEntries: 256
  }
});

function parseNodeMajor(version) {
  const match = /^v?(\d+)\./.exec(String(version));
  return match ? Number(match[1]) : 0;
}

function requireSecret(env, name, minLength = 1) {
  const value = env[name];
  if (typeof value !== 'string' || value.length < minLength) {
    throw new DomainError(ERROR_CODES.CONFIG_SECRET_MISSING, `${name} is required for this enabled feature`, {
      details: { variable: name }
    });
  }
}

function validateUrl(urlText, pathName, deploymentMode) {
  assertString(urlText, pathName, { min: 1, max: 2048, allowEmpty: false });
  let parsed;
  try {
    parsed = new URL(urlText);
  } catch {
    throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${pathName} must be a valid URL`, {
      details: { path: pathName }
    });
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${pathName} must not embed credentials, query, or fragment`, {
      details: { path: pathName }
    });
  }
  const loopback = LOOPBACK_HOSTS.has(parsed.hostname);
  const permittedHttp = deploymentMode === 'development' && loopback;
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && permittedHttp)) {
    throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${pathName} must use HTTPS outside loopback development`, {
      details: { path: pathName }
    });
  }
  return parsed;
}

function assertNoSharedStorage(storagePath) {
  const normalized = storagePath.replace(/\\/g, '/');
  if (normalized.startsWith('/sdcard/') || normalized.startsWith('/storage/emulated/')) {
    throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'persistence.path must not use Android shared storage', {
      details: { path: 'persistence.path' }
    });
  }
}

class ConfigLoader {
  constructor(options = {}) {
    this.fs = options.fs || fs;
    this.env = options.env || process.env;
    this.configPath = options.configPath || path.resolve(process.cwd(), 'config/axiom.config.json');
    this.runtimeVersion = options.runtimeVersion || process.version;
    this.platform = options.platform || process.platform;
    this.defaults = options.defaults || DEFAULT_CONFIG;
    this.emitEvent = typeof options.emitEvent === 'function' ? options.emitEvent : () => {};
    this.logger = options.logger || null;
    this.config = null;
    this.configHash = null;
  }

  load() {
    let raw;
    try {
      raw = this.fs.readFileSync(this.configPath, 'utf8');
    } catch (error) {
      const code = error && error.code === 'ENOENT' ? ERROR_CODES.CONFIG_FILE_NOT_FOUND : ERROR_CODES.CONFIG_VALIDATION_FAILED;
      const safeMessage = code === ERROR_CODES.CONFIG_FILE_NOT_FOUND
        ? 'Configuration file was not found'
        : 'Configuration file could not be read';
      this._emitInvalid(code);
      throw new DomainError(code, safeMessage, { cause: error });
    }

    try {
      this._assertPrivateConfigFile();
    } catch (error) {
      const domainError = DomainError.wrap(error, ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Configuration file permissions are unsafe');
      this._emitInvalid(domainError.code);
      throw domainError;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this._emitInvalid(ERROR_CODES.CONFIG_INVALID_JSON);
      throw new DomainError(ERROR_CODES.CONFIG_INVALID_JSON, 'Configuration file contains invalid JSON', { cause: error });
    }
    return this.loadFromObject(parsed);
  }

  loadFromObject(rawConfig = {}) {
    try {
      assertPlainObject(rawConfig, 'config');
      assertNoDangerousKeys(rawConfig, 'config');
      const merged = deepMerge(this.defaults, rawConfig);
      this.validate(merged);
      this.config = deepFreeze(deepClone(merged));
      this.configHash = crypto.createHash('sha256').update(stableStringify(this.config)).digest('hex');
      const event = Object.freeze({ type: 'config.loaded', schemaVersion: 1, configHash: this.configHash });
      try {
        this.emitEvent(event);
      } catch {
        // An observer cannot invalidate a successfully validated configuration.
      }
      this.logger?.info('Configuration loaded', { configHash: this.configHash });
      return this.config;
    } catch (error) {
      const domainError = DomainError.wrap(error, ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Configuration validation failed');
      this._emitInvalid(domainError.code);
      throw domainError;
    }
  }

  validate(config) {
    assertKnownKeys(config, ['schemaVersion', 'deployment', 'serverProfiles', 'bots', 'ai', 'chat', 'discord', 'dashboard', 'persistence', 'performance'], 'config');
    assertInteger(config.schemaVersion, 'config.schemaVersion', 1, 1);
    this._validateDeployment(config.deployment);
    this._validateServerProfiles(config.serverProfiles);
    this._validateBots(config.bots, config.serverProfiles);
    this._validateAi(config.ai, config.deployment.mode);
    this._validateChat(config.chat, config.ai);
    this._validateDiscord(config.discord);
    this._validateDashboard(config.dashboard);
    this._validatePersistence(config.persistence);
    this._validatePerformance(config.performance);
    return true;
  }

  _validateDeployment(deployment) {
    assertKnownKeys(deployment, ['mode', 'nodeMinMajor', 'timezone', 'shutdownDeadlineMs'], 'deployment');
    assertEnum(deployment.mode, 'deployment.mode', ['development', 'production']);
    assertInteger(deployment.nodeMinMajor, 'deployment.nodeMinMajor', 22, 99);
    assertString(deployment.timezone, 'deployment.timezone', { min: 1, max: 64, allowEmpty: false });
    assertInteger(deployment.shutdownDeadlineMs, 'deployment.shutdownDeadlineMs', 1_000, 120_000);
    const actualMajor = parseNodeMajor(this.runtimeVersion);
    if (actualMajor < deployment.nodeMinMajor) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, `Node.js ${deployment.nodeMinMajor}+ is required`, {
        details: { actualMajor, requiredMajor: deployment.nodeMinMajor }
      });
    }
  }

  _validateServerProfiles(profiles) {
    assertArray(profiles, 'serverProfiles', { max: 20 });
    const profileIds = new Set();
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      const profilePath = `serverProfiles[${index}]`;
      assertKnownKeys(profile, ['id', 'host', 'port', 'edition', 'version', 'authMode', 'serverApprovedByOperator', 'aternos', 'operatorSessionRequired', 'connectionCap', 'loginSpacingMs', 'protectedRegions', 'allowedDimensions', 'allowPvp', 'compatibilityState'], profilePath);
      assertString(profile.id, `${profilePath}.id`, { min: 1, max: 64, pattern: /^[a-z0-9][a-z0-9-]*$/, allowEmpty: false });
      if (profileIds.has(profile.id)) {
        throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'server profile IDs must be unique', { details: { id: profile.id } });
      }
      profileIds.add(profile.id);
      assertString(profile.host, `${profilePath}.host`, { min: 1, max: 253, pattern: /^[a-zA-Z0-9.-]+$/, allowEmpty: false });
      assertInteger(profile.port, `${profilePath}.port`, 1, 65_535);
      assertEnum(profile.edition, `${profilePath}.edition`, ['java']);
      assertString(profile.version, `${profilePath}.version`, { min: 1, max: 32, pattern: /^\d+\.\d+(?:\.\d+)?$/, allowEmpty: false });
      assertEnum(profile.authMode, `${profilePath}.authMode`, ['offline_owner_authorised']);
      assertBoolean(profile.serverApprovedByOperator, `${profilePath}.serverApprovedByOperator`);
      assertBoolean(profile.aternos, `${profilePath}.aternos`);
      assertBoolean(profile.operatorSessionRequired, `${profilePath}.operatorSessionRequired`);
      assertInteger(profile.connectionCap, `${profilePath}.connectionCap`, 0, 5);
      assertInteger(profile.loginSpacingMs, `${profilePath}.loginSpacingMs`, 0, 60_000);
      assertArray(profile.protectedRegions, `${profilePath}.protectedRegions`, { max: 100 });
      assertArray(profile.allowedDimensions, `${profilePath}.allowedDimensions`, { min: 1, max: 3 });
      for (const [dimensionIndex, dimension] of profile.allowedDimensions.entries()) {
        assertEnum(dimension, `${profilePath}.allowedDimensions[${dimensionIndex}]`, ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end']);
      }
      assertBoolean(profile.allowPvp, `${profilePath}.allowPvp`);
      if (profile.allowPvp) {
        throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'PvP must remain disabled', { details: { profileId: profile.id } });
      }
      assertEnum(profile.compatibilityState, `${profilePath}.compatibilityState`, ['blocked_unverified', 'verified', 'unsupported']);
    }
  }

  _validateBots(bots, profiles) {
    assertKnownKeys(bots, ['configuredIdentities', 'maxIdentities', 'requestedLiveConnectionCeiling', 'certifiedLiveConnectionCeiling', 'autoConnect', 'viewDistance', 'reconnect'], 'bots');
    assertArray(bots.configuredIdentities, 'bots.configuredIdentities', { min: 1, max: 5 });
    assertInteger(bots.maxIdentities, 'bots.maxIdentities', 1, 5);
    if (bots.configuredIdentities.length > bots.maxIdentities) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'configured bot count exceeds maxIdentities');
    }
    const ids = new Set();
    const usernames = new Set();
    for (const [index, identity] of bots.configuredIdentities.entries()) {
      const identityPath = `bots.configuredIdentities[${index}]`;
      assertKnownKeys(identity, ['id', 'username', 'enabled'], identityPath);
      assertString(identity.id, `${identityPath}.id`, { min: 1, max: 32, pattern: /^bot-[1-5]$/, allowEmpty: false });
      assertString(identity.username, `${identityPath}.username`, { min: 3, max: 16, pattern: /^[A-Za-z0-9_]+$/, allowEmpty: false });
      assertBoolean(identity.enabled, `${identityPath}.enabled`);
      if (ids.has(identity.id) || usernames.has(identity.username.toLowerCase())) {
        throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'bot IDs and usernames must be unique', {
          details: { botId: identity.id }
        });
      }
      ids.add(identity.id);
      usernames.add(identity.username.toLowerCase());
    }
    assertInteger(bots.requestedLiveConnectionCeiling, 'bots.requestedLiveConnectionCeiling', 0, 5);
    assertInteger(bots.certifiedLiveConnectionCeiling, 'bots.certifiedLiveConnectionCeiling', 0, 5);
    if (bots.certifiedLiveConnectionCeiling > bots.requestedLiveConnectionCeiling || bots.requestedLiveConnectionCeiling > bots.maxIdentities) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'live connection ceilings must not exceed configured/certified limits');
    }
    assertBoolean(bots.autoConnect, 'bots.autoConnect');
    if (bots.autoConnect && profiles.some((profile) => profile.aternos)) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'autoConnect is forbidden for an Aternos profile');
    }
    assertEnum(bots.viewDistance, 'bots.viewDistance', ['tiny']);
    assertKnownKeys(bots.reconnect, ['maxTransientAttempts', 'delaysMs'], 'bots.reconnect');
    assertInteger(bots.reconnect.maxTransientAttempts, 'bots.reconnect.maxTransientAttempts', 0, 2);
    assertArray(bots.reconnect.delaysMs, 'bots.reconnect.delaysMs', { min: bots.reconnect.maxTransientAttempts, max: 2 });
    for (const [index, delay] of bots.reconnect.delaysMs.entries()) {
      assertInteger(delay, `bots.reconnect.delaysMs[${index}]`, 1_000, 120_000);
    }
  }

  _validateAi(ai, deploymentMode) {
    assertKnownKeys(ai, ['primary', 'automaticFailover', 'maxInFlight', 'maxQueued', 'requestBudget', 'providers'], 'ai');
    assertEnum(ai.primary, 'ai.primary', PROVIDER_NAMES);
    assertBoolean(ai.automaticFailover, 'ai.automaticFailover');
    assertInteger(ai.maxInFlight, 'ai.maxInFlight', 1, 1);
    assertInteger(ai.maxQueued, 'ai.maxQueued', 0, 3);
    assertKnownKeys(ai.requestBudget, ['perHour', 'perDay'], 'ai.requestBudget');
    assertInteger(ai.requestBudget.perHour, 'ai.requestBudget.perHour', 0, 10_000);
    assertInteger(ai.requestBudget.perDay, 'ai.requestBudget.perDay', 0, 100_000);
    assertKnownKeys(ai.providers, PROVIDER_NAMES, 'ai.providers');

    const enabledProviders = [];
    for (const provider of PROVIDER_NAMES) {
      const providerConfig = ai.providers[provider];
      if (provider === 'ollama') {
        assertKnownKeys(providerConfig, ['enabled', 'model', 'baseUrl', 'connectTimeoutMs', 'warmTimeoutMs', 'coldTimeoutMs', 'keepAlive'], 'ai.providers.ollama');
        assertBoolean(providerConfig.enabled, 'ai.providers.ollama.enabled');
        assertString(providerConfig.model, 'ai.providers.ollama.model', { min: 1, max: 128, allowEmpty: false });
        validateUrl(providerConfig.baseUrl, 'ai.providers.ollama.baseUrl', deploymentMode);
        assertInteger(providerConfig.connectTimeoutMs, 'ai.providers.ollama.connectTimeoutMs', 100, 30_000);
        assertInteger(providerConfig.warmTimeoutMs, 'ai.providers.ollama.warmTimeoutMs', 100, 120_000);
        assertInteger(providerConfig.coldTimeoutMs, 'ai.providers.ollama.coldTimeoutMs', providerConfig.warmTimeoutMs, 180_000);
        assertString(providerConfig.keepAlive, 'ai.providers.ollama.keepAlive', { min: 1, max: 32, allowEmpty: false });
      } else {
        assertKnownKeys(providerConfig, ['enabled', 'model', 'freeAccessAcknowledged'], `ai.providers.${provider}`);
        assertBoolean(providerConfig.enabled, `ai.providers.${provider}.enabled`);
        assertString(providerConfig.model, `ai.providers.${provider}.model`, { min: 0, max: 128 });
        assertBoolean(providerConfig.freeAccessAcknowledged, `ai.providers.${provider}.freeAccessAcknowledged`);
        if (providerConfig.enabled) {
          if (!providerConfig.freeAccessAcknowledged || providerConfig.model.length === 0) {
            throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, `${provider} requires an explicit no-charge acknowledgement and model`);
          }
          requireSecret(this.env, provider === 'gemini' ? 'AXIOM_GEMINI_API_KEY' : 'AXIOM_GROQ_API_KEY');
        }
      }
      if (providerConfig.enabled) enabledProviders.push(provider);
    }
    if (ai.automaticFailover && enabledProviders.length < 2) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'automatic failover requires at least two explicitly enabled providers');
    }
  }

  _validateChat(chat, ai) {
    assertKnownKeys(chat, ['enabled', 'replyMode', 'proactiveOllamaOnly', 'globalCooldownMs', 'perBotCooldownMs', 'maxVisibleChars', 'threadMaxTurns', 'threadTtlMs', 'maxThreads', 'storeRawChat'], 'chat');
    assertBoolean(chat.enabled, 'chat.enabled');
    assertEnum(chat.replyMode, 'chat.replyMode', ['mentions_and_questions', 'mentions_only', 'disabled']);
    assertBoolean(chat.proactiveOllamaOnly, 'chat.proactiveOllamaOnly');
    if (chat.proactiveOllamaOnly && (ai.primary !== 'ollama' || !ai.providers.ollama.enabled)) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'proactive chat requires enabled Ollama as the selected provider');
    }
    assertInteger(chat.globalCooldownMs, 'chat.globalCooldownMs', 1_000, 3_600_000);
    assertInteger(chat.perBotCooldownMs, 'chat.perBotCooldownMs', chat.globalCooldownMs, 3_600_000);
    assertInteger(chat.maxVisibleChars, 'chat.maxVisibleChars', 1, 240);
    assertInteger(chat.threadMaxTurns, 'chat.threadMaxTurns', 1, 50);
    assertInteger(chat.threadTtlMs, 'chat.threadTtlMs', 60_000, 86_400_000);
    assertInteger(chat.maxThreads, 'chat.maxThreads', 1, 1_000);
    assertBoolean(chat.storeRawChat, 'chat.storeRawChat');
  }

  _validateDiscord(discord) {
    assertKnownKeys(discord, ['enabled', 'guildId', 'authorizedUserIds', 'registerCommandsOnStartup'], 'discord');
    assertBoolean(discord.enabled, 'discord.enabled');
    assertString(discord.guildId, 'discord.guildId', { min: 0, max: 22, pattern: /^$|^\d{15,22}$/ });
    assertArray(discord.authorizedUserIds, 'discord.authorizedUserIds', { max: 100 });
    const ids = new Set();
    for (const [index, userId] of discord.authorizedUserIds.entries()) {
      assertString(userId, `discord.authorizedUserIds[${index}]`, { min: 15, max: 22, pattern: /^\d{15,22}$/, allowEmpty: false });
      if (ids.has(userId)) {
        throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Discord authorised user IDs must be unique');
      }
      ids.add(userId);
    }
    assertBoolean(discord.registerCommandsOnStartup, 'discord.registerCommandsOnStartup');
    if (!discord.enabled && discord.registerCommandsOnStartup) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Discord command registration requires Discord to be enabled');
    }
    if (discord.enabled) {
      if (discord.authorizedUserIds.length === 0) {
        throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Discord requires at least one immutable authorised user ID');
      }
      if (discord.guildId.length === 0) {
        throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Discord development mode requires a guild-scoped command ID');
      }
      requireSecret(this.env, 'AXIOM_DISCORD_TOKEN');
    }
  }

  _validateDashboard(dashboard) {
    assertKnownKeys(dashboard, ['enabled', 'bindHost', 'port', 'sessionTtlMinutes', 'requireHttpsOutsideLoopback'], 'dashboard');
    assertBoolean(dashboard.enabled, 'dashboard.enabled');
    assertString(dashboard.bindHost, 'dashboard.bindHost', { min: 1, max: 253, allowEmpty: false });
    if (!LOOPBACK_HOSTS.has(dashboard.bindHost)) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'dashboard.bindHost must remain loopback until a reviewed TLS/VPN adapter exists');
    }
    assertInteger(dashboard.port, 'dashboard.port', 1, 65_535);
    assertInteger(dashboard.sessionTtlMinutes, 'dashboard.sessionTtlMinutes', 5, 1_440);
    assertBoolean(dashboard.requireHttpsOutsideLoopback, 'dashboard.requireHttpsOutsideLoopback');
    if (dashboard.enabled) {
      requireSecret(this.env, 'AXIOM_DASHBOARD_SESSION_SECRET', 32);
      requireSecret(this.env, 'AXIOM_DASHBOARD_ADMIN_PASSWORD_HASH', 20);
    }
  }

  _validatePersistence(persistence) {
    assertKnownKeys(persistence, ['path', 'taskRetentionDays', 'auditRetentionDays', 'chatRetentionHours'], 'persistence');
    assertString(persistence.path, 'persistence.path', { min: 1, max: 1_024, allowEmpty: false });
    assertNoSharedStorage(persistence.path);
    assertInteger(persistence.taskRetentionDays, 'persistence.taskRetentionDays', 1, 3_650);
    assertInteger(persistence.auditRetentionDays, 'persistence.auditRetentionDays', 1, 3_650);
    assertInteger(persistence.chatRetentionHours, 'persistence.chatRetentionHours', 1, 8_760);
  }

  _validatePerformance(performance) {
    assertKnownKeys(performance, ['sampleIntervalMs', 'eventLoopWarningMs', 'pathfinderTickBudgetMs', 'maxConcurrentPathfinders', 'queueMax', 'cacheMaxEntries'], 'performance');
    assertInteger(performance.sampleIntervalMs, 'performance.sampleIntervalMs', 1_000, 60_000);
    assertInteger(performance.eventLoopWarningMs, 'performance.eventLoopWarningMs', 1, 10_000);
    assertInteger(performance.pathfinderTickBudgetMs, 'performance.pathfinderTickBudgetMs', 1, 40);
    assertInteger(performance.maxConcurrentPathfinders, 'performance.maxConcurrentPathfinders', 1, 5);
    assertInteger(performance.queueMax, 'performance.queueMax', 1, 10_000);
    assertInteger(performance.cacheMaxEntries, 'performance.cacheMaxEntries', 1, 100_000);
  }

  assertConnectionAllowed(profileId, options = {}) {
    if (!this.config) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Configuration has not been loaded');
    }
    const profile = this.config.serverProfiles.find((candidate) => candidate.id === profileId);
    if (!profile) {
      throw new DomainError(ERROR_CODES.CONNECTION_NOT_APPROVED, 'Server profile is not configured', { details: { profileId } });
    }
    if (!SUPPORTED_MINECRAFT_VERSIONS.includes(profile.version)) {
      throw new DomainError(ERROR_CODES.MINECRAFT_VERSION_UNSUPPORTED, `Minecraft ${profile.version} is not supported by the approved published package tuple`, {
        details: { profileId: profile.id, supportedVersions: SUPPORTED_MINECRAFT_VERSIONS }
      });
    }
    if (profile.compatibilityState !== 'verified') {
      throw new DomainError(ERROR_CODES.CONNECTION_NOT_APPROVED, 'Server compatibility has not been verified', { details: { profileId: profile.id } });
    }
    if (!profile.serverApprovedByOperator) {
      throw new DomainError(ERROR_CODES.CONNECTION_NOT_APPROVED, 'Server has not been approved by the operator', { details: { profileId: profile.id } });
    }
    if (profile.aternos && profile.operatorSessionRequired && options.operatorSessionApproved !== true) {
      throw new DomainError(ERROR_CODES.OPERATOR_SESSION_REQUIRED, 'Aternos connection requires an active operator-approved session', { details: { profileId: profile.id } });
    }
    return profile;
  }

  redactedSnapshot() {
    if (!this.config) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Configuration has not been loaded');
    }
    return deepFreeze(redact({ ...this.config, configHash: this.configHash }, { redactPrivateAddresses: true }));
  }

  _assertPrivateConfigFile() {
    if (this.platform === 'win32' || typeof this.fs.statSync !== 'function') return;
    let mode;
    try {
      mode = this.fs.statSync(this.configPath).mode & 0o777;
    } catch (error) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Configuration file permissions could not be verified', { cause: error });
    }
    if ((mode & 0o077) !== 0) {
      throw new DomainError(ERROR_CODES.CONFIG_VALIDATION_FAILED, 'Configuration file must not be readable or writable by group or others');
    }
  }

  _emitInvalid(code) {
    try {
      this.emitEvent(Object.freeze({ type: 'config.invalid', schemaVersion: 1, code }));
    } catch {
      // Observability must not hide the original configuration failure.
    }
  }
}

module.exports = {
  BOT_IDENTITIES,
  ConfigLoader,
  DEFAULT_CONFIG,
  LOOPBACK_HOSTS,
  PROVIDER_NAMES,
  SUPPORTED_MINECRAFT_VERSIONS,
  parseNodeMajor
};
