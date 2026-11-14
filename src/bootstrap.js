'use strict';

const { ConfigLoader } = require('./config/ConfigLoader');

/**
 * Phase 1 bootstrap boundary. It deliberately loads configuration only; no
 * network listener, provider, Discord client, database, or Minecraft client
 * is started until its dedicated phase and acceptance gate exist.
 */
function loadConfiguration(options = {}) {
  const loader = new ConfigLoader(options);
  return { config: loader.load(), loader };
}

module.exports = {
  loadConfiguration
};
