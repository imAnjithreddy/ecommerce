const mongoose = require('mongoose');
const { INVENTORY_TRANSACTION_TYPES } = require('@dtabs/shared');

const InventoryTransactionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(INVENTORY_TRANSACTION_TYPES),
    required: true
  },
  quantity: {
    type: Number,
    required: true // Positive for additions, negative for deductions
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  referenceId: {
    type: String, // e.g. orderId, returnId, purchaseOrderNumber
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

InventoryTransactionSchema.index({ tenantId: 1, sku: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema);
