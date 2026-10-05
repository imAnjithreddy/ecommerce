const mongoose = require('mongoose');

const ProductVariantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Variant price is required'],
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0,
    default: null
  },
  inventoryQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  options: {
    type: Map,
    of: String,
    default: {} // e.g. { size: "M", color: "Navy" }
  },
  image: {
    type: String,
    default: ''
  }
}, { _id: true });

const ProductImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const ProductOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  values: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: 255
  },
  slug: {
    type: String,
    required: [true, 'Product slug is required'],
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    default: ''
  },
  images: [ProductImageSchema],
  price: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0,
    default: null
  },
  sku: {
    type: String,
    trim: true,
    required: [true, 'Base SKU is required']
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  options: [ProductOptionSchema],
  variants: [ProductVariantSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active',
    index: true
  },
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: [{ type: String }]
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for high performance and tenant isolation
ProductSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, status: 1, isDeleted: 1 });
ProductSchema.index({ tenantId: 1, 'variants.sku': 1 });
ProductSchema.index({ tenantId: 1, categories: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
