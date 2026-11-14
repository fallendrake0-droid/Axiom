'use strict';

const { EventEmitter } = require('node:events');
const { createIdlePlan, validatePlan } = require('./PlanContract');

class CentralBrain extends EventEmitter {
  constructor({ provider, botIds, config, logger, now = () => Date.now(), setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout }) {
    super();
    if (!provider || typeof provider.generateTaskPlan !== 'function' || typeof provider.healthCheck !== 'function') {
      throw new TypeError('CentralBrain requires an AI provider with healthCheck() and generateTaskPlan().');
    }
    this.provider = provider;
    this.botIds = Object.freeze([...botIds]);
    this.config = config;
    this.logger = logger || console;
    this.now = now;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.running = false;
    this.planTimer = null;
    this.healthTimer = null;
    this.planning = false;
    this.planRequested = false;
    this.requestTimestamps = [];
    this.lastPlan = createIdlePlan(this.botIds, 'AI planner has not issued a plan yet.');
    this.lastPlanAt = null;
    this.lastPlanReason = null;
    this.lastError = null;
    this.health = { healthy: false, provider: 'ollama', model: config.model, reason: 'Not checked yet.' };
    this.getSwarmContext = null;
    this.dispatchAction = null;
  }

  start({ getSwarmContext, dispatchAction }) {
    if (this.running) return;
    if (typeof getSwarmContext !== 'function' || typeof dispatchAction !== 'function') {
      throw new TypeError('CentralBrain needs context and deterministic action dispatch functions.');
    }
    this.running = true;
    this.getSwarmContext = getSwarmContext;
    this.dispatchAction = dispatchAction;
    void this.refreshHealth({ schedulePlan: true });
    this._scheduleHealthCheck();
  }

  stop() {
    this.running = false;
    if (this.planTimer) this.clearTimeoutFn(this.planTimer);
    if (this.healthTimer) this.clearTimeoutFn(this.healthTimer);
    this.planTimer = null;
    this.healthTimer = null;
    this.planRequested = false;
  }

  requestPlan(reason = 'significant_swarm_event') {
    if (!this.running) return;
    this.planRequested = true;
    this.lastPlanReason = String(reason).slice(0, 120);
    if (this.planTimer || this.planning) return;
    const elapsedSinceLastPlan = this.lastPlanAt === null ? Number.POSITIVE_INFINITY : this.now() - this.lastPlanAt;
    const delayMs = Math.max(750, this.config.planIntervalMs - elapsedSinceLastPlan);
    this.planTimer = this.setTimeoutFn(() => {
      this.planTimer = null;
      void this._planNow();
    }, delayMs);
    this.planTimer.unref?.();
  }

  async refreshHealth({ schedulePlan = false } = {}) {
    if (!this.running) return this.health;
    const wasHealthy = this.health.healthy;
    try {
      const health = await this.provider.healthCheck();
      this.health = { ...health, checkedAt: this.now() };
      if (health.healthy) {
        this.lastError = null;
        if (schedulePlan || !wasHealthy) this.requestPlan('ollama_healthy');
      } else {
        this.lastError = health.reason || 'Ollama provider is unhealthy.';
      }
    } catch (error) {
      this.health = {
        healthy: false,
        provider: 'ollama',
        model: this.config.model,
        reason: String(error?.message || error).slice(0, 500),
        checkedAt: this.now()
      };
      this.lastError = this.health.reason;
    }
    this.emit('health', this.health);
    return this.health;
  }

  getStatus() {
    return {
      enabled: true,
      running: this.running,
      provider: 'ollama',
      model: this.config.model,
      health: { ...this.health },
      lastPlanAt: this.lastPlanAt,
      lastPlanReason: this.lastPlanReason,
      lastPlanSummary: this.lastPlan?.summary || null,
      requestCountLast24Hours: this._pruneRequestWindow(this.now()).length,
      maxRequestsPerDay: this.config.maxRequestsPerDay,
      lastError: this.lastError
    };
  }

  async _planNow() {
    if (!this.running || this.planning || !this.planRequested) return;
    this.planRequested = false;
    if (!this.health.healthy) return;
    const now = this.now();
    if (this._pruneRequestWindow(now).length >= this.config.maxRequestsPerDay) {
      this.lastError = `Ollama daily request budget (${this.config.maxRequestsPerDay}) has been reached.`;
      this.emit('budgetExhausted', { at: now, maxRequestsPerDay: this.config.maxRequestsPerDay });
      return;
    }
    this.planning = true;
    try {
      const swarmContext = this.getSwarmContext();
      this.requestTimestamps.push(now);
      const rawPlan = await this.provider.generateTaskPlan({ swarmContext, botIds: this.botIds });
      if (!this.running) return;
      const plan = validatePlan(rawPlan, this.botIds);
      await this._dispatchPlan(plan);
      this.lastPlan = plan;
      this.lastPlanAt = now;
      this.lastError = null;
      this.emit('plan', { plan, reason: this.lastPlanReason, at: now });
    } catch (error) {
      this.lastError = String(error?.message || error).slice(0, 500);
      this.logger.warn('Ollama plan rejected or unavailable; deterministic bot safety remains active', {
        error: this.lastError
      });
      this.emit('planError', { error: this.lastError, at: now });
    } finally {
      this.planning = false;
      if (this.planRequested) this.requestPlan('coalesced_significant_event');
      else this._scheduleRecurringPlan();
    }
  }

  async _dispatchPlan(plan) {
    const outcomes = [];
    for (const assignment of plan.assignments) {
      try {
        outcomes.push({ botId: assignment.botId, ...(await this.dispatchAction(assignment)) });
      } catch (error) {
        outcomes.push({
          botId: assignment.botId,
          applied: false,
          reason: String(error?.message || error).slice(0, 280)
        });
      }
    }
    this.emit('planDispatched', { plan, outcomes, at: this.now() });
    return outcomes;
  }

  _scheduleRecurringPlan() {
    if (!this.running || this.planTimer || !this.health.healthy) return;
    this.planTimer = this.setTimeoutFn(() => {
      this.planTimer = null;
      this.planRequested = true;
      void this._planNow();
    }, this.config.planIntervalMs);
    this.planTimer.unref?.();
  }

  _scheduleHealthCheck() {
    if (!this.running) return;
    this.healthTimer = this.setTimeoutFn(async () => {
      this.healthTimer = null;
      await this.refreshHealth({ schedulePlan: false });
      this._scheduleHealthCheck();
    }, this.config.healthCheckIntervalMs);
    this.healthTimer.unref?.();
  }

  _pruneRequestWindow(now) {
    const cutoff = now - 24 * 60 * 60 * 1000;
    this.requestTimestamps = this.requestTimestamps.filter((timestamp) => timestamp > cutoff);
    return this.requestTimestamps;
  }
}

module.exports = { CentralBrain };
