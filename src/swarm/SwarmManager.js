'use strict';

const { EventEmitter } = require('node:events');
const { BotController, BOT_STATES } = require('../bots/BotController');
const { DeathRecorder } = require('../bots/DeathRecorder');
const { ChatManager } = require('../chat/ChatManager');
const { assertProtocolCompatibility } = require('../minecraft/compatibility');
const { createMineflayerClient } = require('../minecraft/createMineflayerClient');
const { probeMinecraftServer } = require('../minecraft/ServerProbe');
const { ResourceGovernor } = require('./ResourceGovernor');

const OCCUPYING_CAPACITY = new Set([BOT_STATES.CONNECTING, BOT_STATES.ONLINE, BOT_STATES.BACKOFF]);

class SwarmManager extends EventEmitter {
  constructor({
    config,
    logger,
    controllerFactory,
    compatibilityInspector = assertProtocolCompatibility,
    serverProbe = probeMinecraftServer,
    resourceGovernor,
    deathRecorder,
    now = () => Date.now()
  }) {
    super();
    if (!config) throw new TypeError('SwarmManager config is required.');
    this.config = config;
    this.logger = logger || console;
    this.now = now;
    this.compatibilityInspector = compatibilityInspector;
    this.serverProbe = serverProbe;
    this.started = false;
    this.stopping = false;
    this.safeCapacity = config.swarm.maxLiveConnections;
    this.desiredBots = new Set(config.swarm.botIdentities);
    this.events = [];
    this.lastAdmissionAt = 0;
    this.admissionTimer = null;
    this.reconcileChain = Promise.resolve();

    const makeController = controllerFactory || ((options) => new BotController({ ...options, clientFactory: createMineflayerClient }));
    this.controllers = new Map();
    for (const botId of config.swarm.botIdentities) {
      const controller = makeController({
        username: botId,
        server: config.server,
        swarm: { viewDistance: config.swarm.viewDistance, chatCooldownMs: config.chat.cooldownMs },
        reconnect: config.reconnect,
        logger: this.logger.child ? this.logger.child({ botId }) : this.logger
      });
      if (!controller || typeof controller.start !== 'function') {
        throw new TypeError(`Controller factory did not create a valid controller for ${botId}.`);
      }
      this.controllers.set(botId, controller);
      this._wireController(controller);
    }

    this.chatManager = new ChatManager({
      botIds: config.swarm.botIdentities,
      cooldownMs: config.chat.cooldownMs,
      globalMaxPerMinute: config.chat.globalMaxPerMinute,
      enabled: config.chat.enabled,
      logger: this.logger,
      now
    });
    this.deathRecorder = deathRecorder || new DeathRecorder({ dataDir: config.runtime.dataDir, logger: this.logger });
    this.resourceGovernor =
      resourceGovernor ||
      new ResourceGovernor({
        maxConfiguredConnections: config.swarm.maxLiveConnections,
        resources: config.resources,
        logger: this.logger
      });
    this._wireResourceGovernor();
  }

  async start({ skipCompatibilityCheck = false } = {}) {
    if (this.started) return this.getStatus();
    if (!skipCompatibilityCheck) {
      const compatibility = this.compatibilityInspector({
        requestedVersion: this.config.server.version,
        allowExperimentalProtocol: this.config.server.allowExperimentalProtocol
      });
      this._record('protocol_checked', compatibility);
      if (compatibility.experimental) {
        this.logger.warn('Starting only with explicit experimental protocol approval', compatibility);
      }
    }
    const serverStatus = await this.serverProbe({
      host: this.config.server.host,
      port: this.config.server.port,
      version: this.config.server.version
    });
    this._record('server_validated', serverStatus);
    this.started = true;
    this.stopping = false;
    this.resourceGovernor.start();
    await this._queueReconcile();
    this._record('swarm_started', { configuredCapacity: this.config.swarm.maxLiveConnections });
    return this.getStatus();
  }

  async stop(reason = 'operator requested shutdown') {
    if (this.stopping) return this.getStatus();
    this.stopping = true;
    this.started = false;
    if (this.admissionTimer) clearTimeout(this.admissionTimer);
    this.admissionTimer = null;
    this.resourceGovernor.stop();
    await Promise.all([...this.controllers.values()].map((controller) => controller.stop(reason)));
    this._record('swarm_stopped', { reason });
    return this.getStatus();
  }

  async requestStart(botId) {
    this._assertBotId(botId);
    this.desiredBots.add(botId);
    if (!this.started) return this.getStatus();
    await this._queueReconcile();
    return this.getStatus();
  }

  async requestStop(botId, reason = 'operator requested stop') {
    this._assertBotId(botId);
    this.desiredBots.delete(botId);
    const controller = this.controllers.get(botId);
    await controller.stop(reason);
    if (this.started) await this._queueReconcile();
    return this.getStatus();
  }

  async say(botId, message) {
    this._assertBotId(botId);
    return this.controllers.get(botId).say(message);
  }

  async sayAll(message) {
    const outcomes = [];
    for (const [botId, controller] of this.controllers) {
      if (controller.state !== BOT_STATES.ONLINE) {
        outcomes.push({ botId, sent: false, reason: 'not-online' });
        continue;
      }
      try {
        await controller.say(message);
        outcomes.push({ botId, sent: true });
      } catch (error) {
        outcomes.push({ botId, sent: false, reason: String(error?.message || error) });
      }
    }
    return outcomes;
  }

  getStatus() {
    return {
      started: this.started,
      configuredLiveCapacity: this.config.swarm.maxLiveConnections,
      resourceSafeCapacity: this.safeCapacity,
      effectiveLiveCapacity: this._effectiveCapacity(),
      activeConnectionSlots: this._occupyingControllers().length,
      bots: [...this.controllers.values()].map((controller) => controller.getSnapshot()),
      resources: this.resourceGovernor.getSnapshot(),
      recentEvents: this.events.slice(-50)
    };
  }

  _wireController(controller) {
    controller.on('state', (event) => {
      this._record('bot_state', event);
      if (this.started && !this.stopping) void this._queueReconcile();
    });
    controller.on('botError', (event) => this._record('bot_error', event));
    controller.on('connectionFailed', (event) => this._record('connection_failed', event));
    controller.on('waitingForOperator', (event) => this._record('waiting_for_operator', event));
    controller.on('reconnectScheduled', (event) => this._record('reconnect_scheduled', event));
    controller.on('survivalAction', (event) => this._record('survival_action', event));
    controller.on('outboundChat', (event) => this._record('outbound_chat', event));
    controller.on('death', (event) => {
      const persisted = this.deathRecorder.record(event);
      this._record('bot_death', { ...event, persisted });
    });
    controller.on('incomingChat', (event) => {
      this._record('incoming_chat', { botId: event.botId, username: event.username });
      void this.chatManager.handleIncoming({
        ...event,
        send: (message) => controller.say(message)
      });
    });
  }

  _wireResourceGovernor() {
    this.resourceGovernor.on('capacity', (sample) => {
      this.safeCapacity = sample.safeCapacity;
      this._record('resource_capacity_changed', sample);
      if (this.started && !this.stopping) void this._queueReconcile();
    });
  }

  _queueReconcile() {
    this.reconcileChain = this.reconcileChain
      .then(() => this._reconcileCapacity())
      .catch((error) => {
        this.logger.error('Swarm capacity reconciliation failed', { error: String(error?.message || error) });
        this._record('reconcile_error', { error: String(error?.message || error) });
      });
    return this.reconcileChain;
  }

  async _reconcileCapacity() {
    if (!this.started || this.stopping) return;
    const capacity = this._effectiveCapacity();
    let occupants = this._occupyingControllers();
    while (occupants.length > capacity) {
      const controller = occupants.pop();
      await controller.pauseForCapacity('resource or configured live capacity reached');
      occupants = this._occupyingControllers();
    }
    if (occupants.length >= capacity) {
      await this._markQueuedBots();
      return;
    }

    const candidate = [...this.controllers.entries()].find(([botId, controller]) => {
      if (!this.desiredBots.has(botId)) return false;
      return [BOT_STATES.STOPPED, BOT_STATES.PAUSED_CAPACITY].includes(controller.state);
    });
    if (!candidate) return;
    const elapsed = this.now() - this.lastAdmissionAt;
    const waitMs = Math.max(0, this.config.swarm.loginStaggerMs - elapsed);
    if (waitMs > 0 && this.lastAdmissionAt > 0) {
      this._scheduleAdmission(waitMs);
      return;
    }
    const [botId, controller] = candidate;
    this.lastAdmissionAt = this.now();
    this._record('bot_admitted', { botId, capacity });
    await controller.start();
  }

  async _markQueuedBots() {
    for (const [botId, controller] of this.controllers) {
      if (!this.desiredBots.has(botId) || controller.state !== BOT_STATES.STOPPED) continue;
      await controller.pauseForCapacity('queued behind configured live capacity');
    }
  }

  _scheduleAdmission(waitMs) {
    if (this.admissionTimer || !this.started || this.stopping) return;
    this.admissionTimer = setTimeout(() => {
      this.admissionTimer = null;
      if (this.started && !this.stopping) void this._queueReconcile();
    }, waitMs);
    this.admissionTimer.unref?.();
  }

  _effectiveCapacity() {
    return Math.max(0, Math.min(this.config.swarm.maxLiveConnections, this.safeCapacity));
  }

  _occupyingControllers() {
    return [...this.controllers.values()].filter((controller) => OCCUPYING_CAPACITY.has(controller.state));
  }

  _assertBotId(botId) {
    if (!this.controllers.has(botId)) throw new Error(`Unknown bot identity: ${botId}`);
  }

  _record(type, payload) {
    const event = { type, at: this.now(), ...payload };
    this.events.push(event);
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
    this.emit('event', event);
  }
}

module.exports = { OCCUPYING_CAPACITY, SwarmManager };
