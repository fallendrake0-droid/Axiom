'use strict';

const { EventEmitter } = require('node:events');

const BOT_STATES = Object.freeze({
  STOPPED: 'STOPPED',
  PAUSED_CAPACITY: 'PAUSED_CAPACITY',
  CONNECTING: 'CONNECTING',
  ONLINE: 'ONLINE',
  BACKOFF: 'BACKOFF',
  WAITING_FOR_OPERATOR: 'WAITING_FOR_OPERATOR',
  FAILED: 'FAILED',
  STOPPING: 'STOPPING'
});

const TRANSITIONS = Object.freeze({
  [BOT_STATES.STOPPED]: new Set([BOT_STATES.CONNECTING, BOT_STATES.PAUSED_CAPACITY, BOT_STATES.STOPPING]),
  [BOT_STATES.PAUSED_CAPACITY]: new Set([BOT_STATES.CONNECTING, BOT_STATES.STOPPING, BOT_STATES.STOPPED]),
  [BOT_STATES.CONNECTING]: new Set([
    BOT_STATES.ONLINE,
    BOT_STATES.BACKOFF,
    BOT_STATES.WAITING_FOR_OPERATOR,
    BOT_STATES.FAILED,
    BOT_STATES.STOPPING,
    BOT_STATES.PAUSED_CAPACITY
  ]),
  [BOT_STATES.ONLINE]: new Set([
    BOT_STATES.BACKOFF,
    BOT_STATES.WAITING_FOR_OPERATOR,
    BOT_STATES.FAILED,
    BOT_STATES.STOPPING,
    BOT_STATES.PAUSED_CAPACITY
  ]),
  [BOT_STATES.BACKOFF]: new Set([
    BOT_STATES.CONNECTING,
    BOT_STATES.WAITING_FOR_OPERATOR,
    BOT_STATES.STOPPING,
    BOT_STATES.PAUSED_CAPACITY
  ]),
  [BOT_STATES.WAITING_FOR_OPERATOR]: new Set([
    BOT_STATES.CONNECTING,
    BOT_STATES.STOPPING,
    BOT_STATES.PAUSED_CAPACITY,
    BOT_STATES.STOPPED
  ]),
  [BOT_STATES.FAILED]: new Set([BOT_STATES.CONNECTING, BOT_STATES.STOPPING, BOT_STATES.STOPPED]),
  [BOT_STATES.STOPPING]: new Set([BOT_STATES.STOPPED, BOT_STATES.PAUSED_CAPACITY])
});

const FOOD_NAMES = new Set([
  'apple',
  'baked_potato',
  'beef',
  'beetroot_soup',
  'bread',
  'carrot',
  'chorus_fruit',
  'chicken',
  'cod',
  'cooked_beef',
  'cooked_chicken',
  'cooked_cod',
  'cooked_mutton',
  'cooked_porkchop',
  'cooked_rabbit',
  'cooked_salmon',
  'cookie',
  'dried_kelp',
  'golden_apple',
  'melon_slice',
  'mushroom_stew',
  'mutton',
  'porkchop',
  'potato',
  'pumpkin_pie',
  'rabbit_stew',
  'salmon',
  'sweet_berries'
]);

const ARMOUR_DESTINATIONS = Object.freeze([
  ['helmet', 'head'],
  ['chestplate', 'torso'],
  ['leggings', 'legs'],
  ['boots', 'feet']
]);

function compactPosition(position) {
  if (!position) return null;
  return {
    x: roundCoordinate(position.x),
    y: roundCoordinate(position.y),
    z: roundCoordinate(position.z)
  };
}

function roundCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function compactInventory(bot) {
  const items = typeof bot?.inventory?.items === 'function' ? bot.inventory.items() : [];
  const totals = new Map();
  for (const item of items || []) {
    if (!item?.name) continue;
    totals.set(item.name, (totals.get(item.name) || 0) + (Number(item.count) || 0));
  }
  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 64);
}

function sanitizeChatMessage(message) {
  const text = String(message ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.slice(0, 240);
}

function classifyConnectionFailure(errorOrReason) {
  const message = String(errorOrReason?.message || errorOrReason || 'Unknown connection end');
  const lower = message.toLowerCase();
  if (/banned|whitelist|not whitelisted|logged in from another location|not authenticated|invalid session|invalid credentials|verify username|authentication/.test(lower)) {
    return { kind: 'non_retryable', reason: message };
  }
  if (/version|protocol|unsupported/.test(lower)) {
    return { kind: 'non_retryable', reason: message };
  }
  if (/server is down|econnrefused|enotfound|ehostunreach|etimedout|timed out|connection reset|socket closed|server closed/.test(lower)) {
    return { kind: 'temporary_server_unavailable', reason: message };
  }
  return { kind: 'temporary_unknown', reason: message };
}

class BotController extends EventEmitter {
  constructor({
    username,
    server,
    swarm,
    reconnect,
    clientFactory,
    logger,
    now = () => Date.now(),
    random = Math.random,
    connectTimeoutMs = 30000
  }) {
    super();
    if (!username) throw new TypeError('BotController username is required.');
    if (typeof clientFactory !== 'function') throw new TypeError('BotController clientFactory is required.');
    this.username = username;
    this.server = server;
    this.swarm = swarm;
    this.reconnect = reconnect;
    this.clientFactory = clientFactory;
    this.logger = logger || console;
    this.now = now;
    this.random = random;
    this.connectTimeoutMs = connectTimeoutMs;

    this.state = BOT_STATES.STOPPED;
    this.bot = null;
    this.listeners = [];
    this.retryTimer = null;
    this.connectTimer = null;
    this.survivalTimer = null;
    this.manualStop = false;
    this.reconnectAttempts = 0;
    this.lastError = null;
    this.lastEndReason = null;
    this.pendingKickReason = null;
    this.lastSpawnAt = null;
    this.lastDeath = null;
    this.actionChain = Promise.resolve();
  }

  async start() {
    if ([BOT_STATES.CONNECTING, BOT_STATES.ONLINE, BOT_STATES.BACKOFF].includes(this.state)) return this.getSnapshot();
    this.manualStop = false;
    this.reconnectAttempts = 0;
    this.lastError = null;
    await this._connect();
    return this.getSnapshot();
  }

  async pauseForCapacity(reason = 'live connection capacity reached') {
    this.manualStop = true;
    this._clearTimers();
    await this._disconnectClient();
    this._transition(BOT_STATES.PAUSED_CAPACITY, reason);
    return this.getSnapshot();
  }

  async stop(reason = 'operator requested stop') {
    this.manualStop = true;
    this._clearTimers();
    if (this.state !== BOT_STATES.STOPPING && this.state !== BOT_STATES.STOPPED) {
      this._transition(BOT_STATES.STOPPING, reason);
    }
    await this._disconnectClient();
    this._transition(BOT_STATES.STOPPED, reason);
    return this.getSnapshot();
  }

  async say(message, { bypassThrottle = false } = {}) {
    const safeMessage = sanitizeChatMessage(message);
    if (!safeMessage) throw new Error('Cannot send an empty chat message.');
    if (this.state !== BOT_STATES.ONLINE || !this.bot || typeof this.bot.chat !== 'function') {
      throw new Error(`${this.username} is not online.`);
    }
    if (
      !bypassThrottle &&
      this.lastOutboundChatAt !== undefined &&
      this.now() - this.lastOutboundChatAt < this.swarm.chatCooldownMs
    ) {
      throw new Error(`${this.username} chat cooldown is active.`);
    }
    this.bot.chat(safeMessage);
    this.lastOutboundChatAt = this.now();
    this.emit('outboundChat', { botId: this.username, message: safeMessage, at: this.now() });
    return safeMessage;
  }

  getSnapshot() {
    const bot = this.bot;
    return {
      botId: this.username,
      connectionState: this.state,
      isLive: this.state === BOT_STATES.ONLINE,
      health: numericOrNull(bot?.health),
      hunger: numericOrNull(bot?.food),
      position: compactPosition(bot?.entity?.position),
      dimension: typeof bot?.game?.dimension === 'string' ? bot.game.dimension : null,
      inventory: compactInventory(bot),
      currentTask: null,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError,
      lastEndReason: this.lastEndReason,
      lastSpawnAt: this.lastSpawnAt,
      lastDeath: this.lastDeath
    };
  }

  async _connect() {
    this._clearRetryTimer();
    this._clearConnectTimer();
    this._cleanupListeners();
    this._transition(BOT_STATES.CONNECTING, 'opening Mineflayer connection');
    let bot;
    try {
      bot = this.clientFactory({
        host: this.server.host,
        port: this.server.port,
        username: this.username,
        version: this.server.version,
        viewDistance: this.swarm.viewDistance
      });
    } catch (error) {
      this._handleConnectionEnd(error);
      return;
    }
    if (!bot || typeof bot.on !== 'function') {
      this._handleConnectionEnd(new Error('Mineflayer client factory did not return an EventEmitter-compatible bot.'));
      return;
    }
    this.bot = bot;
    this._attach(bot, 'spawn', () => this._handleSpawn());
    this._attach(bot, 'error', (error) => this._handleError(error));
    this._attach(bot, 'end', (reason) => this._handleConnectionEnd(reason));
    this._attach(bot, 'kicked', (reason) => this._handleKicked(reason));
    this._attach(bot, 'health', () => this._queueSurvivalCheck());
    this._attach(bot, 'death', () => this._handleDeath());
    this._attach(bot, 'chat', (username, message) => this._handleIncomingChat(username, message));
    this.connectTimer = setTimeout(() => {
      if (this.state === BOT_STATES.CONNECTING) {
        this._handleConnectionEnd(new Error(`Spawn timeout after ${this.connectTimeoutMs}ms`));
      }
    }, this.connectTimeoutMs);
    this.connectTimer.unref?.();
  }

  _handleSpawn() {
    if (this.manualStop || this.state !== BOT_STATES.CONNECTING) return;
    this._clearConnectTimer();
    this.reconnectAttempts = 0;
    this.lastError = null;
    this.lastSpawnAt = this.now();
    this._transition(BOT_STATES.ONLINE, 'Mineflayer spawn event received');
    this._startSurvivalTimer();
    this._queueSurvivalCheck();
  }

  _handleError(error) {
    const reason = String(error?.message || error);
    this.lastError = reason.slice(0, 500);
    this.logger.warn('Mineflayer client error', { botId: this.username, error: this.lastError });
    this.emit('botError', { botId: this.username, error: this.lastError, at: this.now() });
  }

  _handleKicked(reason) {
    this.pendingKickReason = String(reason || 'Kicked by server').slice(0, 500);
    this.lastError = this.pendingKickReason;
    this.lastEndReason = this.pendingKickReason;
    this.logger.warn('Mineflayer client kicked', { botId: this.username, reason: this.lastError });
  }

  _handleConnectionEnd(reason) {
    this._clearConnectTimer();
    this._stopSurvivalTimer();
    const endReason = this.pendingKickReason || reason?.message || reason || this.lastError || 'Connection ended';
    this.pendingKickReason = null;
    this.lastEndReason = String(endReason).slice(0, 500);
    if (this.manualStop) return;
    const failure = classifyConnectionFailure(this.lastEndReason);
    this.lastError = failure.reason;
    const endedBot = this.bot;
    this._cleanupListeners();
    this.bot = null;
    // A spawn timeout may leave a socket alive even though Mineflayer has not emitted `end` yet.
    // Best-effort teardown prevents a stale client retaining world data while the bounded retry waits.
    try {
      if (endedBot && typeof endedBot.quit === 'function') endedBot.quit('AXIOM reconnecting');
    } catch (error) {
      this.logger.debug?.('Inactive Mineflayer client teardown failed', {
        botId: this.username,
        error: String(error?.message || error)
      });
    }
    if (failure.kind === 'non_retryable') {
      this._transition(BOT_STATES.FAILED, failure.reason);
      this.emit('connectionFailed', { botId: this.username, ...failure, at: this.now() });
      return;
    }
    this._scheduleReconnect(failure);
  }

  _scheduleReconnect(failure) {
    if (this.manualStop) return;
    if (this.reconnectAttempts >= this.reconnect.maxAttempts) {
      this._transition(BOT_STATES.WAITING_FOR_OPERATOR, 'bounded reconnect attempts exhausted');
      this.emit('waitingForOperator', {
        botId: this.username,
        reason: failure.reason,
        attempts: this.reconnectAttempts,
        at: this.now()
      });
      return;
    }
    this.reconnectAttempts += 1;
    const exponentialDelay = Math.min(
      this.reconnect.maxMs,
      this.reconnect.baseMs * 2 ** (this.reconnectAttempts - 1)
    );
    const jitteredDelay = Math.round(exponentialDelay * (0.75 + this.random() * 0.5));
    this._transition(BOT_STATES.BACKOFF, `${failure.kind}: retry ${this.reconnectAttempts}`);
    this.emit('reconnectScheduled', {
      botId: this.username,
      attempt: this.reconnectAttempts,
      delayMs: jitteredDelay,
      reason: failure.reason,
      at: this.now()
    });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.manualStop) void this._connect();
    }, jitteredDelay);
    this.retryTimer.unref?.();
  }

  _handleIncomingChat(username, message) {
    if (!username || username === this.username) return;
    const safeMessage = sanitizeChatMessage(message);
    if (!safeMessage) return;
    this.emit('incomingChat', {
      botId: this.username,
      username: String(username).slice(0, 64),
      message: safeMessage,
      at: this.now()
    });
  }

  _handleDeath() {
    const snapshot = {
      botId: this.username,
      at: this.now(),
      dimension: typeof this.bot?.game?.dimension === 'string' ? this.bot.game.dimension : null,
      position: compactPosition(this.bot?.entity?.position),
      health: numericOrNull(this.bot?.health),
      hunger: numericOrNull(this.bot?.food),
      inventory: compactInventory(this.bot),
      currentTask: null
    };
    this.lastDeath = snapshot;
    this.emit('death', snapshot);
  }

  _startSurvivalTimer() {
    this._stopSurvivalTimer();
    this.survivalTimer = setInterval(() => this._queueSurvivalCheck(), 5000);
    this.survivalTimer.unref?.();
  }

  _stopSurvivalTimer() {
    if (this.survivalTimer) clearInterval(this.survivalTimer);
    this.survivalTimer = null;
  }

  _queueSurvivalCheck() {
    if (this.state !== BOT_STATES.ONLINE || !this.bot) return;
    this.actionChain = this.actionChain
      .then(() => this._runSurvivalCheck())
      .catch((error) => {
        this.logger.warn('Conservative survival action failed', {
          botId: this.username,
          error: String(error?.message || error)
        });
      });
  }

  async _runSurvivalCheck() {
    const bot = this.bot;
    if (!bot || this.state !== BOT_STATES.ONLINE) return;
    const items = typeof bot.inventory?.items === 'function' ? bot.inventory.items() : [];
    if (Number(bot.food) <= 12) {
      const food = (items || []).find((item) => FOOD_NAMES.has(item?.name));
      if (food && typeof bot.equip === 'function' && typeof bot.consume === 'function') {
        await bot.equip(food, 'hand');
        await bot.consume();
        this.emit('survivalAction', { botId: this.username, action: 'eat', item: food.name, at: this.now() });
      }
    }
    for (const [suffix, destination] of ARMOUR_DESTINATIONS) {
      const armour = (items || []).find((item) => item?.name?.endsWith(`_${suffix}`));
      if (armour && typeof bot.equip === 'function') {
        await bot.equip(armour, destination);
      }
    }
  }

  _attach(bot, event, listener) {
    bot.on(event, listener);
    this.listeners.push({ bot, event, listener });
  }

  _cleanupListeners() {
    for (const { bot, event, listener } of this.listeners.splice(0)) {
      if (typeof bot.removeListener === 'function') bot.removeListener(event, listener);
    }
  }

  async _disconnectClient() {
    const bot = this.bot;
    this._stopSurvivalTimer();
    this._clearConnectTimer();
    this._cleanupListeners();
    this.bot = null;
    if (!bot) return;
    try {
      if (typeof bot.quit === 'function') bot.quit('AXIOM clean disconnect');
      else if (typeof bot.end === 'function') bot.end('AXIOM clean disconnect');
    } catch (error) {
      this.logger.warn('Mineflayer client disconnect failed', {
        botId: this.username,
        error: String(error?.message || error)
      });
    }
  }

  _clearTimers() {
    this._clearRetryTimer();
    this._clearConnectTimer();
    this._stopSurvivalTimer();
  }

  _clearRetryTimer() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  _clearConnectTimer() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
  }

  _transition(nextState, reason) {
    if (this.state === nextState) return;
    const allowed = TRANSITIONS[this.state];
    if (!allowed?.has(nextState)) {
      this.logger.warn('Unexpected bot lifecycle transition forced', {
        botId: this.username,
        from: this.state,
        to: nextState,
        reason
      });
    }
    const previousState = this.state;
    this.state = nextState;
    const event = { botId: this.username, from: previousState, to: nextState, reason, at: this.now() };
    this.logger.info('Bot lifecycle changed', event);
    this.emit('state', event);
  }
}

function numericOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

module.exports = {
  ARMOUR_DESTINATIONS,
  BOT_STATES,
  BotController,
  FOOD_NAMES,
  classifyConnectionFailure,
  compactInventory,
  compactPosition,
  sanitizeChatMessage
};
