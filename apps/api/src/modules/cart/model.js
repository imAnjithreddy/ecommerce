const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  sku: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  variantTitle: {
    type: String,
    default: ''
  },
  unitPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String,
    default: ''
  }
}, { _id: true });

const CartSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    index: true,
    default: null
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
    default: null
  },
  items: [CartItemSchema],
  appliedCouponCode: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

CartSchema.index({ tenantId: 1, sessionId: 1 });
CartSchema.index({ tenantId: 1, customerId: 1 });

module.exports = mongoose.model('Cart', CartSchema);
