const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isSuperAdmin } = require('../middleware/authorize');

/**
 * Get grouped activities by role (Faculty and Verifier)
 * GET /api/sessions/activities/grouped
 * Access: SuperAdmin only
 * Query params: hours (default: 24)
 */
router.get('/activities/grouped', 
  verifyToken,
  isSuperAdmin,
  sessionController.getGroupedActivities
);

/**
 * Get all recent activities
 * GET /api/sessions/activities
 * Access: SuperAdmin only
 * Query params: hours (default: 24), role (optional)
 */
router.get('/activities',
  verifyToken,
  isSuperAdmin,
  sessionController.getActivities
);

/**
 * Get activities by user ID
 * GET /api/sessions/activities/user/:userId
 * Access: SuperAdmin only
 */
router.get('/activities/user/:userId',
  verifyToken,
  isSuperAdmin,
  sessionController.getUserActivities
);

module.exports = router;

