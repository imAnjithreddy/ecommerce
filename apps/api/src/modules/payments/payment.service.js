const Payment = require('./model');
const Order = require('../orders/model');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@dtabs/shared');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');
const { logger } = require('../../core/logger/logger');
const mockProvider = require('./providers/mock.provider');
const stripeProvider = require('./providers/stripe.provider');
const dodoProvider = require('./providers/dodo.provider');

class PaymentService {
  constructor() {
    this.providers = {
      mock: mockProvider,
      stripe: stripeProvider,
      dodo: dodoProvider
    };
  }

  getProvider(providerName = 'mock') {
    const provider = this.providers[providerName.toLowerCase()];
    if (!provider) {
      throw new BadRequestError(`Unsupported payment provider: ${providerName}`);
    }
    return provider;
  }

  async initiatePayment({ tenantId, orderId, providerName = 'mock', idempotencyKey = null }) {
    const order = await Order.findOne({ _id: orderId, tenantId });
    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new BadRequestError('Order is already paid');
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existingPayment = await Payment.findOne({ tenantId, idempotencyKey });
      if (existingPayment) {
        return existingPayment;
      }
    }

    const provider = this.getProvider(providerName);
    const intentResult = await provider.createPaymentIntent({
      orderId: order._id.toString(),
      amount: order.grandTotal,
      currency: order.currency,
      tenantId,
      metadata: { orderId: order._id.toString(), tenantId }
    });

    const payment = await Payment.create({
      tenantId,
      orderId: order._id,
      provider: providerName,
      providerTransactionId: intentResult.providerTransactionId,
      idempotencyKey,
      amount: order.grandTotal,
      currency: order.currency,
      status: PAYMENT_STATUS.PENDING,
      metadata: { ...intentResult }
    });

    return {
      payment,
      ...intentResult
    };
  }

  async processWebhook({ providerName, payload, signature }) {
    const provider = this.getProvider(providerName);
    const isValid = provider.verifyWebhookSignature({ payload, signature });
    if (!isValid) {
      logger.warn('Invalid webhook signature received', { providerName });
      throw new BadRequestError('Invalid webhook signature');
    }

    const event = provider.parseWebhookEvent(payload);
    logger.info('Processing verified webhook event', { providerName, event });

    if (!event.orderId || !event.tenantId) {
      return { received: true, ignored: true, reason: 'Missing orderId or tenantId' };
    }

    const order = await Order.findOne({ _id: event.orderId, tenantId: event.tenantId });
    if (!order) {
      throw new NotFoundError('Order');
    }

    if (event.status === 'paid' && order.paymentStatus !== PAYMENT_STATUS.PAID) {
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.status = ORDER_STATUS.CONFIRMED;
      order.paymentReference = event.providerTransactionId;
      await order.save();

      await Payment.findOneAndUpdate(
        { tenantId: event.tenantId, orderId: order._id },
        {
          status: PAYMENT_STATUS.PAID,
          providerTransactionId: event.providerTransactionId
        }
      );
      logger.info('Order successfully marked as PAID via verified webhook', {
        orderId: order._id,
        tenantId: event.tenantId
      });
    }

    return { received: true, success: true };
  }

  async processRefund({ tenantId, orderId, amount, reason }) {
    const order = await Order.findOne({ _id: orderId, tenantId });
    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
      throw new BadRequestError('Cannot refund an unpaid order');
    }

    const payment = await Payment.findOne({ tenantId, orderId: order._id });
    if (!payment) {
      throw new NotFoundError('Payment record');
    }

    const refundAmount = amount || order.grandTotal;
    const provider = this.getProvider(payment.provider);

    const refundResult = await provider.processRefund({
      providerTransactionId: payment.providerTransactionId,
      amount: refundAmount,
      reason
    });

    payment.refunds.push({
      refundId: refundResult.refundId,
      amount: refundAmount,
      reason,
      createdAt: new Date()
    });

    if (refundAmount >= order.grandTotal) {
      payment.status = PAYMENT_STATUS.REFUNDED;
      order.paymentStatus = PAYMENT_STATUS.REFUNDED;
      order.status = ORDER_STATUS.REFUNDED;
    } else {
      payment.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
      order.paymentStatus = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    }

    await payment.save();
    await order.save();

    return { success: true, payment, order };
  }
}

module.exports = new PaymentService();
