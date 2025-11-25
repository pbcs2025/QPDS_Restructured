// backend/src/models/SessionActivity.js
const mongoose = require('mongoose');

const sessionActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['SuperAdmin', 'Faculty', 'Verifier', 'Admin', 'MBAFaculty', 'MBAVerifier'],
    index: true
  },
  usertype: {
    type: String,
    enum: ['internal', 'external', 'admin'],
    default: 'internal'
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'paper_created',
      'paper_updated',
      'paper_approved',
      'paper_rejected',
      'paper_corrected',
      'profile_updated',
      'password_changed',
      'user_created',
      'user_deleted',
      'department_created',
      'department_updated',
      'subject_created',
      'subject_updated'
    ],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  sessionToken: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // Auto-delete after 30 days (30 * 24 * 60 * 60)
  }
}, {
  timestamps: true
});

// Index for efficient queries on recent activities by role
sessionActivitySchema.index({ role: 1, timestamp: -1 });
sessionActivitySchema.index({ userId: 1, timestamp: -1 });
sessionActivitySchema.index({ activityType: 1, timestamp: -1 });

// Static method to get recent activities by role
sessionActivitySchema.statics.getRecentByRole = async function(role, hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    role,
    timestamp: { $gte: cutoffTime }
  })
  .sort({ timestamp: -1 })
  .limit(50)
  .lean();
};

// Static method to get all recent activities
sessionActivitySchema.statics.getRecentAll = async function(hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    timestamp: { $gte: cutoffTime }
  })
  .sort({ timestamp: -1 })
  .limit(100)
  .lean();
};

// Static method to log activity
sessionActivitySchema.statics.logActivity = async function(data) {
  try {
    const activity = new this(data);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

const SessionActivity = mongoose.model('SessionActivity', sessionActivitySchema);

module.exports = SessionActivity;