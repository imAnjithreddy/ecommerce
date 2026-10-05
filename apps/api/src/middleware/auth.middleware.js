const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const User = require('../modules/auth/user.model');
const { UnauthorizedError, ForbiddenError } = require('../core/errors/AppError');

async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.dtabs_token) {
      token = req.cookies.dtabs_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`User account is ${user.status}`);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError(error.message));
    }
    next(error);
  }
}

// Optional authentication - populates req.user if valid token present, doesn't throw if absent
async function optionalAuthenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.dtabs_token) {
      token = req.cookies.dtabs_token;
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.userId).lean();
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    // Ignore invalid tokens for optional auth
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate
};
