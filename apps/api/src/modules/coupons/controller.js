const Coupon = require('./model');
const couponService = require('./service');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');

class CouponController {
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

  async applyCoupon(req, res, next) {
    try {
      const { code, orderValue } = req.body;
      const tenantId = req.tenantId;

      if (!code) {
        throw new BadRequestError('Coupon code is required');
      }

      if (orderValue === undefined) {
          throw new BadRequestError('orderValue is required to apply a coupon');
      }

      const result = await couponService.validateCoupon({
        code,
        tenantId,
        orderValue: Number(orderValue)
      });

      return ApiResponse.success(res, result, 'Coupon applied successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CouponController();
