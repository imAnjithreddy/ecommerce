const roles = require('./constants/roles');
const orders = require('./constants/orders');
const inventory = require('./constants/inventory');
const plans = require('./constants/plans');
const audit = require('./constants/audit');
const { slugify, isValidSubdomain } = require('./utils/slugify');
const { formatCurrency, normalizeHostname } = require('./utils/formatters');

module.exports = {
  ...roles,
  ...orders,
  ...inventory,
  ...plans,
  ...audit,
  slugify,
  isValidSubdomain,
  formatCurrency,
  normalizeHostname
};
