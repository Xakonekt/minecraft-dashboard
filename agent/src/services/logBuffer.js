const MAX_LINES = 1000;

const logs = [];
const subscribers = new Set();

export function addLog(line) {
  const entry = { text: line, timestamp: new Date().toISOString() };
  logs.push(entry);
  if (logs.length > MAX_LINES) logs.shift();
  subscribers.forEach(fn => fn(entry));
}

export function getLogs() {
  return [...logs];
}

export function clearLogs() {
  logs.length = 0;
  console.log('[LogBuffer] Cleared');
}

// Subscribe to new logs — returns unsubscribe function
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
