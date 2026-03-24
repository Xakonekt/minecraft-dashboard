import Docker from 'dockerode';
import { config } from '../config.js';

const docker = new Docker({ socketPath: config.docker.socketPath });

export function createDockerService(serverConfig) {
  function getContainer() {
    return docker.getContainer(serverConfig.containerName);
  }

  return {
    async getContainerStatus() {
      try {
        const info = await getContainer().inspect();
        return {
          running: info.State.Running,
          status: info.State.Status,
          startedAt: info.State.StartedAt,
          image: info.Config.Image,
          name: info.Name.replace('/', ''),
          tty: info.Config.Tty,
        };
      } catch (err) {
        if (err.statusCode === 404) return { running: false, status: 'not_found' };
        throw err;
      }
    },

    async startContainer()   { await getContainer().start(); },
    async stopContainer()    { await getContainer().stop(); },
    async restartContainer() { await getContainer().restart(); },

    async getContainerLogs(tail = 200) {
      const container = getContainer();
      const info = await container.inspect();
      const isTTY = info.Config.Tty;
      const buffer = await container.logs({
        stdout: true, stderr: true, tail, timestamps: false,
      });
      return isTTY ? parseRawLogs(buffer) : parseMuxedLogs(buffer);
    },

    async streamContainerLogs(onLog) {
      const container = getContainer();
      const info = await container.inspect();
      const isTTY = info.Config.Tty;

      const stream = await container.logs({
        stdout: true, stderr: true, follow: true, tail: 0, timestamps: false,
      });

      let lineBuffer = '';
      stream.on('data', (chunk) => {
        const text = isTTY ? chunk.toString('utf8') : extractMuxedText(chunk);
        lineBuffer += text;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop();
        for (const line of lines) {
          const clean = stripAnsi(line).trim();
          if (clean) onLog(clean);
        }
      });

      return stream;
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseRawLogs(buffer) {
  return buffer
    .toString('utf8')
    .split('\n')
    .map(l => stripAnsi(l).trim())
    .filter(Boolean);
}

function parseMuxedLogs(buffer) {
  const lines = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (offset + size > buffer.length) break;
    const chunk = buffer.slice(offset, offset + size).toString('utf8');
    offset += size;
    for (const line of chunk.split('\n')) {
      const clean = stripAnsi(line).trim();
      if (clean) lines.push(clean);
    }
  }
  return lines;
}

function extractMuxedText(buffer) {
  if (buffer.length <= 8) return buffer.toString('utf8');
  const streamType = buffer[0];
  if (streamType <= 2 && buffer.length >= 8) {
    const size = buffer.readUInt32BE(4);
    if (size + 8 === buffer.length) return buffer.slice(8).toString('utf8');
  }
  return buffer.toString('utf8');
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
}
