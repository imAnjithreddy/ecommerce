const Order = require('./model');
const Product = require('../products/model');
const Cart = require('../cart/model');
const Customer = require('../customers/model');
const Coupon = require('../coupons/model');
const inventoryService = require('../inventory/service');
const { ORDER_STATUS, ALLOWED_ORDER_TRANSITIONS } = require('@dtabs/shared');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');
const { logger } = require('../../core/logger/logger');

class OrderService {
  /**
   * Creates an order from a tenant's cart with immutable historical line-item snapshots
   */
  async createFromCart({
    tenantId,
    cartId,
    customerId,
    customerDetails,
    shippingAddress,
    billingAddress,
    paymentMethod = 'mock'
  }) {
    const cart = await Cart.findOne({ _id: cartId, tenantId });
    if (!cart || !cart.items.length) {
      throw new BadRequestError('Cannot create order from an empty or nonexistent cart');
    }

    // Generate unique order number (e.g. ORD-1726000000-1234)
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const snapshotItems = [];
    let calculatedSubtotal = 0;

    // Validate each item against live database and snapshot historical data
    for (const item of cart.items) {
      const product = await Product.findOne({
        _id: item.productId,
        tenantId,
        isDeleted: false
      });

      if (!product) {
        throw new NotFoundError(`Product '${item.name}'`);
      }

      let unitPrice = product.price;
      let sku = product.sku;
      let variantTitle = '';
      let variantOptions = {};
      let image = product.images && product.images[0] ? product.images[0].url : '';

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          throw new NotFoundError(`Variant for product '${product.name}'`);
        }
        unitPrice = variant.price;
        sku = variant.sku;
        variantTitle = variant.title || '';
        variantOptions = variant.options || {};
        if (variant.image) image = variant.image;
      }

      const itemTotal = unitPrice * item.quantity;
      calculatedSubtotal += itemTotal;

      snapshotItems.push({
        productId: product._id,
        variantId: item.variantId || null,
        name: product.name,
        sku,
        price: unitPrice,
        quantity: item.quantity,
        variantTitle,
        variantOptions,
        image,
        discount: 0,
        tax: 0,
        total: itemTotal
      });
    }

    // Apply Coupon discount if present in cart
    let discountTotal = 0;
    let appliedCoupon = null;

    if (cart.appliedCouponCode) {
      const coupon = await Coupon.findOne({
        tenantId,
        code: cart.appliedCouponCode,
        isActive: true
      });

      if (coupon) {
        if (coupon.type === 'percentage') {
          discountTotal = (calculatedSubtotal * coupon.value) / 100;
        } else {
          discountTotal = Math.min(coupon.value, calculatedSubtotal);
        }
        appliedCoupon = {
          code: coupon.code,
          discountAmount: discountTotal
        };
        // Increment coupon usage
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const taxTotal = Math.round(calculatedSubtotal * 0.05 * 100) / 100; // 5% default estimated tax
    const shippingTotal = calculatedSubtotal > 100 ? 0 : 10; // Free shipping over $100
    const grandTotal = Math.max(0, calculatedSubtotal - discountTotal + taxTotal + shippingTotal);

    // Create or update Customer profile
    let resolvedCustomerId = customerId || null;
    if (customerDetails && customerDetails.email) {
      let customer = await Customer.findOne({ tenantId, email: customerDetails.email.toLowerCase() });
      if (!customer) {
        customer = await Customer.create({
          tenantId,
          userId: customerId || null,
          email: customerDetails.email.toLowerCase(),
          firstName: customerDetails.firstName,
          lastName: customerDetails.lastName,
          phone: customerDetails.phone || '',
          addresses: [shippingAddress]
        });
      }
      customer.totalOrdersCount += 1;
      customer.totalSpent += grandTotal;
      await customer.save();
      resolvedCustomerId = customer._id;
    }

    // Atomically reserve/deduct stock
    await inventoryService.deductForOrder({
      tenantId,
      items: snapshotItems,
      orderId: orderNumber
    });

    const order = await Order.create({
      tenantId,
      orderNumber,
      customerId: resolvedCustomerId,
      customerDetails,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      items: snapshotItems,
      subtotal: calculatedSubtotal,
      discountTotal,
      taxTotal,
      shippingTotal,
      grandTotal,
      paymentMethod,
      appliedCoupon,
      status: ORDER_STATUS.PENDING
    });

    // Clear cart
    cart.items = [];
    cart.appliedCouponCode = null;
    cart.discountAmount = 0;
    await cart.save();

    logger.info('Order created successfully with frozen product snapshots', {
      orderId: order._id,
      orderNumber,
      tenantId,
      grandTotal
    });

    return order;
  }

  /**
   * Order state machine transition validator and updater
   */
  async updateStatus({ tenantId, orderId, newStatus, actorId = null }) {
    const order = await Order.findOne({ _id: orderId, tenantId });
    if (!order) {
      throw new NotFoundError('Order');
    }

    const currentStatus = order.status;
    const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
      );
    }

    order.status = newStatus;

    // If order was cancelled, restore inventory
    if (newStatus === ORDER_STATUS.CANCELLED) {
      await inventoryService.restoreForOrder({
        tenantId,
        items: order.items,
        orderId: order._id,
        actorId
      });
    }

    await order.save();
    logger.info('Order status transitioned', { orderId: order._id, currentStatus, newStatus });

    return order;
  }
}

module.exports = new OrderService();
