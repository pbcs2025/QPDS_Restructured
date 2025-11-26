// backend/src/middleware/activityLogger.js - UPDATED VERSION
const mongoose = require('mongoose');
const SessionActivity = require('../models/SessionActivity');
const { emitActivity } = require('../utils/socketActivityEmitter');

/**
 * Extract user info from request (set by verifyToken middleware)
 */
function getUserInfo(req) {
  return {
    userId: req.user?.id,
    username: req.user?.username,
    name: req.user?.name,
    role: req.user?.role,
    usertype: req.user?.usertype
  };
}

/**
 * Get client IP address
 */
function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Log activity to database and emit via socket
 */
async function logActivity(activityData) {
  try {
    // Convert userId string to ObjectId if needed
    const processedData = { ...activityData };
    if (processedData.userId && typeof processedData.userId === 'string') {
      // Check if it's a valid ObjectId string
      if (mongoose.Types.ObjectId.isValid(processedData.userId)) {
        processedData.userId = new mongoose.Types.ObjectId(processedData.userId);
      }
    } else if (processedData.id && typeof processedData.id === 'string') {
      // Handle 'id' field and convert to 'userId' ObjectId
      if (mongoose.Types.ObjectId.isValid(processedData.id)) {
        processedData.userId = new mongoose.Types.ObjectId(processedData.id);
        delete processedData.id;
      }
    }
    
    const activity = await SessionActivity.logActivity(processedData);
    
    // Emit to Socket.io clients for real-time updates
    if (activity) {
      emitActivity(activity.toObject());
    }
    
    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
}

/**
 * Activity logger middleware
 * Logs user activities based on route patterns
 */
const activityLogger = (activityType, descriptionFn) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function to log after successful response
    res.send = function(data) {
      // Only log if response was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userInfo = getUserInfo(req);
        
        if (userInfo.userId) {
          const description = typeof descriptionFn === 'function' 
            ? descriptionFn(req, res) 
            : descriptionFn;

          logActivity({
            ...userInfo,
            activityType,
            description,
            ipAddress: getIpAddress(req),
            userAgent: req.headers['user-agent'],
            sessionToken: req.headers.authorization?.split(' ')[1],
            metadata: {
              method: req.method,
              path: req.path,
              params: req.params,
              query: req.query
            }
          });
        }
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Log login activity
 * Call this explicitly in auth controller after successful verification
 */
async function logLogin(userData, req) {
  try {
    await logActivity({
      userId: userData.id,
      username: userData.username,
      name: userData.name,
      role: userData.role,
      usertype: userData.usertype,
      activityType: 'login',
      description: 'Logged in successfully',
      ipAddress: getIpAddress(req),
      userAgent: req.headers['user-agent'],
      metadata: {
        loginTime: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log login:', error);
  }
}

/**
 * Log logout activity
 */
async function logLogout(req) {
  try {
    const userInfo = getUserInfo(req);
    if (userInfo.userId) {
      await logActivity({
        ...userInfo,
        activityType: 'logout',
        description: 'Logged out',
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'],
        metadata: {
          logoutTime: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Failed to log logout:', error);
  }
}

module.exports = {
  activityLogger,
  logLogin,
  logLogout,
  logActivity: async (userInfo, activityType, description, metadata = {}) => {
    await logActivity({
      ...userInfo,
      activityType,
      description,
      metadata
    });
  }
};