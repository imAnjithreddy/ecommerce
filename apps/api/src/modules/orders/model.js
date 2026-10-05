const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } = require('@dtabs/shared');

const OrderItemSnapshotSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  name: {
    type: String,
    required: true // Historical product name snapshot
  },
  sku: {
    type: String,
    required: true // Historical SKU snapshot
  },
  price: {
    type: Number,
    required: true // Historical unit price snapshot
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  variantTitle: {
    type: String,
    default: ''
  },
  variantOptions: {
    type: Map,
    of: String,
    default: {}
  },
  image: {
    type: String,
    default: ''
  },
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
}, { _id: true });

const OrderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
    index: true
  },
  customerDetails: {
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, default: '' }
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'US' }
  },
  billingAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'US' }
  },
  items: [OrderItemSnapshotSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discountTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  taxTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  grandTotal: {
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
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    index: true
  },
  fulfillmentStatus: {
    type: String,
    enum: Object.values(FULFILLMENT_STATUS),
    default: FULFILLMENT_STATUS.UNFULFILLED,
    index: true
  },
  paymentMethod: {
    type: String,
    default: 'mock'
  },
  paymentReference: {
    type: String,
    default: null
  },
  appliedCoupon: {
    code: { type: String, default: null },
    discountAmount: { type: Number, default: 0 }
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

OrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
OrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
