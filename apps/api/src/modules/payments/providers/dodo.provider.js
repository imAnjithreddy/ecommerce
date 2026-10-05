const crypto = require('crypto');
const env = require('../../../config/environment');
const { logger } = require('../../../core/logger/logger');

class DodoProvider {
  constructor() {
    this.name = 'dodo';
    this.apiKey = env.DODO_PAYMENTS_API_KEY;
    this.webhookSecret = env.DODO_PAYMENTS_WEBHOOK_SECRET;
  }

  async createPaymentIntent({ orderId, amount, currency, tenantId, metadata }) {
    logger.info('Creating Dodo Payments checkout session', { orderId, amount, currency, tenantId });
    const transactionId = `dodo_pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      providerTransactionId: transactionId,
      checkoutUrl: `https://checkout.dodopayments.com/pay/${transactionId}`,
      amount,
      currency,
      status: 'pending'
    };
  }

  async verifyPayment(providerTransactionId) {
    logger.info('Verifying Dodo payment', { providerTransactionId });
    return {
      success: true,
      providerTransactionId,
      status: 'paid'
    };
  }

  async processRefund({ providerTransactionId, amount, reason }) {
    logger.info('Processing Dodo refund', { providerTransactionId, amount, reason });
    return {
      success: true,
      refundId: `dodo_rf_${Date.now()}`,
      amount,
      status: 'refunded'
    };
  }

  verifyWebhookSignature({ payload, signature, secret }) {
    const signingSecret = secret || this.webhookSecret;
    if (!signature || !signingSecret) return false;
    try {
      const expected = crypto
        .createHmac('sha256', signingSecret)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch (err) {
      return false;
    }
  }

  parseWebhookEvent(body) {
    return {
      eventType: body.event || body.type || '',
      providerTransactionId: body.payment_id || (body.data ? body.data.id : null),
      orderId: body.metadata ? body.metadata.orderId : null,
      tenantId: body.metadata ? body.metadata.tenantId : null,
      status: (body.event === 'payment.succeeded' || body.type === 'payment.succeeded') ? 'paid' : 'failed'
    };
  }
}

module.exports = new DodoProvider();
