function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

function isValidSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') return false;
  // Subdomain: lowercase alphanumeric, hyphens allowed, 3-63 chars, cannot start/end with hyphen
  const regex = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;
  const reserved = ['admin', 'api', 'app', 'platform', 'www', 'mail', 'ftp', 'dev', 'staging', 'test', 'dtabs'];
  return regex.test(subdomain) && !reserved.includes(subdomain);
}

module.exports = {
  slugify,
  isValidSubdomain
};
