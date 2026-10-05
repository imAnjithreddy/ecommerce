const Coupon = require('./model');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');

class CouponService {
  async validateCoupon({ code, tenantId, orderValue }) {
    if (!code) {
      throw new BadRequestError('Coupon code is required');
    }

    const coupon = await Coupon.findOne({ tenantId, code: code.toUpperCase().trim() });

    if (!coupon) {
      throw new NotFoundError('Coupon');
    }

    if (!coupon.isActive) {
      throw new BadRequestError('Coupon is not active');
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      throw new BadRequestError('Coupon is not yet valid');
    }

    if (coupon.endDate && now > coupon.endDate) {
      throw new BadRequestError('Coupon has expired');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    if (orderValue !== undefined && coupon.minimumOrderValue > orderValue) {
      throw new BadRequestError(`Minimum order value of ${coupon.minimumOrderValue} required for this coupon`);
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (orderValue !== undefined) {
       if (coupon.type === 'percentage') {
           discountAmount = (orderValue * coupon.value) / 100;
       } else if (coupon.type === 'fixed') {
           discountAmount = coupon.value;
       }

       // Ensure discount doesn't exceed order value
       if (discountAmount > orderValue) {
           discountAmount = orderValue;
       }
    }

    return {
      coupon,
      isValid: true,
      discountAmount
    };
  }
}

module.exports = new CouponService();
