const TenantMember = require('../modules/tenants/member.model');
const { ROLE_PERMISSIONS, ROLES } = require('@dtabs/shared');
const { ForbiddenError, UnauthorizedError } = require('../core/errors/AppError');

/**
 * Ensures user is a platform administrator (e.g. DTabs Super Admin)
 */
function requirePlatformAdmin(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  if (!req.user.isPlatformAdmin) {
    return next(new ForbiddenError('Platform administrator access required'));
  }
  next();
}

/**
 * Ensures user is an authorized member of the current tenant and possesses required permission
 * @param {string} [requiredPermission] - e.g. 'products.create', 'orders.read'
 */
function requireTenantMembership(requiredPermission = null) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      if (!req.tenantId) {
        throw new ForbiddenError('Tenant context required for this operation');
      }

      // 1. Platform admins have global access if needed
      if (req.user.isPlatformAdmin) {
        return next();
      }

      // 2. Check if user is the direct Tenant Owner
      const isTenantOwner = req.tenant && req.tenant.ownerId &&
        req.tenant.ownerId.toString() === req.user._id.toString();

      if (isTenantOwner) {
        req.membership = {
          userId: req.user._id,
          tenantId: req.tenantId,
          role: ROLES.STORE_OWNER,
          status: 'active'
        };
        return next();
      }

      // 3. Look up TenantMember
      const membership = await TenantMember.findOne({
        userId: req.user._id,
        tenantId: req.tenantId,
        status: 'active'
      }).lean();

      if (!membership) {
        throw new ForbiddenError('You are not a member of this store');
      }

      // 4. Verify permission if specified
      if (requiredPermission) {
        const rolePerms = ROLE_PERMISSIONS[membership.role] || [];
        const customPerms = membership.permissions || [];
        const allPerms = new Set([...rolePerms, ...customPerms]);

        if (!allPerms.has(requiredPermission)) {
          throw new ForbiddenError(`Missing required permission: ${requiredPermission}`);
        }
      }

      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requirePlatformAdmin,
  requireTenantMembership
};
