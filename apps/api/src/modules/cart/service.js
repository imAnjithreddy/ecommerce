const Cart = require('./model');
const Product = require('../products/model');
const Coupon = require('../coupons/model');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');

class CartService {
  async getOrCreateCart({ tenantId, sessionId, customerId }) {
    let query = { tenantId };
    if (customerId) {
      query.customerId = customerId;
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else {
      throw new BadRequestError('Either customerId or sessionId must be provided');
    }

    let cart = await Cart.findOne(query);
    if (!cart) {
      cart = await Cart.create({
        tenantId,
        sessionId: customerId ? null : sessionId,
        customerId: customerId || null,
        items: []
      });
    }
    return cart;
  }

  async addItem({ tenantId, sessionId, customerId, productId, variantId, quantity }) {
    if (!quantity || quantity < 1) {
      throw new BadRequestError('Quantity must be at least 1');
    }

    // Always fetch live product from DB to ensure price and inventory integrity
    const product = await Product.findOne({ _id: productId, tenantId, status: 'active', isDeleted: false });
    if (!product) {
      throw new NotFoundError('Product');
    }

    let sku = product.sku;
    let unitPrice = product.price;
    let variantTitle = '';
    let image = product.images && product.images[0] ? product.images[0].url : '';

    if (variantId) {
      const variant = product.variants.id(variantId);
      if (!variant) {
        throw new NotFoundError('Product variant');
      }
      sku = variant.sku;
      unitPrice = variant.price;
      variantTitle = variant.title || '';
      if (variant.image) image = variant.image;
    }

    const cart = await this.getOrCreateCart({ tenantId, sessionId, customerId });
    const existingIndex = cart.items.findIndex(
      item => item.productId.toString() === productId.toString() &&
              (variantId ? item.variantId?.toString() === variantId.toString() : !item.variantId)
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      // Refresh current price and name
      cart.items[existingIndex].unitPrice = unitPrice;
      cart.items[existingIndex].name = product.name;
    } else {
      cart.items.push({
        productId: product._id,
        variantId: variantId || null,
        sku,
        name: product.name,
        variantTitle,
        unitPrice,
        quantity,
        image
      });
    }

    await cart.save();
    return cart;
  }

  async updateItemQuantity({ tenantId, sessionId, customerId, itemId, quantity }) {
    const cart = await this.getOrCreateCart({ tenantId, sessionId, customerId });
    const item = cart.items.id(itemId);

    if (!item) {
      throw new NotFoundError('Cart item');
    }

    if (quantity <= 0) {
      cart.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    return cart;
  }

  async removeItem({ tenantId, sessionId, customerId, itemId }) {
    const cart = await this.getOrCreateCart({ tenantId, sessionId, customerId });
    cart.items.pull(itemId);
    await cart.save();
    return cart;
  }

  async applyCoupon({ tenantId, sessionId, customerId, code }) {
    const cart = await this.getOrCreateCart({ tenantId, sessionId, customerId });
    if (!cart.items.length) {
      throw new BadRequestError('Cart is empty');
    }

    const coupon = await Coupon.findOne({
      tenantId,
      code: code.toUpperCase().trim(),
      isActive: true
    });

    if (!coupon) {
      throw new BadRequestError('Invalid or inactive coupon code');
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestError('Coupon is not yet active');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestError('Coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    const subtotal = cart.items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    if (coupon.minimumOrderValue && subtotal < coupon.minimumOrderValue) {
      throw new BadRequestError(`Coupon requires minimum order value of $${coupon.minimumOrderValue}`);
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    cart.appliedCouponCode = coupon.code;
    cart.discountAmount = discount;
    await cart.save();

    return { cart, coupon, discount };
  }

  async mergeGuestCart({ tenantId, sessionId, customerId }) {
    if (!sessionId || !customerId) return null;
    const guestCart = await Cart.findOne({ tenantId, sessionId });
    if (!guestCart || !guestCart.items.length) return null;

    const customerCart = await this.getOrCreateCart({ tenantId, customerId });

    for (const item of guestCart.items) {
      await this.addItem({
        tenantId,
        customerId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      });
    }

    await Cart.deleteOne({ _id: guestCart._id });
    return customerCart;
  }
}

module.exports = new CartService();
