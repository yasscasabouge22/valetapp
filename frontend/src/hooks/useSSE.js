import { useEffect, useRef, useCallback } from 'react';

export function useSSE(url, handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // URL stable mémorisée — on ne se reconnecte que si l'URL change vraiment
  const urlRef = useRef(url);

  useEffect(() => {
    if (!url) return;

    let es = null;
    let retryTimer = null;
    let retries = 0;
    let destroyed = false;

    const EVENTS = [
      'connected', 'notification', 'mission_created', 'mission_updated',
      'mission_taken', 'mission_done', 'recovery_request', 'gps_update',
    ];

    function connect() {
      if (destroyed) return;

      try {
        es = new EventSource(url);
      } catch(e) {
        console.error('SSE connect error:', e);
        return;
      }

      es.onopen = () => {
        retries = 0;
        console.log('✅ SSE connected:', url);
      };

      es.onerror = (e) => {
        console.warn('⚠️ SSE error, reconnecting in', Math.min(1000 * 2**retries, 10000), 'ms');
        try { es.close(); } catch {}
        if (!destroyed) {
          const delay = Math.min(1000 * 2**retries, 10000);
          retries++;
          retryTimer = setTimeout(connect, delay);
        }
      };

      EVENTS.forEach(evt => {
        es.addEventListener(evt, (e) => {
          if (destroyed) return;
          try {
            const data = JSON.parse(e.data);
            const h = handlersRef.current[evt] || handlersRef.current['*'];
            if (h) h(data, evt);
          } catch(err) {
            console.error('SSE parse error:', err);
          }
        });
      });
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      if (es) { try { es.close(); } catch {} }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
