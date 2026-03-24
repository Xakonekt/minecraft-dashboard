import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

export function useServer(serverId, intervalMs = 5000) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!serverId) return;
    try {
      const data = await api.getStatus(serverId);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    setStatus(null);
    setLoading(true);
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { status, loading, error, refresh };
}
