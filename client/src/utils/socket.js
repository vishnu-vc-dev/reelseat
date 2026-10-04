import { io } from 'socket.io-client';

/**
 * Lazily created Socket.IO connection shared by every page.
 *
 * In development the Vite proxy forwards /socket.io, so connecting to the
 * current origin works. In production the static frontend host cannot proxy
 * WebSockets, so VITE_SOCKET_URL points straight at the API server.
 */
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
