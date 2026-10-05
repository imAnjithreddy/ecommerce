function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function normalizeHostname(hostname) {
  if (!hostname) return '';
  return hostname.toLowerCase().split(':')[0].trim();
}

module.exports = {
  formatCurrency,
  normalizeHostname
};
