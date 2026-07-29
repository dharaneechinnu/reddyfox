import { useEffect, useState } from 'react';
import { c } from '../tokens';
import { isPushSupported, requestFcmToken } from '../firebase';
import { subscribeToNotifications } from '../api';

// Local flag only — the source of truth for whether a token is actually
// registered lives in PushSubscriber on the backend. This just stops the
// button reappearing on every visit once the browser has granted permission
// and successfully subscribed once.
const STORAGE_KEY = 'fx-rate-alerts-subscribed';

function BellIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

/**
 * Floating opt-in for Chrome rate-alert push notifications. Renders nothing
 * when push isn't supported, a Firebase project isn't configured (see
 * src/firebase.js), the browser already denied permission, or this browser
 * already subscribed.
 */
export default function NotificationOptIn() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | subscribed | error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    isPushSupported().then((ok) => {
      if (cancelled) return;
      setSupported(ok);
      const alreadyGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      if (ok && alreadyGranted && localStorage.getItem(STORAGE_KEY)) {
        setStatus('subscribed');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
  if (!supported || denied || status === 'subscribed') return null;

  const handleClick = async () => {
    setStatus('loading');
    setError('');
    try {
      const token = await requestFcmToken();
      await subscribeToNotifications(token);
      localStorage.setItem(STORAGE_KEY, '1');
      setStatus('subscribed');
    } catch (err) {
      setError(err.message || 'Could not enable rate alerts.');
      setStatus('error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      {error && (
        <span style={{
          background: c.redBg, color: c.redText, fontSize: 12, padding: '6px 10px',
          borderRadius: 8, maxWidth: 220, textAlign: 'right', boxShadow: '0 10px 20px -12px rgba(11,27,51,.4)',
        }}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'loading'}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: c.navy,
          border: `1px solid ${c.sandBorder}`, padding: '11px 18px', borderRadius: 100, fontSize: 13.5,
          fontWeight: 600, cursor: status === 'loading' ? 'default' : 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 18px 30px -18px rgba(11,27,51,.4)', opacity: status === 'loading' ? .7 : 1,
        }}
      >
        <BellIcon />
        {status === 'loading' ? 'Enabling…' : 'Enable rate alerts'}
      </button>
    </div>
  );
}
