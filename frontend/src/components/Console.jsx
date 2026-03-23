import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { api } from '../api/client.js';

// Color-code log lines based on content
function logClass(text) {
  if (/ERROR|FATAL|Exception/i.test(text)) return 'text-red-400';
  if (/WARN/i.test(text)) return 'text-yellow-400';
  if (/joined the game/i.test(text)) return 'text-green-400';
  if (/left the game/i.test(text)) return 'text-orange-400';
  if (/\[Chat\]/.test(text)) return 'text-blue-300';
  return 'text-gray-300';
}

export function Console() {
  const { logs, connected, clearLogs } = useWebSocket(500);
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const autoScroll = useRef(true);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScroll.current = atBottom;
  };

  const sendCommand = async (e) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    setCmdHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setCommand('');
    setSending(true);

    try {
      await api.sendCommand(cmd);
    } catch (err) {
      console.error('Command failed:', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setCommand(cmdHistory[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setCommand(next === -1 ? '' : cmdHistory[next]);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold">Console</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-xs bg-mc-border hover:bg-mc-border/70 rounded transition-colors"
          >
            Clear
          </button>
          <div
            className={`flex items-center gap-2 text-xs font-medium ${
              connected ? 'text-green-400' : 'text-yellow-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
              }`}
            />
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Log area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 bg-mc-panel border border-mc-border rounded-lg p-4 overflow-y-auto font-mono text-xs leading-5 min-h-0 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {logs.length === 0 && (
          <div className="text-gray-600 text-center pt-12">
            {connected ? 'Waiting for server logs...' : 'Connecting to agent...'}
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className={logClass(log.text)}>
            {log.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command input */}
      <form onSubmit={sendCommand} className="flex shrink-0">
        <span className="flex items-center px-3 bg-mc-panel border border-r-0 border-mc-border rounded-l text-mc-green font-mono text-sm">
          /
        </span>
        <input
          ref={inputRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command... (↑↓ history)"
          disabled={sending}
          className="flex-1 bg-mc-panel border border-mc-border px-3 py-2.5 font-mono text-sm
            outline-none focus:border-mc-green text-white placeholder-gray-600
            disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={!command.trim() || sending}
          className="px-5 py-2.5 bg-mc-green hover:bg-green-600 text-white text-sm font-medium
            rounded-r transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
