'use strict';

class ProtocolCompatibilityError extends Error {
  constructor(result) {
    super(result.reason || `Minecraft version ${result.requestedVersion} is not supported by installed minecraft-data.`);
    this.name = 'ProtocolCompatibilityError';
    this.result = result;
  }
}

function normalizeVersionList(versions) {
  if (!versions) return [];
  const source = Array.isArray(versions) ? versions : Object.values(versions);
  const all = source
    .flatMap((entry) => {
      if (typeof entry === 'string') return [entry];
      if (!entry || typeof entry !== 'object') return [];
      return [entry.minecraftVersion, entry.version, entry.majorVersion].filter(
        (value) => typeof value === 'string'
      );
    })
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(all)].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function getInstalledProtocolVersions(minecraftDataModule) {
  const mcData = minecraftDataModule || require('minecraft-data'); // Lazy: never needed by config/unit tests.
  return normalizeVersionList(mcData?.versions?.pc);
}

function inspectProtocolCompatibility({ requestedVersion, allowExperimentalProtocol = false, minecraftDataModule } = {}) {
  const supportedVersions = getInstalledProtocolVersions(minecraftDataModule);
  const exactMatch = supportedVersions.includes(String(requestedVersion));
  if (exactMatch) {
    return {
      compatible: true,
      experimental: false,
      requestedVersion: String(requestedVersion),
      supportedVersions
    };
  }
  if (allowExperimentalProtocol) {
    return {
      compatible: true,
      experimental: true,
      requestedVersion: String(requestedVersion),
      supportedVersions,
      reason: `Installed minecraft-data does not advertise ${requestedVersion}; proceeding only because explicit experimental mode is enabled.`
    };
  }
  return {
    compatible: false,
    experimental: false,
    requestedVersion: String(requestedVersion),
    supportedVersions,
    reason: `Installed minecraft-data does not advertise exact Minecraft version ${requestedVersion}. AXIOM will not substitute another protocol.`
  };
}

function assertProtocolCompatibility(options) {
  const result = inspectProtocolCompatibility(options);
  if (!result.compatible) throw new ProtocolCompatibilityError(result);
  return result;
}

module.exports = {
  ProtocolCompatibilityError,
  assertProtocolCompatibility,
  getInstalledProtocolVersions,
  inspectProtocolCompatibility,
  normalizeVersionList
};
