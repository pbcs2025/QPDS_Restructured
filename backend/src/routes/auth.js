// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { 
  authorize, 
  isSuperAdmin, 
  isFaculty, 
  isVerifier,
  isSuperAdminOrFaculty 
} = require('../middleware/authorize');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * Register new user
 * Access: Public (consider restricting this to SuperAdmin only)
 */
router.post('/register', ctrl.register);

/**
 * Login - send verification code
 * Access: Public
 */
router.post('/login', ctrl.login);

/**
 * Super Admin Login - direct authentication
 * Access: Public
 */
router.post('/superadmin/login', ctrl.superAdminLogin);

/**
 * Verify code and get JWT token
 * Access: Public (secured by verification code)
 */
router.post('/verify', ctrl.verify);

/**
 * Forgot password
 * Access: Public
 */
router.post('/forgot-password', ctrl.forgotPassword);

/**
 * Reset password
 * Access: Authenticated users only
 */
router.post('/reset-password', verifyToken, ctrl.resetPassword);

/**
 * Logout - log user activity
 * Access: Authenticated users only
 */
router.post('/logout', verifyToken, ctrl.logout);

// ============================================
// SUPERADMIN ONLY ROUTES
// ============================================

/**
 * Register new faculty
 * Access: SuperAdmin only
 */
router.post('/registerFaculty', 
  verifyToken,
  isSuperAdmin,
  ctrl.registerFaculty
);

/**
 * Get all internal users
 * Access: SuperAdmin only
 */
router.get('/users', 
  verifyToken,
  isSuperAdmin,
  ctrl.getInternalUsers
);

/**
 * Get all external users
 * Access: SuperAdmin only
 */
router.get('/externalusers', 
  verifyToken,
  isSuperAdmin,
  ctrl.getExternalUsers
);

// ============================================
// SUPERADMIN & FACULTY & VERIFIER ROUTES
// ============================================

/**
 * Get all colleges
 * Access: SuperAdmin, Faculty, and Verifier
 */
router.get('/colleges', 
  verifyToken,
  authorize('SuperAdmin', 'Faculty', 'Verifier'),
  ctrl.getColleges
);

/**
 * Get all departments
 * Access: SuperAdmin, Faculty, and Verifier
 */
router.get('/departments', 
  verifyToken,
  authorize('SuperAdmin', 'Faculty', 'Verifier'),
  ctrl.getDepartments
);

module.exports = router;