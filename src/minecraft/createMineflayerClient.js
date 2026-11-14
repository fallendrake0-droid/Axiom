'use strict';

function createMineflayerClient({ host, port, username, version, viewDistance }) {
  // This is the only live-client import boundary. Callers must clear config and protocol gates first.
  // eslint-disable-next-line global-require
  const mineflayer = require('mineflayer');
  return mineflayer.createBot({
    host,
    port,
    username,
    auth: 'offline',
    version,
    viewDistance,
    hideErrors: true
  });
}

module.exports = { createMineflayerClient };
