// backend/src/controllers/sessionController.js
const SessionActivity = require('../models/SessionActivity');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * Get grouped activities by role
 * GET /api/sessions/activities/grouped
 * Query params: hours (default: 24)
 */
exports.getGroupedActivities = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    
    // Fetch activities for all Faculty and Verifier roles (including MBA)
    const [facultyActivities, verifierActivities, mbaFacultyActivities, mbaVerifierActivities] = await Promise.all([
      SessionActivity.getRecentByRole('Faculty', hours),
      SessionActivity.getRecentByRole('Verifier', hours),
      SessionActivity.getRecentByRole('MBAFaculty', hours),
      SessionActivity.getRecentByRole('MBAVerifier', hours)
    ]);

    // Combine all activities into a single array with "From" field
    const allActivities = [
      ...(facultyActivities || []).map(act => ({ ...act, from: 'B.Tech/M.Tech' })),
      ...(verifierActivities || []).map(act => ({ ...act, from: 'B.Tech/M.Tech' })),
      ...(mbaFacultyActivities || []).map(act => ({ ...act, from: 'MBA' })),
      ...(mbaVerifierActivities || []).map(act => ({ ...act, from: 'MBA' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        all: allActivities,
        faculty: facultyActivities || [],
        verifier: verifierActivities || [],
        mbaFaculty: mbaFacultyActivities || [],
        mbaVerifier: mbaVerifierActivities || []
      }
    });
  } catch (error) {
    console.error('Error fetching grouped activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
};

/**
 * Get all recent activities
 * GET /api/sessions/activities
 * Query params: hours (default: 24), role (optional)
 */
exports.getActivities = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const role = req.query.role;

    let activities;
    if (role) {
      activities = await SessionActivity.getRecentByRole(role, hours);
    } else {
      activities = await SessionActivity.getRecentAll(hours);
    }

    res.json({
      success: true,
      data: activities || []
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
};

/**
 * Get activities by user ID
 * GET /api/sessions/activities/user/:userId
 */
exports.getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const activities = await SessionActivity.find({
      userId,
      timestamp: { $gte: cutoffTime }
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: activities || []
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activities',
      error: error.message
    });
  }
};


