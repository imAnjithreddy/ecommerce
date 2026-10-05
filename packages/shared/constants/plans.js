const SAAS_PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

const PLAN_LIMITS = {
  [SAAS_PLANS.FREE]: {
    maxProducts: 25,
    maxAdmins: 1,
    maxMonthlyOrders: 100,
    allowCustomDomain: false,
    availableThemes: ['minimal'],
    analyticsRetentionDays: 30,
    storageMB: 500
  },
  [SAAS_PLANS.STARTER]: {
    maxProducts: 250,
    maxAdmins: 3,
    maxMonthlyOrders: 1000,
    allowCustomDomain: true,
    availableThemes: ['minimal', 'fashion'],
    analyticsRetentionDays: 90,
    storageMB: 5000
  },
  [SAAS_PLANS.PROFESSIONAL]: {
    maxProducts: 2500,
    maxAdmins: 10,
    maxMonthlyOrders: 10000,
    allowCustomDomain: true,
    availableThemes: ['minimal', 'fashion', 'electronics'],
    analyticsRetentionDays: 365,
    storageMB: 25000
  },
  [SAAS_PLANS.ENTERPRISE]: {
    maxProducts: Infinity,
    maxAdmins: Infinity,
    maxMonthlyOrders: Infinity,
    allowCustomDomain: true,
    availableThemes: ['minimal', 'fashion', 'electronics'],
    analyticsRetentionDays: 1095,
    storageMB: 100000
  }
};

module.exports = {
  SAAS_PLANS,
  PLAN_LIMITS
};
