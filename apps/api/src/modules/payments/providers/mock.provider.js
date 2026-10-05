const crypto = require('crypto');

class MockPaymentProvider {
  constructor() {
    this.name = 'mock';
  }

  async createPaymentIntent({ orderId, amount, currency, tenantId, metadata }) {
    const transactionId = `mock_pi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      providerTransactionId: transactionId,
      clientSecret: `mock_sec_${transactionId}`,
      amount,
      currency,
      status: 'pending'
    };
  }

  async verifyPayment(providerTransactionId) {
    // In mock provider, if transaction ID starts with mock_pi, consider paid
    return {
      success: true,
      providerTransactionId,
      status: 'paid',
      amountReceived: null
    };
  }

  async processRefund({ providerTransactionId, amount, reason }) {
    const refundId = `mock_rf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      refundId,
      amount,
      status: 'refunded'
    };
  }

  verifyWebhookSignature({ payload, signature, secret }) {
    // Mock signature check
    return Boolean(signature && signature.length > 5);
  }

  parseWebhookEvent(body) {
    return {
      eventType: body.type || 'payment_intent.succeeded',
      providerTransactionId: body.data ? body.data.id : null,
      orderId: body.data && body.data.metadata ? body.data.metadata.orderId : null,
      tenantId: body.data && body.data.metadata ? body.data.metadata.tenantId : null,
      status: body.data && body.data.status === 'succeeded' ? 'paid' : 'failed'
    };
  }
}

module.exports = new MockPaymentProvider();
