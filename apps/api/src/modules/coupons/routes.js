const express = require('express');
const router = express.Router();
const couponController = require('./controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { resolveTenant } = require('../../middleware/tenant.middleware');
const { requireTenantMembership } = require('../../middleware/role.middleware');
const { PERMISSIONS } = require('@dtabs/shared');

// Public storefront routes for coupons
router.post('/apply', resolveTenant({ required: true }), couponController.applyCoupon);

// Admin routes for coupons
const adminRouter = express.Router();
adminRouter.use(authenticate);
adminRouter.use(resolveTenant({ required: true }));
adminRouter.use(requireTenantMembership());

adminRouter.get('/', requireTenantMembership(PERMISSIONS.COUPONS_READ), couponController.listCoupons);
adminRouter.post('/', requireTenantMembership(PERMISSIONS.COUPONS_CREATE), couponController.createCoupon);
adminRouter.delete('/:id', requireTenantMembership(PERMISSIONS.COUPONS_DELETE), couponController.deleteCoupon);

module.exports = router;
module.exports.adminRouter = adminRouter;
