import { useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';

const EVENTS = ['seats:held', 'seats:released', 'seats:booked'];

/**
 * Subscribes to live seat events for one show.
 * Joins the show's room on mount (and again after reconnects, since rooms
 * are per-connection) and leaves it on unmount.
 *
 * @param {string} showId
 * @param {(event: string, payload: { showId: string, seats: string[] }) => void} onEvent
 */
export default function useShowSocket(showId, onEvent) {
  /** Keep the latest callback without re-subscribing on every render. */
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!showId) return undefined;
    const socket = getSocket();
    const join = () => socket.emit('show:join', showId);

    const listeners = EVENTS.map((event) => {
      const fn = (payload) => {
        if (payload?.showId === showId) handlerRef.current(event, payload);
      };
      socket.on(event, fn);
      return [event, fn];
    });

    if (socket.connected) join();
    socket.on('connect', join);

    return () => {
      socket.emit('show:leave', showId);
      socket.off('connect', join);
      listeners.forEach(([event, fn]) => socket.off(event, fn));
    };
  }, [showId]);
}
