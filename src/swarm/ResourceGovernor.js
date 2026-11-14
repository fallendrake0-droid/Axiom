'use strict';

const { EventEmitter } = require('node:events');
const { monitorEventLoopDelay } = require('node:perf_hooks');

class ResourceGovernor extends EventEmitter {
  constructor({ maxConfiguredConnections, resources, logger, sampleIntervalMs = 5000, processRef = process }) {
    super();
    this.maxConfiguredConnections = maxConfiguredConnections;
    this.resources = resources;
    this.logger = logger || console;
    this.sampleIntervalMs = sampleIntervalMs;
    this.processRef = processRef;
    this.timer = null;
    this.histogram = null;
    this.lastSample = null;
    this.lastCapacity = maxConfiguredConnections;
    this.previousCpu = null;
  }

  start() {
    if (this.timer) return;
    this.histogram = monitorEventLoopDelay({ resolution: 20 });
    this.histogram.enable();
    this.sample();
    this.timer = setInterval(() => this.sample(), this.sampleIntervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.histogram) this.histogram.disable();
    this.histogram = null;
  }

  sample() {
    const memory = this.processRef.memoryUsage();
    const cpu = this.processRef.cpuUsage(this.previousCpu || undefined);
    this.previousCpu = this.processRef.cpuUsage();
    const eventLoopP99Ms = this.histogram ? Number(this.histogram.percentile(99)) / 1e6 : null;
    this.histogram?.reset();
    const rssMb = bytesToMiB(memory.rss);
    let pressure = 'normal';
    let safeCapacity = this.maxConfiguredConnections;
    if (rssMb >= this.resources.memoryCriticalLimitMb) {
      pressure = 'critical';
      safeCapacity = 0;
    } else if (rssMb >= this.resources.memorySoftLimitMb || eventLoopP99Ms >= this.resources.eventLoopSoftLimitMs) {
      pressure = 'constrained';
      safeCapacity = Math.min(1, this.maxConfiguredConnections);
    }
    this.lastSample = {
      at: Date.now(),
      rssMb,
      heapUsedMb: bytesToMiB(memory.heapUsed),
      heapTotalMb: bytesToMiB(memory.heapTotal),
      externalMb: bytesToMiB(memory.external),
      cpuUserMicros: cpu.user,
      cpuSystemMicros: cpu.system,
      eventLoopP99Ms: eventLoopP99Ms === null ? null : round(eventLoopP99Ms),
      pressure,
      safeCapacity
    };
    if (safeCapacity !== this.lastCapacity) {
      this.lastCapacity = safeCapacity;
      this.logger.warn('Resource governor changed safe live capacity', this.lastSample);
      this.emit('capacity', this.lastSample);
    }
    this.emit('sample', this.lastSample);
    return this.lastSample;
  }

  getSnapshot() {
    return this.lastSample ? { ...this.lastSample } : null;
  }
}

function bytesToMiB(bytes) {
  return round(Number(bytes || 0) / 1024 / 1024);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = { ResourceGovernor, bytesToMiB };
