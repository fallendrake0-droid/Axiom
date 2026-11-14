'use strict';

const { loadConfiguration } = require('../bootstrap');
const { DomainError, ERROR_CODES } = require('../core/DomainError');

/**
 * Safe Phase-1 entry point. It validates local configuration and reports that
 * the foundation is ready; it deliberately does not start a network listener,
 * database, provider, Discord client, dashboard, or Minecraft connection.
 */
function run(options = {}) {
  const load = options.loadConfiguration || loadConfiguration;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;

  try {
    const { config, loader } = load(options.loadOptions || {});
    const result = Object.freeze({
      status: 'FOUNDATION_READY',
      mode: 'configuration_only',
      schemaVersion: config.schemaVersion,
      configHash: loader.configHash,
      networkStarted: false,
      liveConnections: 0,
      message: 'Configuration validated. No networked AXIOM service was started.'
    });
    stdout.write(`${JSON.stringify(result)}\n`);
    return { exitCode: 0, result };
  } catch (error) {
    const safeError = DomainError.wrap(error, ERROR_CODES.INTERNAL_ERROR, 'AXIOM foundation startup failed');
    const result = Object.freeze({
      error: Object.freeze({
        code: safeError.code,
        message: safeError.safeMessage,
        retryable: safeError.retryable
      })
    });
    stderr.write(`${JSON.stringify(result)}\n`);
    return { exitCode: 1, result };
  }
}

if (require.main === module) {
  process.exitCode = run().exitCode;
}

module.exports = {
  run
};
