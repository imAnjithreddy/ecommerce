const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  sku: {
    type: String,
    required: true,
    trim: true
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  soldQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  }
}, {
  timestamps: true
});

InventorySchema.index({ tenantId: 1, sku: 1 }, { unique: true });
InventorySchema.index({ tenantId: 1, productId: 1 });

module.exports = mongoose.model('Inventory', InventorySchema);
