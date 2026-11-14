'use strict';

const readline = require('node:readline');
const { loadConfig, redactConfig } = require('./src/config/loadConfig');
const { createLogger } = require('./src/logging/createLogger');
const { OllamaProvider } = require('./src/ai/OllamaProvider');
const { inspectProtocolCompatibility } = require('./src/minecraft/compatibility');
const { SwarmManager } = require('./src/swarm/SwarmManager');

function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const values = [];
  for (const argument of argv) {
    if (argument.startsWith('--')) flags.add(argument);
    else values.push(argument);
  }
  return { flags, values };
}

function printHelp(output = process.stdout) {
  output.write([
    'AXIOM Mineflayer worker',
    '',
    'Usage:',
    '  npm start',
    '  node index.js --check-config',
    '  node index.js --check-compatibility',
    '  node index.js --check-ollama',
    '  node index.js --dry-run',
    '',
    'Setup:',
    '  cp .env.example .env',
    '  Review the authorised target and set AXIOM_OFFLINE_SERVER_AUTHORIZED=true only after confirmation.',
    '',
    'Safety: AXIOM does not automate Aternos, bypass authentication, or accept in-game administrative commands.',
    ''
  ].join('\n'));
}

function printJson(output, value) {
  output.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runCli(argv = process.argv.slice(2), dependencies = {}) {
  const output = dependencies.stdout || process.stdout;
  const errorOutput = dependencies.stderr || process.stderr;
  const env = dependencies.env || process.env;
  const cwd = dependencies.cwd || process.cwd();
  const { flags } = parseArgs(argv);

  if (flags.has('--help') || flags.has('-h')) {
    printHelp(output);
    return { exitCode: 0 };
  }
  const knownFlags = new Set(['--check-config', '--check-compatibility', '--check-ollama', '--dry-run']);
  const unknownFlags = [...flags].filter((flag) => !knownFlags.has(flag));
  if (unknownFlags.length > 0) {
    errorOutput.write(`Unknown option(s): ${unknownFlags.join(', ')}\n`);
    printHelp(errorOutput);
    return { exitCode: 1 };
  }

  let config;
  try {
    config = loadConfig({ env, cwd });
  } catch (error) {
    errorOutput.write(`${error.message}\n`);
    return { exitCode: 1 };
  }

  if (flags.has('--check-config')) {
    printJson(output, { valid: true, config: redactConfig(config) });
    return { exitCode: 0 };
  }
  if (flags.has('--check-ollama')) {
    if (!config.ai.enabled) {
      errorOutput.write('Ollama brain is disabled by AXIOM_AI_ENABLED=false.\n');
      return { exitCode: 1 };
    }
    const provider =
      dependencies.aiProvider ||
      new OllamaProvider({
        baseUrl: config.ai.baseUrl,
        model: config.ai.model,
        timeoutMs: config.ai.requestTimeoutMs,
        maxContextBytes: config.ai.maxContextBytes
      });
    try {
      const health = await provider.healthCheck();
      printJson(output, health);
      return { exitCode: health.healthy ? 0 : 1 };
    } catch (error) {
      errorOutput.write(`Unable to check Ollama: ${error.message}\n`);
      return { exitCode: 1 };
    }
  }

  let compatibility;
  try {
    compatibility = inspectProtocolCompatibility({
      requestedVersion: config.server.version,
      allowExperimentalProtocol: config.server.allowExperimentalProtocol,
      minecraftDataModule: dependencies.minecraftDataModule
    });
  } catch (error) {
    errorOutput.write(`Unable to inspect installed minecraft-data: ${error.message}\n`);
    return { exitCode: 1 };
  }

  if (flags.has('--check-compatibility')) {
    printJson(output, compatibility);
    return { exitCode: compatibility.compatible ? 0 : 1 };
  }
  if (flags.has('--dry-run')) {
    printJson(output, {
      config: redactConfig(config),
      compatibility,
      wouldConnect: compatibility.compatible,
      liveConnectionsOpened: 0
    });
    return { exitCode: compatibility.compatible ? 0 : 1 };
  }

  const logger = dependencies.logger || createLogger({
    level: config.runtime.logLevel,
    dataDir: config.runtime.dataDir,
    stdout: output
  });
  const swarm = dependencies.swarm || new SwarmManager({ config, logger });
  try {
    await swarm.start();
  } catch (error) {
    errorOutput.write(`AXIOM did not open a Minecraft connection: ${error.message}\n`);
    return { exitCode: 1 };
  }
  output.write('AXIOM is running. Type "help" for terminal commands; Ctrl+C disconnects cleanly.\n');

  let shutdownPromise = null;
  const shutdown = async (reason) => {
    if (!shutdownPromise) {
      shutdownPromise = swarm.stop(reason).catch((error) => {
        errorOutput.write(`Clean shutdown failed: ${error.message}\n`);
      });
    }
    await shutdownPromise;
  };
  const onSigint = () => void shutdown('SIGINT').then(() => process.exit(0));
  const onSigterm = () => void shutdown('SIGTERM').then(() => process.exit(0));
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  let terminal = null;
  if (dependencies.interactive ?? process.stdin.isTTY) {
    terminal = attachTerminal({ input: dependencies.stdin || process.stdin, output, swarm, shutdown });
  }
  return { exitCode: 0, swarm, terminal, shutdown };
}

function attachTerminal({ input, output, swarm, shutdown }) {
  const terminal = readline.createInterface({ input, output, prompt: 'axiom> ', historySize: 50 });
  output.write('Terminal commands: status, say, sayall, start, stop, help, quit\n');
  terminal.prompt();
  terminal.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return terminal.prompt();
    try {
      if (trimmed === 'help') {
        output.write('status | say <bot> <message> | sayall <message> | start <bot> | stop <bot> | quit\n');
      } else if (trimmed === 'status') {
        printJson(output, swarm.getStatus());
      } else if (trimmed === 'quit' || trimmed === 'exit') {
        terminal.close();
        await shutdown('operator terminal quit');
      } else if (trimmed.startsWith('sayall ')) {
        const message = trimmed.slice('sayall '.length);
        printJson(output, await swarm.sayAll(message));
      } else if (trimmed.startsWith('say ')) {
        const [, botId, ...messageParts] = trimmed.split(/\s+/);
        if (!botId || messageParts.length === 0) throw new Error('Usage: say <bot> <message>');
        const message = messageParts.join(' ');
        printJson(output, { botId, message: await swarm.say(botId, message) });
      } else if (trimmed.startsWith('start ')) {
        const botId = trimmed.slice('start '.length).trim();
        if (!botId) throw new Error('Usage: start <bot>');
        printJson(output, await swarm.requestStart(botId));
      } else if (trimmed.startsWith('stop ')) {
        const botId = trimmed.slice('stop '.length).trim();
        if (!botId) throw new Error('Usage: stop <bot>');
        printJson(output, await swarm.requestStop(botId));
      } else {
        throw new Error('Unknown command. Type help.');
      }
    } catch (error) {
      output.write(`Error: ${error.message}\n`);
    }
    if (!terminal.closed) terminal.prompt();
  });
  terminal.on('close', () => void shutdown('operator terminal closed'));
  return terminal;
}

if (require.main === module) {
  runCli().then(
    (result) => {
      if (result.exitCode !== 0) process.exitCode = result.exitCode;
    },
    (error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exitCode = 1;
    }
  );
}

module.exports = { attachTerminal, parseArgs, printHelp, runCli };
