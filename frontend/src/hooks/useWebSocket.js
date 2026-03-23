import { useEffect, useRef, useState, useCallback } from 'react';
import { createWebSocket } from '../api/client.js';

export function useWebSocket(maxLines = 500) {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const ws = createWebSocket(
      (msg) => {
        if (msg.type === 'log') {
          setLogs((prev) => {
            const next = [...prev, { text: msg.data, timestamp: msg.timestamp }];
            return next.length > maxLines ? next.slice(-maxLines) : next;
          });
        }
      },
      () => setConnected(true),
      () => {
        setConnected(false);
        // Auto-reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    );

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [maxLines]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, connected, clearLogs };
}
