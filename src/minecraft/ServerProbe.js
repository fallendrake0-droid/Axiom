'use strict';

class ServerValidationError extends Error {
  constructor(message, { cause, status } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ServerValidationError';
    this.status = status || null;
  }
}

async function probeMinecraftServer({ host, port, version, timeoutMs = 10000, ping } = {}) {
  if (!host || !port || !version) throw new TypeError('Server probe requires host, port, and a pinned Minecraft version.');
  // Lazy dependency boundary: this status ping occurs before any Mineflayer login/client creation.
  // eslint-disable-next-line global-require
  const pingServer = ping || require('minecraft-protocol').ping;
  let status;
  try {
    status = await pingServer({
      host,
      port,
      version,
      closeTimeout: timeoutMs,
      noPongTimeout: Math.min(5000, timeoutMs)
    });
  } catch (error) {
    throw new ServerValidationError(
      `Could not validate ${host}:${port} before bot login (${String(error?.message || error)}). Start or repair the authorised server manually; AXIOM will not automate Aternos.`,
      { cause: error }
    );
  }
  return validateServerStatus({ status, requestedVersion: version, host, port });
}

function validateServerStatus({ status, requestedVersion, host, port }) {
  const advertisedVersion = status?.version?.name;
  if (typeof advertisedVersion !== 'string' || !versionMatches(advertisedVersion, requestedVersion)) {
    throw new ServerValidationError(
      `Server ${host || 'target'}:${port || 'unknown'} advertised version ${JSON.stringify(advertisedVersion || null)}, not the pinned ${requestedVersion}. No bot login was attempted.`,
      { status: compactServerStatus(status) }
    );
  }
  return compactServerStatus(status);
}

function versionMatches(advertisedVersion, requestedVersion) {
  const advertised = String(advertisedVersion).trim();
  const requested = String(requestedVersion).trim();
  return advertised === requested || advertised.startsWith(`${requested} `) || advertised.startsWith(`${requested}-`);
}

function compactServerStatus(status) {
  return {
    version: {
      name: typeof status?.version?.name === 'string' ? status.version.name : null,
      protocol: Number.isInteger(status?.version?.protocol) ? status.version.protocol : null
    },
    players: {
      online: Number.isInteger(status?.players?.online) ? status.players.online : null,
      max: Number.isInteger(status?.players?.max) ? status.players.max : null
    },
    latency: typeof status?.latency === 'number' && Number.isFinite(status.latency) ? status.latency : null
  };
}

module.exports = {
  ServerValidationError,
  compactServerStatus,
  probeMinecraftServer,
  validateServerStatus,
  versionMatches
};
