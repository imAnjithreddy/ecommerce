const Tenant = require('./model');
const TenantMember = require('./member.model');
const AuditLog = require('../audit/audit.model');
const env = require('../../config/environment');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError, NotFoundError, ConflictError } = require('../../core/errors/AppError');
const { slugify, isValidSubdomain, ROLES, AUDIT_ACTIONS, SAAS_PLANS } = require('@dtabs/shared');
const { getRedisClient } = require('../../config/redis');

class TenantController {
  /**
   * Onboard / Provision a new store
   */
  async createStore(req, res, next) {
    try {
      const { name, slug: requestedSlug, themeId = 'fashion', plan = SAAS_PLANS.FREE, currency = 'USD' } = req.body;

      if (!name) {
        throw new BadRequestError('Store name is required');
      }

      const slug = slugify(requestedSlug || name);
      if (!isValidSubdomain(slug)) {
        throw new BadRequestError('Invalid subdomain slug. Must be 3-63 alphanumeric characters and not a reserved name');
      }

      const existingTenant = await Tenant.findOne({ slug });
      if (existingTenant) {
        throw new ConflictError(`Subdomain '${slug}.${env.PLATFORM_DOMAIN}' is already taken`);
      }

      const primaryDomain = `${slug}.${env.PLATFORM_DOMAIN}`;

      const tenant = await Tenant.create({
        name: name.trim(),
        slug,
        ownerId: req.user._id,
        plan,
        domains: [{
          hostname: primaryDomain,
          type: 'subdomain',
          verified: true,
          verifiedAt: new Date()
        }],
        theme: {
          id: themeId,
          version: '1.0.0',
          settings: {
            primaryColor: themeId === 'electronics' ? '#06b6d4' : themeId === 'minimal' ? '#000000' : '#d97706',
            secondaryColor: '#ffffff',
            accentColor: '#3b82f6',
            fontFamily: 'Inter',
            headerLayout: 'centered',
            bannerText: `Welcome to ${name.trim()}`
          }
        },
        settings: {
          storeName: name.trim(),
          currency: currency.toUpperCase(),
          timezone: 'UTC',
          country: 'US',
          supportEmail: req.user.email
        },
        status: 'active'
      });

      // Create Store Owner membership
      await TenantMember.create({
        userId: req.user._id,
        tenantId: tenant._id,
        role: ROLES.STORE_OWNER,
        status: 'active'
      });

      // Record audit log
      await AuditLog.create({
        tenantId: tenant._id,
        actorId: req.user._id,
        action: 'STORE_CREATED',
        resource: 'Tenant',
        resourceId: tenant._id.toString(),
        metadata: { name: tenant.name, slug: tenant.slug }
      });

      return ApiResponse.created(res, {
        tenant,
        storefrontUrl: `http://${primaryDomain}:3000`
      }, 'Store provisioned successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public domain / subdomain lookup
   */
  async resolveDomain(req, res, next) {
    try {
      const { hostname, slug } = req.query;
      const redis = getRedisClient();

      if (!hostname && !slug) {
        throw new BadRequestError('Either hostname or slug is required');
      }

      const query = {};
      let cacheKey = '';
      if (slug) {
        query.slug = slug.toLowerCase().trim();
        cacheKey = `tenant:slug:${query.slug}`;
      } else {
        const normalized = hostname.toLowerCase().split(':')[0].trim();
        query['domains.hostname'] = normalized;
        cacheKey = `tenant:host:${normalized}`;
      }

      const cached = await redis.get(cacheKey);
      if (cached) {
        return ApiResponse.success(res, JSON.parse(cached));
      }

      const tenant = await Tenant.findOne({ ...query, status: 'active' })
        .select('name slug theme settings domains status plan')
        .lean();

      if (!tenant) {
        throw new NotFoundError('Tenant store');
      }

      await redis.set(cacheKey, JSON.stringify(tenant), 'EX', 300);
      return ApiResponse.success(res, tenant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List current user's stores
   */
  async getMyStores(req, res, next) {
    try {
      const memberships = await TenantMember.find({ userId: req.user._id, status: 'active' })
        .populate('tenantId')
        .lean();

      const stores = memberships.map(m => ({
        tenant: m.tenantId,
        role: m.role,
        permissions: m.permissions
      }));

      return ApiResponse.success(res, stores);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update theme configuration (Admin)
   */
  async updateTheme(req, res, next) {
    try {
      const { themeId, settings } = req.body;
      const tenant = await Tenant.findById(req.tenantId);
      if (!tenant) {
        throw new NotFoundError('Tenant');
      }

      if (themeId) tenant.theme.id = themeId;
      if (settings) {
        tenant.theme.settings = {
          ...tenant.theme.settings,
          ...settings
        };
      }

      await tenant.save();

      // Invalidate cache
      const redis = getRedisClient();
      await redis.del(`tenant:id:${req.tenantId}`, `tenant:slug:${tenant.slug}`);

      await AuditLog.create({
        tenantId: tenant._id,
        actorId: req.user._id,
        action: AUDIT_ACTIONS.THEME_UPDATED,
        resource: 'Theme',
        resourceId: tenant._id.toString(),
        metadata: { themeId: tenant.theme.id }
      });

      return ApiResponse.success(res, tenant.theme, 'Theme updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update store general settings (Admin)
   */
  async updateSettings(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.tenantId);
      if (!tenant) {
        throw new NotFoundError('Tenant');
      }

      const { storeName, currency, timezone, country, supportEmail, logoUrl, faviconUrl } = req.body;

      if (storeName) tenant.settings.storeName = storeName;
      if (currency) tenant.settings.currency = currency.toUpperCase();
      if (timezone) tenant.settings.timezone = timezone;
      if (country) tenant.settings.country = country.toUpperCase();
      if (supportEmail) tenant.settings.supportEmail = supportEmail;
      if (logoUrl !== undefined) tenant.settings.logoUrl = logoUrl;
      if (faviconUrl !== undefined) tenant.settings.faviconUrl = faviconUrl;

      await tenant.save();

      // Invalidate cache
      const redis = getRedisClient();
      await redis.del(`tenant:id:${req.tenantId}`, `tenant:slug:${tenant.slug}`);

      await AuditLog.create({
        tenantId: tenant._id,
        actorId: req.user._id,
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        resource: 'TenantSettings',
        resourceId: tenant._id.toString(),
        metadata: req.body
      });

      return ApiResponse.success(res, tenant.settings, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add custom domain (Admin)
   */
  async addCustomDomain(req, res, next) {
    try {
      const { hostname } = req.body;
      if (!hostname) {
        throw new BadRequestError('Domain hostname is required');
      }

      const normalized = hostname.toLowerCase().trim();

      // Check if domain is in use anywhere in platform
      const existing = await Tenant.findOne({ 'domains.hostname': normalized });
      if (existing) {
        throw new ConflictError(`Domain '${normalized}' is already registered on DTabs Commerce`);
      }

      const tenant = await Tenant.findById(req.tenantId);
      tenant.domains.push({
        hostname: normalized,
        type: 'custom',
        verified: true, // Auto-verified in local / dev
        verifiedAt: new Date()
      });

      await tenant.save();

      return ApiResponse.created(res, tenant.domains, 'Domain added successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TenantController();
