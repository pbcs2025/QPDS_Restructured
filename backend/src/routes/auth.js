
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

// ============================================
// SUPERADMIN ONLY ROUTES
// ============================================

/**
 * Register new faculty
 * Access: SuperAdmin only
 * Reason: Only SuperAdmin should be able to create faculty accounts
 */
router.post('/registerFaculty', 
  verifyToken,           // Must be authenticated
  isSuperAdmin,          // Must be SuperAdmin role
  ctrl.registerFaculty
);

/**
 * Get all internal users
 * Access: SuperAdmin only
 * Reason: Sensitive user data - full system access
 */
router.get('/users', 
  verifyToken,
  isSuperAdmin,
  ctrl.getInternalUsers
);

/**
 * Get all external users
 * Access: SuperAdmin only
 * Reason: Sensitive user data - full system access
 */
router.get('/externalusers', 
  verifyToken,
  isSuperAdmin,
  ctrl.getExternalUsers
);

// ============================================
// SUPERADMIN & FACULTY ROUTES
// ============================================

/**
 * Get all colleges
 * Access: SuperAdmin and Faculty
 * Reason: Both need to see college list for their work
 */
router.get('/colleges', 
  verifyToken,
  authorize('SuperAdmin', 'Faculty','Verifier'),
  ctrl.getColleges
);

/**
 * Get all departments
 * Access: SuperAdmin and Faculty and Verifier
 * Reason: all may have to see department list for their work
 */
router.get('/departments', 
  verifyToken,
  authorize('SuperAdmin', 'Faculty','Verifier'),
  ctrl.getDepartments
);

// ============================================
// EXAMPLE: Additional Protected Routes
// ============================================

/*
// SuperAdmin, Faculty, and Verifier can access
router.get('/some-shared-route', 
  verifyToken,
  authorize('SuperAdmin', 'Faculty', 'Verifier'),
  ctrl.someFunction
);

// Only Faculty can access
router.post('/faculty-only-route', 
  verifyToken,
  isFaculty,
  ctrl.facultyFunction
);

// Only Verifier can access
router.post('/verify-submission', 
  verifyToken,
  isVerifier,
  ctrl.verifySubmission
);

// Any authenticated user
router.get('/profile', 
  verifyToken,
  ctrl.getProfile
);

// Owner or SuperAdmin (for editing personal data)
router.put('/users/:userId', 
  verifyToken,
  isOwnerOrSuperAdmin,
  ctrl.updateUser
);
*/

module.exports = router;