const Tenant = require('../tenants/model');
const User = require('../auth/user.model');
const Order = require('../orders/model');
const ApiResponse = require('../../core/response/ApiResponse');
const { getPaginationParams } = require('../../core/pagination/pagination');
const { SAAS_PLANS, PLAN_LIMITS } = require('@dtabs/shared');
const { NotFoundError, BadRequestError } = require('../../core/errors/AppError');

class PlatformController {
  /**
   * Platform-wide high-level analytics
   */
  async getPlatformStats(req, res, next) {
    try {
      const [
        totalTenants,
        activeTenants,
        totalUsers,
        totalGlobalOrders,
        globalRevenueAgg
      ] = await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: 'active' }),
        User.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } }
        ])
      ]);

      const globalRevenue = globalRevenueAgg.length > 0 ? globalRevenueAgg[0].total : 0;

      return ApiResponse.success(res, {
        totalTenants,
        activeTenants,
        totalUsers,
        totalGlobalOrders,
        globalRevenue: Math.round(globalRevenue * 100) / 100,
        availablePlans: SAAS_PLANS,
        planLimits: PLAN_LIMITS
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all tenants across the SaaS platform
   */
  async listTenants(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const { status, search, plan } = req.query;

      const query = {};
      if (status) query.status = status;
      if (plan) query.plan = plan;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } }
        ];
      }

      const [tenants, totalItems] = await Promise.all([
        Tenant.find(query)
          .populate('ownerId', 'email firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Tenant.countDocuments(query)
      ]);

      return ApiResponse.paginated(res, tenants, { page, limit, totalItems });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant status or subscription plan
   */
  async updateTenant(req, res, next) {
    try {
      const { status, plan } = req.body;
      const tenant = await Tenant.findById(req.params.id);

      if (!tenant) {
        throw new NotFoundError('Tenant');
      }

      if (status) {
        tenant.status = status;
      }
      if (plan) {
        if (!Object.values(SAAS_PLANS).includes(plan)) {
          throw new BadRequestError(`Invalid plan: ${plan}`);
        }
        tenant.plan = plan;
      }

      await tenant.save();
      return ApiResponse.success(res, tenant, 'Tenant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all users
   */
  async listUsers(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const { search } = req.query;

      const query = {};
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }

      const [users, totalItems] = await Promise.all([
        User.find(query)
          .select('-passwordHash')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);

      return ApiResponse.paginated(res, users, { page, limit, totalItems });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Platform Admin: Onboard/Provision a new tenant store
   */
  async onboardTenant(req, res, next) {
    try {
      const {
        name,
        slug: requestedSlug,
        ownerEmail,
        ownerFirstName = 'Store',
        ownerLastName = 'Owner',
        plan = SAAS_PLANS.STARTER,
        themeId = 'fashion',
        currency = 'USD'
      } = req.body;

      if (!name || !ownerEmail) {
        throw new BadRequestError('Store name and owner email are required');
      }

      const { slugify, isValidSubdomain, ROLES, AUDIT_ACTIONS } = require('@dtabs/shared');
      const TenantMember = require('../tenants/member.model');
      const AuditLog = require('../audit/audit.model');
      const env = require('../../config/environment');

      const slug = slugify(requestedSlug || name);
      if (!isValidSubdomain(slug)) {
        throw new BadRequestError('Invalid subdomain slug. Must be 3-63 alphanumeric characters and not a reserved name');
      }

      const existingTenant = await Tenant.findOne({ slug });
      if (existingTenant) {
        throw new BadRequestError(`Subdomain '${slug}.${env.PLATFORM_DOMAIN}' is already assigned to an existing tenant`);
      }

      // Check or create owner user
      let ownerUser = await User.findOne({ email: ownerEmail.toLowerCase().trim() });
      let generatedPassword = null;

      if (!ownerUser) {
        generatedPassword = req.body.password || 'MerchantPass123!';
        const passwordHash = await User.hashPassword(generatedPassword);
        ownerUser = await User.create({
          email: ownerEmail.toLowerCase().trim(),
          passwordHash,
          firstName: ownerFirstName.trim(),
          lastName: ownerLastName.trim(),
          status: 'active'
        });
      }

      const primaryDomain = `${slug}.${env.PLATFORM_DOMAIN}`;

      const tenant = await Tenant.create({
        name: name.trim(),
        slug,
        ownerId: ownerUser._id,
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
            primaryColor: themeId === 'electronics' ? '#06b6d4' : themeId === 'minimal' ? '#18181b' : '#881337',
            secondaryColor: '#ffffff',
            accentColor: themeId === 'electronics' ? '#38bdf8' : themeId === 'minimal' ? '#71717a' : '#fb7185',
            fontFamily: themeId === 'electronics' ? 'Space Grotesk' : themeId === 'minimal' ? 'Inter' : 'Playfair Display',
            bannerText: `Welcome to ${name.trim()}`
          }
        },
        settings: {
          storeName: name.trim(),
          currency: currency.toUpperCase(),
          timezone: 'UTC',
          country: 'US',
          supportEmail: ownerEmail.toLowerCase().trim()
        },
        status: 'active'
      });

      // Assign store_owner membership
      await TenantMember.create({
        userId: ownerUser._id,
        tenantId: tenant._id,
        role: ROLES.STORE_OWNER,
        status: 'active'
      });

      await AuditLog.create({
        tenantId: tenant._id,
        actorId: req.user._id,
        action: 'PLATFORM_TENANT_ONBOARDED',
        resource: 'Tenant',
        resourceId: tenant._id.toString(),
        metadata: {
          onboardedBy: req.user.email,
          ownerEmail: ownerUser.email,
          plan: tenant.plan
        }
      });

      return ApiResponse.created(res, {
        tenant,
        owner: {
          id: ownerUser._id,
          email: ownerUser.email,
          temporaryPassword: generatedPassword
        },
        storefrontUrl: `http://${primaryDomain}:3000`,
        adminUrl: `http://localhost:3000/admin/dashboard?tenant=${slug}`
      }, 'Tenant store successfully onboarded by platform admin');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlatformController();
