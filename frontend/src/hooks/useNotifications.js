import { useState, useCallback } from 'react';

let _id = 0;

export function useNotifications() {
  const [toasts, setToasts] = useState([]);

  const requestPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addToast = useCallback((notif) => {
    const id = ++_id;
    setToasts(p => [{ id, ...notif }, ...p].slice(0, 5));

    // Notification navigateur
    if (Notification.permission === 'granted' && notif.title) {
      new Notification(notif.title, { body: notif.body || '' });
    }

    // Son discret
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = notif.urgent ? 880 : 660;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {}

    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), notif.urgent ? 8000 : 5000);
    return id;
  }, []);

  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  return { toasts, addToast, removeToast, requestPermission };
}
