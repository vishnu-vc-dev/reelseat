const { Server } = require('socket.io');
const env = require('../config/env');

/** @type {import('socket.io').Server | null} */
let io = null;

const room = (showId) => `show:${showId}`;

/**
 * Attaches Socket.IO to the HTTP server.
 *
 * Clients join one room per show they are viewing. Seat events are broadcast
 * to that room only, so a customer looking at the 6pm show never receives
 * traffic for the 9pm show. Sockets are read-only for clients: every state
 * change goes through the authenticated REST API, which then broadcasts.
 *
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('show:join', (showId) => {
      if (typeof showId === 'string' && /^[a-f\d]{24}$/i.test(showId)) socket.join(room(showId));
    });
    socket.on('show:leave', (showId) => {
      if (typeof showId === 'string') socket.leave(room(showId));
    });
  });

  return io;
}

/**
 * Broadcasts a seat event to everyone viewing a show.
 * Safe to call when sockets are not initialised (unit tests, scripts).
 * @param {string} showId
 * @param {'seats:held'|'seats:released'|'seats:booked'} event
 * @param {object} payload
 */
function emitToShow(showId, event, payload) {
  if (io) io.to(room(String(showId))).emit(event, { showId: String(showId), ...payload });
}

module.exports = { initSocket, emitToShow };
