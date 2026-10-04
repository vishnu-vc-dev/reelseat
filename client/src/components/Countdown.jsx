import { useEffect, useState } from 'react';

/**
 * mm:ss countdown to `until`. Calls `onExpire` once when time runs out.
 * The remaining time is derived from the absolute deadline each tick, so
 * throttled background tabs still show the correct value when refocused.
 */
export default function Countdown({ until, onExpire }) {
  const deadline = new Date(until).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left === 0) {
        clearInterval(timer);
        onExpire?.();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <span className={`countdown ${remaining < 60000 ? 'urgent' : ''}`} aria-live="polite">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
