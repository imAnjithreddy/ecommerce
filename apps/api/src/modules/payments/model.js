const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('@dtabs/shared');

const PaymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['stripe', 'dodo', 'mock'],
    required: true
  },
  providerTransactionId: {
    type: String,
    default: null,
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    index: true
  },
  paymentMethodDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    createdAt: { type: Date, default: Date.now }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

PaymentSchema.index({ tenantId: 1, orderId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
