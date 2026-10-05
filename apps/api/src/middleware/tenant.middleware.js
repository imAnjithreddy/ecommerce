const Tenant = require('../modules/tenants/model');
const { getRedisClient } = require('../config/redis');
const env = require('../config/environment');
const { TenantNotFoundError, BadRequestError } = require('../core/errors/AppError');
const { normalizeHostname } = require('@dtabs/shared');

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Extracts candidate hostname and subdomain from request
 */
function extractHostAndSubdomain(req) {
  const rawHost = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const host = normalizeHostname(rawHost);

  let subdomain = null;
  const platformDomain = env.PLATFORM_DOMAIN.toLowerCase();

  // Handle subdomain on platform domain (e.g., abc.dtabs.tech or abc.localhost)
  if (host.endsWith(platformDomain)) {
    const parts = host.replace(platformDomain, '').replace(/\.$/, '').split('.');
    if (parts.length > 0 && parts[0]) {
      subdomain = parts[0];
    }
  } else if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const parts = host.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      subdomain = parts[0];
    }
  }

  return { host, subdomain };
}

/**
 * Resolves tenant from headers or host domain and attaches req.tenant and req.tenantId
 * @param {Object} options - { required: boolean }
 */
function resolveTenant(options = { required: true }) {
  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      let tenant = null;

      // 1. Direct explicit tenant ID or Slug override from trusted upstream / client
      const headerTenantId = req.headers['x-tenant-id'];
      const headerTenantSlug = req.headers['x-tenant-slug'];
      const queryTenant = req.query.tenantId || req.query.tenantSlug;

      if (headerTenantId) {
        const cacheKey = `tenant:id:${headerTenantId}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          tenant = JSON.parse(cached);
        } else {
          tenant = await Tenant.findById(headerTenantId).lean();
          if (tenant) {
            await redis.set(cacheKey, JSON.stringify(tenant), 'EX', CACHE_TTL_SECONDS);
          }
        }
      } else if (headerTenantSlug || (queryTenant && typeof queryTenant === 'string')) {
        const slug = (headerTenantSlug || queryTenant).toLowerCase().trim();
        const cacheKey = `tenant:slug:${slug}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          tenant = JSON.parse(cached);
        } else {
          tenant = await Tenant.findOne({ slug }).lean();
          if (tenant) {
            await redis.set(cacheKey, JSON.stringify(tenant), 'EX', CACHE_TTL_SECONDS);
          }
        }
      }

      // 2. Resolve via Host domain if not already found
      if (!tenant) {
        const { host, subdomain } = extractHostAndSubdomain(req);
        if (host) {
          const cacheKey = `tenant:host:${host}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            tenant = JSON.parse(cached);
          } else {
            // First look up exact domain match
            tenant = await Tenant.findOne({
              'domains.hostname': host,
              status: 'active'
            }).lean();

            // Then look up by subdomain slug if not found
            if (!tenant && subdomain && subdomain !== 'www' && subdomain !== 'api') {
              tenant = await Tenant.findOne({
                slug: subdomain.toLowerCase(),
                status: 'active'
              }).lean();
            }

            if (tenant) {
              await redis.set(cacheKey, JSON.stringify(tenant), 'EX', CACHE_TTL_SECONDS);
            }
          }
        }
      }

      if (!tenant) {
        if (options.required) {
          throw new TenantNotFoundError(req.headers['x-tenant-id'] || req.headers['host']);
        }
        return next();
      }

      if (tenant.status !== 'active') {
        throw new BadRequestError(`Tenant account is currently ${tenant.status}`, null, 'TENANT_INACTIVE');
      }

      // Attach tenant info to request
      req.tenant = tenant;
      req.tenantId = tenant._id.toString();

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  resolveTenant,
  extractHostAndSubdomain
};
