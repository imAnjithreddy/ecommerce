const jwt = require('jsonwebtoken');
const User = require('./user.model');
const TenantMember = require('../tenants/member.model');
const env = require('../../config/environment');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError, UnauthorizedError } = require('../../core/errors/AppError');

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password || !firstName || !lastName) {
        throw new BadRequestError('Email, password, firstName, and lastName are required');
      }

      if (password.length < 8) {
        throw new BadRequestError('Password must be at least 8 characters long');
      }

      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        throw new BadRequestError('An account with this email already exists');
      }

      const passwordHash = await User.hashPassword(password);
      const user = await User.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : ''
      });

      const token = generateToken(user);

      res.cookie('dtabs_token', token, {
        httpOnly: true,
        secure: env.IS_PRODUCTION,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return ApiResponse.created(res, {
        user: user.toJSON(),
        token
      }, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Email and password are required');
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (user.status !== 'active') {
        throw new UnauthorizedError(`Account is ${user.status}`);
      }

      const token = generateToken(user);

      // Fetch user's tenant memberships
      const memberships = await TenantMember.find({ userId: user._id, status: 'active' })
        .populate('tenantId', 'name slug status theme domains')
        .lean();

      res.cookie('dtabs_token', token, {
        httpOnly: true,
        secure: env.IS_PRODUCTION,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return ApiResponse.success(res, {
        user: user.toJSON(),
        token,
        memberships
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      res.clearCookie('dtabs_token');
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const memberships = await TenantMember.find({ userId: req.user._id, status: 'active' })
        .populate('tenantId', 'name slug status theme domains settings')
        .lean();

      return ApiResponse.success(res, {
        user: req.user,
        memberships
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
