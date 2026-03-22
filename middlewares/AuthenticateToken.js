const jwt = require('jsonwebtoken');
const { STATUS_CODES, JWT } = require('../utils/constants');

const AuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
};

const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'User role not found'
      });
    }
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: `Access denied.`
      });
    }
    
    next();
  };
};

module.exports = { AuthenticateToken, verifyRole };