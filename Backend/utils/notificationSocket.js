const { Server } = require('socket.io');
const { findUserByToken } = require('../modules/auth');

let io;

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

function initializeNotificationSocket(server, allowedOrigins) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
          && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
        callback(null, !origin || isLocalDevelopmentOrigin || allowedOrigins.has(origin));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = String(socket.handshake.auth?.token || '').trim();
    if (!token) return next(new Error('Authentication required'));
    try {
      const user = await findUserByToken(token);
      if (!user || String(user.status || '').toLowerCase() !== 'active') {
        return next(new Error('Invalid, expired, or inactive session'));
      }

      const role = normalizeRole(user.role);
      if (['admin', 'super admin', 'superadmin'].includes(role)) socket.join('role:admin');
      if (['user', 'customer'].includes(role)) socket.join(`user:${user.user_id}`);
      if (role === 'chef') socket.join('role:chef');
      if (['delivery', 'delivery partner'].includes(role) && user.employee_id) {
        socket.join(`delivery:${user.employee_id}`);
      }
      if (role === 'server' && user.employee_id) {
        socket.join(`server:${user.employee_id}`);
        socket.join(`server:${user.user_id}`);
      }
      socket.data.user = user;
      return next();
    } catch (error) {
      console.error('Could not authenticate notification socket:', error.message);
      return next(new Error('Unable to authenticate notification connection'));
    }
  });

  return io;
}

function publishNotification(rooms, { type, title, message, link, data = {} }) {
  if (!io) {
    console.error('Realtime notification socket is not initialized.');
    return false;
  }
  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    message,
    link,
    data,
    createdAt: new Date().toISOString(),
  };
  try {
    io.to(rooms).emit('notification', payload);
    return true;
  } catch (error) {
    console.error('Could not publish realtime notification:', error.message);
    return false;
  }
}

const notifyAdmins = (notification) => publishNotification('role:admin', notification);
const notifyChefs = (notification) => publishNotification('role:chef', notification);
const notifyUser = (userId, notification) => userId
  ? publishNotification(`user:${userId}`, notification)
  : false;
const notifyDeliveryPartner = (employeeId, notification) => employeeId
  ? publishNotification(`delivery:${employeeId}`, notification)
  : false;
const notifyServer = (serverId, notification) => serverId
  ? publishNotification(`server:${serverId}`, notification)
  : false;

module.exports = {
  initializeNotificationSocket,
  notifyAdmins,
  notifyChefs,
  notifyDeliveryPartner,
  notifyServer,
  notifyUser,
};
