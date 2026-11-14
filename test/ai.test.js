'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { CentralBrain } = require('../src/ai/CentralBrain');
const { OllamaProvider } = require('../src/ai/OllamaProvider');
const {
  PlanValidationError,
  createIdlePlan,
  validatePlan
} = require('../src/ai/PlanContract');

const BOT_IDS = ['hsqoswqi', 'qojjosqsjiox', 'soiqsjowisjo', 'sqisoqwsi', 'sqosuqwos'];

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}

test('strict plan contract gives every bot one allowlisted assignment and rejects AI overreach', () => {
  const plan = validatePlan(createIdlePlan(BOT_IDS), BOT_IDS);
  assert.equal(plan.assignments.length, 5);
  assert.deepEqual(plan.assignments.map((assignment) => assignment.action), ['idle', 'idle', 'idle', 'idle', 'idle']);

  assert.throws(
    () =>
      validatePlan(
        {
          schemaVersion: 1,
          kind: 'swarm_plan',
          summary: 'unsafe',
          assignments: BOT_IDS.map((botId) => ({ botId, action: 'mine', target: 'diamond_ore' }))
        },
        BOT_IDS
      ),
    PlanValidationError
  );
  assert.throws(
    () =>
      validatePlan(
        {
          schemaVersion: 1,
          kind: 'swarm_plan',
          summary: 'duplicate',
          assignments: [...BOT_IDS].map(() => ({ botId: BOT_IDS[0], action: 'idle' }))
        },
        BOT_IDS
      ),
    /more than once/
  );
});

test('OllamaProvider checks the configured free model and validates a five-bot plan', async () => {
  const desiredPlan = {
    schemaVersion: 1,
    kind: 'swarm_plan',
    summary: 'All bots stay safe and idle.',
    assignments: BOT_IDS.map((botId) => ({ botId, action: 'idle' }))
  };
  const seen = [];
  const provider = new OllamaProvider({
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5:0.5b',
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      seen.push({ pathname: url.pathname, method: options.method });
      if (url.pathname === '/api/tags') return response({ models: [{ name: 'qwen2.5:0.5b' }] });
      return response({ message: { content: JSON.stringify(desiredPlan) } });
    },
    logger: { warn() {} }
  });

  for (const operation of [
    'interpretIntent',
    'generateTaskPlan',
    'replanTask',
    'generateChatResponse',
    'evaluateConversation',
    'summariseSwarmState',
    'healthCheck'
  ]) {
    assert.equal(typeof provider[operation], 'function');
  }
  assert.equal((await provider.healthCheck()).healthy, true);
  const plan = await provider.generateTaskPlan({ swarmContext: { bots: [] }, botIds: BOT_IDS });
  assert.deepEqual(plan.assignments, desiredPlan.assignments);
  assert.deepEqual(seen, [
    { pathname: '/api/tags', method: 'GET' },
    { pathname: '/api/chat', method: 'POST' }
  ]);
});

test('CentralBrain invokes one provider plan and dispatches it through the deterministic action boundary', async () => {
  const scheduled = [];
  const dispatched = [];
  const provider = {
    healthCheck: async () => ({ healthy: true, provider: 'ollama', model: 'qwen2.5:0.5b', reason: null }),
    generateTaskPlan: async () => createIdlePlan(BOT_IDS, 'Central plan covers all five bots.')
  };
  const brain = new CentralBrain({
    provider,
    botIds: BOT_IDS,
    config: {
      model: 'qwen2.5:0.5b',
      planIntervalMs: 30000,
      healthCheckIntervalMs: 30000,
      maxRequestsPerDay: 10
    },
    logger: { warn() {} },
    now: () => 10000,
    setTimeoutFn: (callback, delay) => {
      const token = { callback, delay, unref() {} };
      scheduled.push(token);
      return token;
    },
    clearTimeoutFn: () => {}
  });
  brain.start({
    getSwarmContext: () => ({ schemaVersion: 1, bots: BOT_IDS.map((botId) => ({ botId })) }),
    dispatchAction: async (assignment) => {
      dispatched.push(assignment);
      return { applied: true, action: assignment.action };
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  const planningTimer = scheduled.find((timer) => timer.delay === 750);
  assert.ok(planningTimer, 'expected a debounced plan after Ollama health succeeds');
  planningTimer.callback();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(dispatched.map((assignment) => assignment.botId), BOT_IDS);
  assert.equal(brain.getStatus().lastPlanSummary, 'Central plan covers all five bots.');
  brain.stop();
});
