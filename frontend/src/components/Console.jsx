import { useEffect, useRef, useState, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { api } from '../api/client.js';

// Parse: "[HH:MM:SS] [Thread/LEVEL]: message"
const LOG_REGEX = /^\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\/(\w+)\]: (.+)$/;

function parseLine(text) {
  const m = text.match(LOG_REGEX);
  if (!m) return { time: null, thread: null, level: 'RAW', message: text };
  return { time: m[1], thread: m[2], level: m[3], message: m[4] };
}

const LEVEL_STYLE = {
  INFO:  { badge: 'bg-blue-900 text-blue-300',  text: 'text-gray-300' },
  WARN:  { badge: 'bg-yellow-900 text-yellow-300', text: 'text-yellow-200' },
  ERROR: { badge: 'bg-red-900 text-red-300',    text: 'text-red-300' },
  FATAL: { badge: 'bg-red-700 text-white',       text: 'text-red-400' },
  DEBUG: { badge: 'bg-gray-700 text-gray-400',   text: 'text-gray-500' },
  RAW:   { badge: 'bg-gray-800 text-gray-500',   text: 'text-gray-400' },
};

function levelStyle(level) {
  return LEVEL_STYLE[level] ?? LEVEL_STYLE.RAW;
}

// Special message highlights
function messageClass(message) {
  if (/joined the game/i.test(message)) return 'text-green-400';
  if (/left the game/i.test(message))  return 'text-orange-400';
  if (/<.+>/.test(message))            return 'text-blue-300';  // chat
  return null;
}

const FILTERS = ['ALL', 'INFO', 'WARN', 'ERROR'];

export function Console() {
  const { logs, connected, clearLogs } = useWebSocket(500);
  const [command, setCommand]     = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx]     = useState(-1);
  const [sending, setSending]     = useState(false);
  const [filter, setFilter]       = useState('ALL');
  const [search, setSearch]       = useState('');
  const [showThread, setShowThread] = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const containerRef = useRef(null);
  const autoScroll   = useRef(true);

  useEffect(() => {
    if (autoScroll.current) bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  // Parse + filter + search
  const parsed = useMemo(() => logs.map(l => ({ ...parseLine(l.text), raw: l.text })), [logs]);

  const visible = useMemo(() => {
    const term = search.toLowerCase();
    return parsed.filter(l => {
      if (filter !== 'ALL' && l.level !== filter) return false;
      if (term && !l.raw.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [parsed, filter, search]);

  // Counts per level for badges
  const counts = useMemo(() => {
    const c = { WARN: 0, ERROR: 0 };
    parsed.forEach(l => { if (c[l.level] !== undefined) c[l.level]++; });
    return c;
  }, [parsed]);

  const sendCommand = async (e) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    setCmdHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setCommand('');
    setSending(true);
    try { await api.sendCommand(cmd); }
    catch (err) { console.error('Command failed:', err.message); }
    finally { setSending(false); }
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
    <div className="flex flex-col h-full p-6 gap-3">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold">Console</h2>
        <div className={`flex items-center gap-2 text-xs font-medium ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          {connected ? 'Live' : 'Reconnecting...'}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Level filters */}
        <div className="flex rounded overflow-hidden border border-mc-border">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium transition-colors relative
                ${filter === f ? 'bg-mc-border text-white' : 'bg-mc-panel text-gray-400 hover:text-white'}`}
            >
              {f}
              {f === 'WARN'  && counts.WARN  > 0 && <span className="ml-1 text-yellow-400">{counts.WARN}</span>}
              {f === 'ERROR' && counts.ERROR > 0 && <span className="ml-1 text-red-400">{counts.ERROR}</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="flex-1 min-w-[160px] bg-mc-panel border border-mc-border rounded px-3 py-1 text-xs
            outline-none focus:border-mc-green text-white placeholder-gray-600"
        />

        {/* Thread toggle */}
        <button
          onClick={() => setShowThread(v => !v)}
          className={`px-3 py-1 text-xs rounded border transition-colors
            ${showThread ? 'bg-mc-border border-mc-border text-white' : 'border-mc-border text-gray-400 hover:text-white'}`}
        >
          Thread
        </button>

        <button
          onClick={clearLogs}
          className="px-3 py-1 text-xs bg-mc-panel border border-mc-border text-gray-400 hover:text-white rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Log area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 bg-mc-panel border border-mc-border rounded-lg p-3 overflow-y-auto font-mono text-xs leading-6 min-h-0 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {visible.length === 0 && (
          <div className="text-gray-600 text-center pt-12">
            {connected ? (search || filter !== 'ALL' ? 'No matching logs.' : 'Waiting for logs...') : 'Connecting to agent...'}
          </div>
        )}

        {visible.map((log, i) => {
          const style   = levelStyle(log.level);
          const msgClass = messageClass(log.message) ?? style.text;

          return (
            <div key={i} className="flex items-baseline gap-2 hover:bg-white/5 px-1 rounded">
              {/* Time */}
              {log.time && (
                <span className="text-gray-600 shrink-0 select-none">{log.time}</span>
              )}

              {/* Level badge */}
              <span className={`shrink-0 px-1.5 rounded text-[10px] font-semibold uppercase leading-5 ${style.badge}`}>
                {log.level}
              </span>

              {/* Thread (optional) */}
              {showThread && log.thread && (
                <span className="text-gray-600 shrink-0 truncate max-w-[140px]">[{log.thread}]</span>
              )}

              {/* Message */}
              <span className={msgClass}>{log.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Command input */}
      <form onSubmit={sendCommand} className="flex shrink-0">
        <span className="flex items-center px-3 bg-mc-panel border border-r-0 border-mc-border rounded-l text-mc-green font-mono text-sm select-none">
          /
        </span>
        <input
          ref={inputRef}
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command... (↑↓ history)"
          disabled={sending}
          className="flex-1 bg-mc-panel border border-mc-border px-3 py-2.5 font-mono text-sm
            outline-none focus:border-mc-green text-white placeholder-gray-600 disabled:opacity-50"
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
