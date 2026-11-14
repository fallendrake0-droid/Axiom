'use strict';

const { sanitizeChatMessage } = require('../bots/BotController');

const PLAN_SCHEMA_VERSION = 1;
const PLAN_ACTIONS = Object.freeze({ IDLE: 'idle', CHAT: 'chat' });

class PlanValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

function createIdlePlan(botIds, summary = 'Awaiting a safe, verified task.') {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    kind: 'swarm_plan',
    summary: String(summary).slice(0, 280),
    assignments: botIds.map((botId) => ({ botId, action: PLAN_ACTIONS.IDLE }))
  };
}

function validatePlan(rawPlan, botIds) {
  const allowedBotIds = new Set(botIds);
  if (!rawPlan || typeof rawPlan !== 'object' || Array.isArray(rawPlan)) {
    throw new PlanValidationError('Plan must be a JSON object.');
  }
  const allowedTopLevel = new Set(['schemaVersion', 'kind', 'summary', 'assignments']);
  for (const key of Object.keys(rawPlan)) {
    if (!allowedTopLevel.has(key)) throw new PlanValidationError(`Plan contains unsupported field ${key}.`);
  }
  if (rawPlan.schemaVersion !== PLAN_SCHEMA_VERSION || rawPlan.kind !== 'swarm_plan') {
    throw new PlanValidationError('Plan schemaVersion or kind is unsupported.');
  }
  if (typeof rawPlan.summary !== 'string' || rawPlan.summary.trim().length < 1 || rawPlan.summary.length > 280) {
    throw new PlanValidationError('Plan summary must be a non-empty string up to 280 characters.');
  }
  if (!Array.isArray(rawPlan.assignments) || rawPlan.assignments.length !== allowedBotIds.size) {
    throw new PlanValidationError(`Plan must contain exactly ${allowedBotIds.size} assignments.`);
  }

  const seenBots = new Set();
  let chatCount = 0;
  const assignments = rawPlan.assignments.map((rawAssignment) => {
    if (!rawAssignment || typeof rawAssignment !== 'object' || Array.isArray(rawAssignment)) {
      throw new PlanValidationError('Each assignment must be an object.');
    }
    const action = rawAssignment.action;
    const allowedAssignmentKeys = action === PLAN_ACTIONS.CHAT
      ? new Set(['botId', 'action', 'message'])
      : new Set(['botId', 'action']);
    for (const key of Object.keys(rawAssignment)) {
      if (!allowedAssignmentKeys.has(key)) {
        throw new PlanValidationError(`Assignment contains unsupported field ${key}.`);
      }
    }
    if (typeof rawAssignment.botId !== 'string' || !allowedBotIds.has(rawAssignment.botId)) {
      throw new PlanValidationError('Assignment references an unknown bot identity.');
    }
    if (seenBots.has(rawAssignment.botId)) {
      throw new PlanValidationError(`Plan assigns ${rawAssignment.botId} more than once.`);
    }
    seenBots.add(rawAssignment.botId);
    if (![PLAN_ACTIONS.IDLE, PLAN_ACTIONS.CHAT].includes(action)) {
      throw new PlanValidationError(`Assignment action ${String(action)} is not allowlisted.`);
    }
    if (action === PLAN_ACTIONS.IDLE) return { botId: rawAssignment.botId, action };

    chatCount += 1;
    const message = sanitizeChatMessage(rawAssignment.message);
    if (!message || message.length > 240) {
      throw new PlanValidationError('Chat assignment requires a safe message up to 240 characters.');
    }
    return { botId: rawAssignment.botId, action, message };
  });
  if (chatCount > 1) {
    throw new PlanValidationError('At most one strategic chat action is allowed per plan.');
  }
  if (seenBots.size !== allowedBotIds.size) {
    throw new PlanValidationError('Plan does not cover every logical bot exactly once.');
  }
  return Object.freeze({
    schemaVersion: PLAN_SCHEMA_VERSION,
    kind: 'swarm_plan',
    summary: rawPlan.summary.trim(),
    assignments: Object.freeze(assignments)
  });
}

function parsePlanJson(content, botIds) {
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 8192) {
    throw new PlanValidationError('Ollama plan content must be a JSON string up to 8192 bytes.');
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new PlanValidationError(`Ollama returned invalid JSON: ${error.message}`);
  }
  return validatePlan(parsed, botIds);
}

module.exports = {
  PLAN_ACTIONS,
  PLAN_SCHEMA_VERSION,
  PlanValidationError,
  createIdlePlan,
  parsePlanJson,
  validatePlan
};
