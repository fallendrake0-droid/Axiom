'use strict';

const { sanitizeChatMessage } = require('../bots/BotController');

class ChatManager {
  constructor({ botIds, cooldownMs, globalMaxPerMinute, enabled, logger, now = () => Date.now() }) {
    this.botIds = new Set(botIds);
    this.cooldownMs = cooldownMs;
    this.globalMaxPerMinute = globalMaxPerMinute;
    this.enabled = enabled;
    this.logger = logger || console;
    this.now = now;
    this.lastResponseByBot = new Map();
    this.globalResponseTimes = [];
  }

  async handleIncoming({ botId, username, message, send }) {
    if (!this.enabled || !this.botIds.has(botId) || typeof send !== 'function') return { replied: false, reason: 'disabled' };
    const safeMessage = sanitizeChatMessage(message);
    if (!safeMessage || !this._shouldRespond(safeMessage, botId, username)) {
      return { replied: false, reason: 'not-addressed' };
    }
    const now = this.now();
    this._pruneGlobalWindow(now);
    if (this.globalResponseTimes.length >= this.globalMaxPerMinute) {
      return { replied: false, reason: 'global-rate-limit' };
    }
    const lastResponseAt = this.lastResponseByBot.get(botId);
    if (lastResponseAt !== undefined && now - lastResponseAt < this.cooldownMs) {
      return { replied: false, reason: 'bot-cooldown' };
    }
    const reply = this._responseFor(username);
    try {
      await send(reply);
      this.lastResponseByBot.set(botId, now);
      this.globalResponseTimes.push(now);
      this.logger.info('Sent conservative in-game chat response', { botId, username });
      return { replied: true, botId, message: reply };
    } catch (error) {
      this.logger.warn('Unable to send in-game chat response', {
        botId,
        error: String(error?.message || error)
      });
      return { replied: false, reason: 'send-failed' };
    }
  }

  _shouldRespond(message, botId, username) {
    const mentionedBot = [...this.botIds].find((candidate) => mentionsBot(message, candidate));
    if (mentionedBot) return mentionedBot === botId;
    if (!/\?\s*$/.test(message)) return false;

    // Every Mineflayer client receives the same question. Deterministically nominate
    // exactly one logical bot so a general question never turns into a five-bot pile-on.
    const orderedBots = [...this.botIds].sort();
    const selected = orderedBots[stableHash(`${username}\u0000${message}`) % orderedBots.length];
    return selected === botId;
  }

  _responseFor(username) {
    const safeName = String(username).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
    return safeName
      ? `Hi ${safeName}. I'm online; task controls stay with the authorised operator.`
      : "I'm online; task controls stay with the authorised operator.";
  }

  _pruneGlobalWindow(now) {
    const cutoff = now - 60000;
    this.globalResponseTimes = this.globalResponseTimes.filter((at) => at > cutoff);
  }
}

function mentionsBot(message, botId) {
  const mention = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(botId.toLowerCase())}([^a-z0-9_]|$)`, 'i');
  return mention.test(String(message).toLowerCase());
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { ChatManager, mentionsBot, stableHash };
