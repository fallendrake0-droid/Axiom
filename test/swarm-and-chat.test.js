'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { BOT_IDENTITIES, loadConfig } = require('../src/config/loadConfig');
const { BOT_STATES } = require('../src/bots/BotController');
const { ChatManager } = require('../src/chat/ChatManager');
const { SwarmManager } = require('../src/swarm/SwarmManager');

class FakeController extends EventEmitter {
  constructor({ username }) {
    super();
    this.username = username;
    this.state = BOT_STATES.STOPPED;
    this.startCalls = 0;
    this.stopCalls = 0;
    this.pauseCalls = 0;
  }

  async start() {
    this.startCalls += 1;
    this._set(BOT_STATES.CONNECTING, 'test start');
  }

  async stop() {
    this.stopCalls += 1;
    this._set(BOT_STATES.STOPPED, 'test stop');
  }

  async pauseForCapacity() {
    this.pauseCalls += 1;
    this._set(BOT_STATES.PAUSED_CAPACITY, 'test capacity');
  }

  async say(message) {
    if (this.state !== BOT_STATES.ONLINE) throw new Error(`${this.username} is not online.`);
    this.lastMessage = message;
    return message;
  }

  async applyStrategicAction(assignment) {
    this.lastStrategicAction = assignment;
    return { applied: true, action: assignment.action };
  }

  getSnapshot() {
    return { botId: this.username, connectionState: this.state, isLive: this.state === BOT_STATES.ONLINE };
  }

  _set(next, reason) {
    const previous = this.state;
    this.state = next;
    this.emit('state', { botId: this.username, from: previous, to: next, reason, at: 1 });
  }
}

class FakeBrain extends EventEmitter {
  constructor() {
    super();
    this.started = false;
    this.stopped = false;
    this.reasons = [];
    this.status = { enabled: true, provider: 'ollama', health: { healthy: true } };
  }

  start(options) {
    this.started = true;
    this.options = options;
  }

  stop() {
    this.stopped = true;
  }

  requestPlan(reason) {
    this.reasons.push(reason);
  }

  getStatus() {
    return this.status;
  }
}

class FakeGovernor extends EventEmitter {
  constructor() {
    super();
    this.started = false;
    this.last = null;
  }

  start() {
    this.started = true;
  }

  stop() {
    this.started = false;
  }

  getSnapshot() {
    return this.last;
  }

  setCapacity(safeCapacity) {
    this.last = { safeCapacity, pressure: safeCapacity ? 'normal' : 'critical' };
    this.emit('capacity', this.last);
  }
}

function config(overrides = {}) {
  return loadConfig({
    cwd: process.cwd(),
    dotEnvValues: {},
    env: {
      AXIOM_OFFLINE_SERVER_AUTHORIZED: 'true',
      AXIOM_MINECRAFT_HOST: 'ZCClanOnTOP.aternos.me',
      AXIOM_AUTHORIZED_OFFLINE_HOST: 'ZCClanOnTOP.aternos.me',
      AXIOM_MINECRAFT_VERSION: '26.2',
      AXIOM_ENABLED_BOTS: BOT_IDENTITIES.join(','),
      AXIOM_MAX_LIVE_CONNECTIONS: '1',
      AXIOM_AI_ENABLED: 'false',
      AXIOM_LOGIN_STAGGER_MS: '2500',
      AXIOM_CHAT_PROACTIVE: 'false',
      AXIOM_CHAT_COMMANDS_ENABLED: 'false',
      ...overrides
    }
  });
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test('SwarmManager makes one central capacity decision and queues remaining identities', async () => {
  const controllers = new Map();
  const governor = new FakeGovernor();
  const manager = new SwarmManager({
    config: config(),
    logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } },
    controllerFactory: (options) => {
      const controller = new FakeController(options);
      controllers.set(options.username, controller);
      return controller;
    },
    compatibilityInspector: () => ({ compatible: true, experimental: false, requestedVersion: '26.2' }),
    serverProbe: async () => ({ version: { name: '26.2', protocol: 999 }, players: { online: 0, max: 20 }, latency: 1 }),
    resourceGovernor: governor,
    deathRecorder: { record: () => true },
    now: () => 10000
  });

  await manager.start();
  await flush();
  const first = controllers.get(BOT_IDENTITIES[0]);
  assert.equal(first.startCalls, 1);
  assert.equal(first.state, BOT_STATES.CONNECTING);
  for (const botId of BOT_IDENTITIES.slice(1)) {
    assert.equal(controllers.get(botId).state, BOT_STATES.PAUSED_CAPACITY);
  }
  assert.equal(manager.getStatus().activeConnectionSlots, 1);

  governor.setCapacity(0);
  await flush();
  assert.equal(first.state, BOT_STATES.PAUSED_CAPACITY);
  assert.equal(manager.getStatus().effectiveLiveCapacity, 0);
  await manager.stop();
  assert.equal(governor.started, false);
});

test('SwarmManager admits all five requested bots when the configured safe capacity is five', async () => {
  const controllers = new Map();
  let clock = 0;
  const manager = new SwarmManager({
    config: config({ AXIOM_MAX_LIVE_CONNECTIONS: '5' }),
    logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } },
    controllerFactory: (options) => {
      const controller = new FakeController(options);
      controllers.set(options.username, controller);
      return controller;
    },
    compatibilityInspector: () => ({ compatible: true, experimental: false, requestedVersion: '26.2' }),
    serverProbe: async () => ({ version: { name: '26.2', protocol: 999 }, players: { online: 0, max: 20 }, latency: 1 }),
    resourceGovernor: new FakeGovernor(),
    deathRecorder: { record: () => true },
    now: () => {
      clock += 3000;
      return clock;
    }
  });

  await manager.start();
  for (let index = 0; index < 10; index += 1) await flush();
  assert.equal(manager.getStatus().configuredLiveCapacity, 5);
  assert.equal(manager.getStatus().activeConnectionSlots, 5);
  assert.deepEqual(
    BOT_IDENTITIES.map((botId) => controllers.get(botId).startCalls),
    [1, 1, 1, 1, 1]
  );
  await manager.stop();
});

test('SwarmManager gives one central brain all five compact bot states and dispatches only through controllers', async () => {
  const controllers = new Map();
  const brain = new FakeBrain();
  const manager = new SwarmManager({
    config: config({ AXIOM_MAX_LIVE_CONNECTIONS: '5', AXIOM_AI_ENABLED: 'true' }),
    logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } },
    controllerFactory: (options) => {
      const controller = new FakeController(options);
      controllers.set(options.username, controller);
      return controller;
    },
    compatibilityInspector: () => ({ compatible: true, experimental: false, requestedVersion: '26.2' }),
    serverProbe: async () => ({ version: { name: '26.2', protocol: 999 }, players: { online: 0, max: 20 }, latency: 1 }),
    resourceGovernor: new FakeGovernor(),
    deathRecorder: { record: () => true },
    brain,
    now: () => 10000
  });

  await manager.start();
  const context = brain.options.getSwarmContext();
  assert.deepEqual(context.swarm.bots.map((bot) => bot.botId), BOT_IDENTITIES);
  assert.equal(brain.started, true);
  assert.equal(manager.getStatus().ai.provider, 'ollama');
  assert.deepEqual(
    await brain.options.dispatchAction({ botId: 'hsqoswqi', action: 'idle' }),
    { applied: true, action: 'idle' }
  );
  assert.deepEqual(controllers.get('hsqoswqi').lastStrategicAction, { botId: 'hsqoswqi', action: 'idle' });
  await manager.stop();
  assert.equal(brain.stopped, true);
});

test('ChatManager only responds to mentions or questions and enforces per-bot and global throttles', async () => {
  let clock = 10000;
  const manager = new ChatManager({
    botIds: ['hsqoswqi', 'qojjosqsjiox'],
    cooldownMs: 7000,
    globalMaxPerMinute: 1,
    enabled: true,
    logger: { info() {}, warn() {} },
    now: () => clock
  });
  const sent = [];
  const send = async (message) => sent.push(message);

  const ignored = await manager.handleIncoming({
    botId: 'hsqoswqi',
    username: 'Player',
    message: 'hello everyone',
    send
  });
  assert.deepEqual(ignored, { replied: false, reason: 'not-addressed' });

  const replied = await manager.handleIncoming({
    botId: 'hsqoswqi',
    username: 'Player',
    message: 'hsqoswqi, are you there?',
    send
  });
  assert.equal(replied.replied, true);
  assert.equal(sent.length, 1);

  clock += 8000;
  const limited = await manager.handleIncoming({
    botId: 'qojjosqsjiox',
    username: 'Player',
    message: 'qojjosqsjiox?',
    send
  });
  assert.deepEqual(limited, { replied: false, reason: 'global-rate-limit' });
});
