
/**
 * Authorization middleware - checks if user has required role(s)
 * Usage: authorize('SuperAdmin', 'Faculty')
 */
exports.authorize = (...allowedRoles) => {
    return (req, res, next) => {
      // Check if user is authenticated (should be set by verifyToken middleware)
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required. Please login first.' 
        });
      }
  
      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        console.log(`🚫 Access denied for ${req.user.username} (${req.user.role}) to ${req.originalUrl}`);
        return res.status(403).json({ 
          success: false,
          error: 'Access denied. You do not have permission to perform this action.',
          requiredRole: allowedRoles,
          yourRole: req.user.role
        });
      }
  
      console.log(`✅ Access granted for ${req.user.username} (${req.user.role}) to ${req.originalUrl}`);
      next();
    };
  };
  
  /**
   * Check if user is SuperAdmin
   */
  exports.isSuperAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
  
    if (req.user.role !== 'SuperAdmin') {
      console.log(`🚫 SuperAdmin access denied for ${req.user.username} (${req.user.role})`);
      return res.status(403).json({ 
        success: false,
        error: 'SuperAdmin access required' 
      });
    }
  
    next();
  };
  
  /**
   * Check if user is faculty (internal or external, including MBA)
   */
  exports.isFaculty = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!['Faculty', 'MBAFaculty'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Faculty access required' 
      });
    }

    next();
  };
  
  /**
   * Check if user is verifier (including MBA)
   */
  exports.isVerifier = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!['Verifier', 'MBAVerifier'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Verifier access required' 
      });
    }

    next();
  };
  
  /**
   * Check if user owns the resource or is SuperAdmin
   * Usage: For routes where users can only access their own data
   */
  exports.isOwnerOrSuperAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
  
    // Get resource owner ID from params or body
    const resourceOwnerId = req.params.userId || req.body.userId;
  
    // Allow if user is SuperAdmin or owns the resource
    if (req.user.role === 'SuperAdmin' || req.user.id === resourceOwnerId) {
      next();
    } else {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. You can only access your own resources.' 
      });
    }
  };
  
  /**
   * Check if user is SuperAdmin or Faculty (including MBA)
   * Common pattern for routes that need elevated access
   */
  exports.isSuperAdminOrFaculty = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!['SuperAdmin', 'Faculty', 'MBAFaculty'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'SuperAdmin or Faculty access required' 
      });
    }

    next();
  };