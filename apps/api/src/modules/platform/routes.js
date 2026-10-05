const express = require('express');
const router = express.Router();
const platformController = require('./controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../../middleware/role.middleware');

// Protect all platform routes: must be authenticated platform administrator
router.use(authenticate);
router.use(requirePlatformAdmin);

router.get('/stats', platformController.getPlatformStats);
router.get('/tenants', platformController.listTenants);
router.post('/tenants', platformController.onboardTenant);
router.patch('/tenants/:id', platformController.updateTenant);
router.get('/users', platformController.listUsers);

module.exports = router;
