const MAX_LINES = 1000;

export function createLogBuffer() {
  const logs = [];
  const subscribers = new Set();

  return {
    addLog(line) {
      const entry = { text: line, timestamp: new Date().toISOString() };
      logs.push(entry);
      if (logs.length > MAX_LINES) logs.shift();
      subscribers.forEach(fn => fn(entry));
    },
    getLogs() { return [...logs]; },
    clearLogs() { logs.length = 0; },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
