'use strict';

const fs = require('node:fs');
const path = require('node:path');

class DeathRecorder {
  constructor({ dataDir, logger, maxFileBytes = 512 * 1024 } = {}) {
    this.filePath = path.join(dataDir, 'deaths.jsonl');
    this.logger = logger || console;
    this.maxFileBytes = maxFileBytes;
  }

  record(snapshot) {
    const safeSnapshot = {
      event: 'bot_death',
      botId: snapshot.botId,
      at: snapshot.at,
      dimension: snapshot.dimension,
      position: snapshot.position,
      health: snapshot.health,
      hunger: snapshot.hunger,
      inventory: Array.isArray(snapshot.inventory) ? snapshot.inventory.slice(0, 64) : [],
      currentTask: snapshot.currentTask || null
    };
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      this._rotateIfNeeded();
      fs.appendFileSync(this.filePath, `${JSON.stringify(safeSnapshot)}\n`, { encoding: 'utf8', mode: 0o600 });
      return true;
    } catch (error) {
      this.logger.error('Unable to persist compact death snapshot', {
        botId: snapshot.botId,
        error: String(error?.message || error)
      });
      return false;
    }
  }

  _rotateIfNeeded() {
    if (!fs.existsSync(this.filePath)) return;
    if (fs.statSync(this.filePath).size < this.maxFileBytes) return;
    const backupPath = `${this.filePath}.1`;
    try {
      fs.rmSync(backupPath, { force: true });
      fs.renameSync(this.filePath, backupPath);
    } catch (error) {
      throw new Error(`Could not rotate bounded death log: ${error.message}`);
    }
  }
}

module.exports = { DeathRecorder };
