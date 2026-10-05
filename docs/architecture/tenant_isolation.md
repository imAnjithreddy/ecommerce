# Tenant Isolation Architecture in DTabs Commerce

## 1. Threat Model & Security Principles
Multi-tenancy in DTabs Commerce follows a **Zero-Trust Client Identity Model**:
- **Never trust client-supplied `tenantId`**: The client cannot declare what tenant they belong to or what tenant data they wish to modify via request payloads or URL parameters unless cryptographically verified.
- **Hostname Resolution**: For storefront public traffic, tenant identity is resolved strictly from the incoming `Host` / `X-Forwarded-Host` header via the Domain Resolver.
- **Session Membership Resolution**: For administrative operations (`/api/v1/admin/*`), the authenticated user's JWT is verified, and the system looks up their active `TenantMember` record matching the resolved tenant context and checks fine-grained permissions.
- **Service Layer Enforced Scoping**: Every database interaction with tenant-scoped collections MUST include `tenantId`.

```
Storefront Request (abc.dtabs.tech/products)
        │
        ▼
[Next.js Middleware]
  - Host Header Check: 'abc.dtabs.tech'
  - Subdomain Extraction: 'abc'
  - Resolve to tenantId via Storefront API / Cache
  - Inject verified x-tenant-id header to internal SSR fetch
        │
        ▼
[Express tenant.middleware.js]
  - If x-tenant-id / x-tenant-slug header present (from trusted SSR / proxy)
    OR resolved from host domain
  - Fetch Tenant document (cache in Redis)
  - Ensure status === 'active'
  - Attach req.tenant and req.tenantId
        │
        ▼
[Express auth.middleware.js + role.middleware.js]
  - Authenticate JWT (if protected route)
  - Verify TenantMember(userId, tenantId)
  - Verify Role permissions (e.g. products.create)
        │
        ▼
[Service Layer]
  - Product.findOne({ _id: productId, tenantId: req.tenantId })
  - Hard constraint: cross-tenant access is structurally impossible
```

## 2. Shared-Database, Shared-Schema Isolation
All tenant documents reside in the same MongoDB collections for optimal resource efficiency and unified maintenance, partitioned logically by indexed `tenantId`:
- `db.products.createIndex({ tenantId: 1, slug: 1 }, { unique: true })`
- `db.orders.createIndex({ tenantId: 1, orderNumber: 1 }, { unique: true })`
- `db.customers.createIndex({ tenantId: 1, email: 1 }, { unique: true })`
- `db.inventory.createIndex({ tenantId: 1, sku: 1 }, { unique: true })`

Even if a malicious user inspects or guesses another tenant's document `_id` and invokes `GET /api/v1/admin/orders/:id`, the query:
```javascript
const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
```
evaluates to `null`, returning an HTTP 404 NOT FOUND with zero information disclosure.
