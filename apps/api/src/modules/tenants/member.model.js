const mongoose = require('mongoose');
const { ROLES } = require('@dtabs/shared');

const TenantMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: [
      ROLES.STORE_OWNER,
      ROLES.STORE_ADMIN,
      ROLES.STORE_MANAGER,
      ROLES.STORE_STAFF
    ],
    default: ROLES.STORE_STAFF,
    required: true
  },
  permissions: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'invited', 'disabled'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Ensure a user has at most one membership record per tenant
TenantMemberSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('TenantMember', TenantMemberSchema);
