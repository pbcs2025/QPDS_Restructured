// backend/src/utils/socketActivityEmitter.js
let io = null;

/**
 * Initialize Socket.io instance
 */
function initializeSocket(socketIO) {
  io = socketIO;
  console.log('✅ Socket.io activity emitter initialized');
}

/**
 * Emit activity to all connected clients
 */
function emitActivity(activity) {
  if (io) {
    io.emit('activity_logged', activity);
    console.log('📡 Activity emitted via socket:', activity.activityType, '-', activity.name);
  }
}

/**
 * Emit to specific room (e.g., by role)
 */
function emitActivityToRole(activity, role) {
  if (io) {
    io.to(role).emit('activity_logged', activity);
  }
}

module.exports = {
  initializeSocket,
  emitActivity,
  emitActivityToRole
};