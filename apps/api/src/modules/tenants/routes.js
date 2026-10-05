const express = require('express');
const router = express.Router();
const tenantController = require('./controller');
const { authenticate } = require('../../middleware/auth.middleware');

// Public tenant resolution
router.get('/resolve', tenantController.resolveDomain);

// Authenticated user store operations
router.post('/', authenticate, tenantController.createStore);
router.get('/my-stores', authenticate, tenantController.getMyStores);

module.exports = router;
