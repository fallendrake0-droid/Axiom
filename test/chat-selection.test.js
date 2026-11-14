'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { ChatManager } = require('../src/chat/ChatManager');

test('a general player question deterministically nominates one bot rather than piling on', async () => {
  const manager = new ChatManager({
    botIds: ['hsqoswqi', 'qojjosqsjiox', 'soiqsjowisjo'],
    cooldownMs: 1000,
    globalMaxPerMinute: 3,
    enabled: true,
    logger: { info() {}, warn() {} },
    now: () => 10000
  });
  const sent = [];
  const message = 'Can anyone help me?';
  const results = await Promise.all(
    ['hsqoswqi', 'qojjosqsjiox', 'soiqsjowisjo'].map((botId) =>
      manager.handleIncoming({
        botId,
        username: 'Player',
        message,
        send: async (reply) => sent.push({ botId, reply })
      })
    )
  );
  assert.equal(results.filter((result) => result.replied).length, 1);
  assert.equal(sent.length, 1);
});

test('a direct mention selects the named bot even if every client receives the message', async () => {
  const manager = new ChatManager({
    botIds: ['hsqoswqi', 'qojjosqsjiox'],
    cooldownMs: 1000,
    globalMaxPerMinute: 3,
    enabled: true,
    logger: { info() {}, warn() {} },
    now: () => 10000
  });
  const results = await Promise.all(
    ['hsqoswqi', 'qojjosqsjiox'].map((botId) =>
      manager.handleIncoming({
        botId,
        username: 'Player',
        message: 'qojjosqsjiox, are you there?',
        send: async () => {}
      })
    )
  );
  assert.deepEqual(results.map((result) => result.replied), [false, true]);
});
