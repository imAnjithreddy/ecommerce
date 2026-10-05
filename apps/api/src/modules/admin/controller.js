const Order = require('../orders/model');
const Product = require('../products/model');
const Customer = require('../customers/model');
const Inventory = require('../inventory/model');
const Coupon = require('../coupons/model');
const Tenant = require('../tenants/model');
const AuditLog = require('../audit/audit.model');
const orderService = require('../orders/service');
const inventoryService = require('../inventory/service');
const ApiResponse = require('../../core/response/ApiResponse');
const { getPaginationParams } = require('../../core/pagination/pagination');
const { NotFoundError, BadRequestError } = require('../../core/errors/AppError');
const { AUDIT_ACTIONS, INVENTORY_TRANSACTION_TYPES } = require('@dtabs/shared');

class AdminController {
  /**
   * Executive Dashboard Metrics & Summaries
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [
        totalOrders,
        totalCustomers,
        totalProducts,
        salesAgg,
        recentOrders,
        lowStockInventory
      ] = await Promise.all([
        Order.countDocuments({ tenantId }),
        Customer.countDocuments({ tenantId }),
        Product.countDocuments({ tenantId, isDeleted: false }),
        Order.aggregate([
          { $match: { tenantId: req.tenant._id, status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$grandTotal' },
              avgOrderValue: { $avg: '$grandTotal' }
            }
          }
        ]),
        Order.find({ tenantId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Inventory.find({
          tenantId,
          $expr: { $lte: ['$availableQuantity', '$lowStockThreshold'] }
        })
          .populate('productId', 'name slug')
          .limit(10)
          .lean()
      ]);

      const totalRevenue = salesAgg.length > 0 ? salesAgg[0].totalRevenue : 0;
      const avgOrderValue = salesAgg.length > 0 ? salesAgg[0].avgOrderValue : 0;

      return ApiResponse.success(res, {
        overview: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOrders,
          totalCustomers,
          totalProducts,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100
        },
        recentOrders,
        lowStockProducts: lowStockInventory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Order Management
   */
  async listOrders(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const { status, search } = req.query;

      const query = { tenantId: req.tenantId };
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customerDetails.email': { $regex: search, $options: 'i' } },
          { 'customerDetails.lastName': { $regex: search, $options: 'i' } }
        ];
      }

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
  }

  async getOrderById(req, res, next) {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      }).lean();

      if (!order) {
        throw new NotFoundError('Order');
      }

      return ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!status) {
        throw new BadRequestError('Status is required');
      }

      const order = await orderService.updateStatus({
        tenantId: req.tenantId,
        orderId: req.params.id,
        newStatus: status,
        actorId: req.user._id
      });

      await AuditLog.create({
        tenantId: req.tenantId,
        actorId: req.user._id,
        action: AUDIT_ACTIONS.ORDER_UPDATED,
        resource: 'Order',
        resourceId: order._id.toString(),
        metadata: { newStatus: status }
      });

      return ApiResponse.success(res, order, 'Order status updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inventory Management
   */
  async listInventory(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const query = { tenantId: req.tenantId };

      const [inventory, totalItems] = await Promise.all([
        Inventory.find(query)
          .populate('productId', 'name slug images')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Inventory.countDocuments(query)
      ]);

      return ApiResponse.paginated(res, inventory, { page, limit, totalItems });
    } catch (error) {
      next(error);
    }
  }

  async adjustInventory(req, res, next) {
    try {
      const { sku, quantity, note = '' } = req.body;
      if (!sku || quantity === undefined) {
        throw new BadRequestError('SKU and adjustment quantity are required');
      }

      const result = await inventoryService.adjustStock({
        tenantId: req.tenantId,
        sku,
        quantity: Number(quantity),
        type: INVENTORY_TRANSACTION_TYPES.ADJUSTMENT,
        note,
        actorId: req.user._id
      });

      return ApiResponse.success(res, result, 'Inventory adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer Management
   */
  async listCustomers(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const { search } = req.query;

      const query = { tenantId: req.tenantId };
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }

      const [customers, totalItems] = await Promise.all([
        Customer.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Customer.countDocuments(query)
      ]);

      return ApiResponse.paginated(res, customers, { page, limit, totalItems });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Coupons Management
   */
  async listCoupons(req, res, next) {
    try {
      const coupons = await Coupon.find({ tenantId: req.tenantId })
        .sort({ createdAt: -1 })
        .lean();
      return ApiResponse.success(res, coupons);
    } catch (error) {
      next(error);
    }
  }

  async createCoupon(req, res, next) {
    try {
      const { code, type, value, minimumOrderValue, endDate, usageLimit } = req.body;
      if (!code || !type || value === undefined) {
        throw new BadRequestError('code, type (percentage/fixed), and value are required');
      }

      const existing = await Coupon.findOne({ tenantId: req.tenantId, code: code.toUpperCase().trim() });
      if (existing) {
        throw new BadRequestError('A coupon with this code already exists');
      }

      const coupon = await Coupon.create({
        tenantId: req.tenantId,
        code: code.toUpperCase().trim(),
        type,
        value: Number(value),
        minimumOrderValue: Number(minimumOrderValue || 0),
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null
      });

      return ApiResponse.created(res, coupon, 'Coupon created successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCoupon(req, res, next) {
    try {
      const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
      if (!coupon) {
        throw new NotFoundError('Coupon');
      }
      return ApiResponse.success(res, null, 'Coupon deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
