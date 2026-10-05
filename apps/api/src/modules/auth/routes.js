const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { rateLimiter } = require('../../middleware/rateLimit.middleware');

const authRateLimiter = rateLimiter({ windowSeconds: 60, maxRequests: 20, keyPrefix: 'rl_auth' });

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
