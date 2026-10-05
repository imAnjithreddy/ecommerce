const mongoose = require('mongoose');
const { SAAS_PLANS } = require('@dtabs/shared');

const DomainSchema = new mongoose.Schema({
  hostname: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['subdomain', 'custom'],
    default: 'subdomain'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, { _id: true });

const TenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant store name is required'],
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: [true, 'Subdomain slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  domains: [DomainSchema],
  plan: {
    type: String,
    enum: Object.values(SAAS_PLANS),
    default: SAAS_PLANS.FREE
  },
  theme: {
    id: {
      type: String,
      default: 'fashion'
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    settings: {
      primaryColor: { type: String, default: '#0f172a' },
      secondaryColor: { type: String, default: '#f8fafc' },
      accentColor: { type: String, default: '#3b82f6' },
      fontFamily: { type: String, default: 'Inter' },
      headerLayout: { type: String, default: 'centered' },
      bannerText: { type: String, default: 'Welcome to our store' }
    }
  },
  settings: {
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    country: { type: String, default: 'US' },
    supportEmail: { type: String, trim: true, lowercase: true },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Create index on domains.hostname
TenantSchema.index({ 'domains.hostname': 1 });

module.exports = mongoose.model('Tenant', TenantSchema);
