'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  BOT_STATES,
  BotController,
  classifyConnectionFailure,
  sanitizeChatMessage
} = require('../src/bots/BotController');

class FakeBot extends EventEmitter {
  constructor() {
    super();
    this.health = 20;
    this.food = 20;
    this.entity = { position: { x: 12.345, y: 64, z: -8.123 } };
    this.game = { dimension: 'minecraft:overworld' };
    this.inventoryItems = [];
    this.inventory = { items: () => this.inventoryItems };
    this.chatMessages = [];
    this.equipped = [];
    this.consumeCalls = 0;
    this.quitCalls = 0;
  }

  chat(message) {
    this.chatMessages.push(message);
  }

  async equip(item, destination) {
    this.equipped.push({ item: item.name, destination });
  }

  async consume() {
    this.consumeCalls += 1;
  }

  quit() {
    this.quitCalls += 1;
  }
}

function createController(bot, { now = () => 10000 } = {}) {
  return new BotController({
    username: 'hsqoswqi',
    server: { host: 'ZCClanOnTOP.aternos.me', port: 25565, version: '26.2' },
    swarm: { viewDistance: 4, chatCooldownMs: 7000 },
    reconnect: { maxAttempts: 2, baseMs: 5, maxMs: 5 },
    clientFactory: () => bot,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    now,
    random: () => 0
  });
}

test('BotController owns a separate client snapshot and runs conservative eating/armour actions', async () => {
  const bot = new FakeBot();
  bot.food = 6;
  bot.inventoryItems = [
    { name: 'cooked_beef', count: 3 },
    { name: 'iron_helmet', count: 1 },
    { name: 'iron_boots', count: 1 }
  ];
  const controller = createController(bot);
  await controller.start();
  assert.equal(controller.state, BOT_STATES.CONNECTING);
  bot.emit('spawn');
  await controller.actionChain;

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.connectionState, BOT_STATES.ONLINE);
  assert.equal(snapshot.health, 20);
  assert.deepEqual(snapshot.position, { x: 12.35, y: 64, z: -8.12 });
  assert.deepEqual(snapshot.inventory, [
    { name: 'cooked_beef', count: 3 },
    { name: 'iron_boots', count: 1 },
    { name: 'iron_helmet', count: 1 }
  ]);
  assert.equal(bot.consumeCalls, 1);
  assert.deepEqual(bot.equipped, [
    { item: 'cooked_beef', destination: 'hand' },
    { item: 'iron_helmet', destination: 'head' },
    { item: 'iron_boots', destination: 'feet' }
  ]);

  assert.equal(await controller.say(' hello\nthere '), 'hello there');
  assert.deepEqual(bot.chatMessages, ['hello there']);
  await controller.stop();
  assert.equal(controller.state, BOT_STATES.STOPPED);
  assert.equal(bot.quitCalls, 1);
});

test('BotController classifies non-retryable kicks and records compact death evidence', async () => {
  const bot = new FakeBot();
  bot.inventoryItems = [{ name: 'cobblestone', count: 12 }];
  const controller = createController(bot);
  const deaths = [];
  controller.on('death', (snapshot) => deaths.push(snapshot));
  await controller.start();
  bot.emit('spawn');
  bot.emit('death');
  assert.equal(deaths.length, 1);
  assert.equal(deaths[0].botId, 'hsqoswqi');
  assert.deepEqual(deaths[0].inventory, [{ name: 'cobblestone', count: 12 }]);

  bot.emit('kicked', 'You are not whitelisted on this server');
  bot.emit('end', 'You are not whitelisted on this server');
  assert.equal(controller.state, BOT_STATES.FAILED);
  assert.equal(controller.reconnectAttempts, 0);
  assert.equal(bot.quitCalls, 1);
});

test('BotController uses bounded retry then waits for a human operator', async () => {
  const bot = new FakeBot();
  const controller = createController(bot);
  await controller.start();
  bot.emit('end', 'ECONNREFUSED');
  assert.equal(controller.state, BOT_STATES.BACKOFF);
  assert.equal(controller.reconnectAttempts, 1);
  await controller.stop();
  assert.equal(controller.state, BOT_STATES.STOPPED);
});

test('connection classification and chat sanitisation are conservative', () => {
  assert.equal(classifyConnectionFailure('Invalid credentials').kind, 'non_retryable');
  assert.equal(classifyConnectionFailure('ECONNREFUSED').kind, 'temporary_server_unavailable');
  assert.equal(sanitizeChatMessage('\u0000 hello\nworld  '), 'hello world');
  assert.equal(sanitizeChatMessage('   '), null);
});
