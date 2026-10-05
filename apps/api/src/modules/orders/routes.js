const express = require('express');
const router = express.Router();
const Order = require('./model');
const ApiResponse = require('../../core/response/ApiResponse');
const { getPaginationParams } = require('../../core/pagination/pagination');
const { NotFoundError } = require('../../core/errors/AppError');
const { authenticate } = require('../../middleware/auth.middleware');
const { resolveTenant } = require('../../middleware/tenant.middleware');

// Protect all customer order routes
router.use(authenticate);
router.use(resolveTenant({ required: true }));

// Get my orders
router.get('/my-orders', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const query = { tenantId: req.tenantId, customerId: req.user._id };

    const [orders, totalItems] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    return ApiResponse.paginated(res, orders, { page, limit, totalItems });
  } catch (error) {
    next(error);
  }
});

// Get a specific order of mine
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
      customerId: req.user._id
    }).lean();

    if (!order) {
      throw new NotFoundError('Order');
    }

    return ApiResponse.success(res, order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
