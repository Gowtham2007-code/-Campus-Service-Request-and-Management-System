const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── protect ─────────────────────────────────────────────────────────────────
// Verifies the JWT from the Authorization header.
// Attaches the authenticated user object to req.user.
// Usage: router.get('/route', protect, handler)

const protect = async (req, res, next) => {
  try {
    // 1. Check that Authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // 2. Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token missing.',
      });
    }

    // 3. Verify the token using the JWT secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Distinguish between expired and invalid tokens
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
      });
    }

    // 4. Find the user from the decoded token payload
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // 5. Attach user to req — available in all downstream handlers
    req.user = user;

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};

// ─── authorize ────────────────────────────────────────────────────────────────
// Role-based access control. Must be used AFTER protect.
// Usage: router.get('/route', protect, authorize('admin'), handler)
// Usage: router.get('/route', protect, authorize('admin', 'student'), handler)

const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the protect middleware
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
