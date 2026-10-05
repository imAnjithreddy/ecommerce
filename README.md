# DTabs Commerce — Production-Grade Multi-Tenant SaaS E-Commerce Platform

DTabs Commerce is a production-grade multi-tenant SaaS e-commerce platform built with Next.js (App Router, Server & Client Components in pure JavaScript), Express.js (modular monolith in pure JavaScript), MongoDB (Mongoose), and Redis.

The platform shares unified infrastructure across multiple independent online stores (e.g. `abc.dtabs.tech`, `xyz.dtabs.tech`, or custom domains like `www.mystore.com`), while guaranteeing strict tenant data isolation at the routing, service, and database query layers.

---

## 🏛️ System Architecture

```
                                  Storefront Visitor
                             (e.g., https://aurora.dtabs.tech)
                                          │
                                          ▼
                                [ Next.js Middleware ]
               - Resolves Host / Subdomain header ('aurora')
               - Injects x-tenant-slug / x-tenant-id into SSR request headers
                                          │
                                          ▼
                             [ Express API Gateway ]
               - tenant.middleware.js validates tenant active status
               - Injects req.tenant and req.tenantId
                                          │
                                          ▼
                           [ Tenant Scoped Services ]
               - Product.findOne({ slug, tenantId: req.tenantId })
               - Order.find({ tenantId: req.tenantId })
                                          │
                                          ▼
                               [ MongoDB Database ]
                         Shared Database, Shared Collections
                         Partitioned by Indexed tenantId
```

---

## 🔒 Security & Multi-Tenancy Principles

1. **Zero-Trust Client Identity**:
   - `tenantId` supplied in client payloads is never trusted.
   - For storefront operations, tenant identity is cryptographically resolved by the Domain Resolver from incoming host headers.
   - For administrative operations, tenant membership is verified against `TenantMember` records for the authenticated user.
2. **First-Class Query Scoping**:
   - Every single tenant-owned database query includes `{ tenantId: req.tenantId }`.
   - Direct `findById(id)` without `tenantId` is strictly forbidden.
   - If Tenant B attempts to inspect or mutate Tenant A's products, orders, or customers by ID, the query returns `404 Not Found`, preventing IDOR and data leakage.
3. **Historical Order Snapshots**:
   - When an order is placed, full product details (name, SKU, price, variant, attributes, tax, discount) are frozen into the immutable order record. Future catalog edits never alter historical invoices.
4. **Atomic Inventory Ledger**:
   - Stock is decremented via atomic `$inc` checks, preventing overselling even during high-concurrency checkouts. Every movement is logged in `InventoryTransactions` (`PURCHASE`, `RESTOCK`, `ADJUSTMENT`, `RETURN`, `CANCELLATION`).
5. **Payment Provider Abstraction**:
   - Decoupled `PaymentService` supporting Stripe, Dodo Payments, and Sandbox/Mock providers with webhook signature verification and idempotency keys. Orders are never marked paid solely from frontend claims.

---

## 📁 Monorepo Structure

```
dtabs-commerce/
├── apps/
│   ├── api/                     # Node.js & Express.js REST API (Modular Monolith)
│   │   ├── src/
│   │   │   ├── config/          # Database, Redis, Environment, Storage drivers
│   │   │   ├── core/            # AppError classes, Winston logger, ApiResponse, Pagination
│   │   │   ├── middleware/      # Auth, Tenant isolation, RBAC, Rate-limit, Validation
│   │   │   ├── modules/         # Auth, Tenants, Products, Orders, Cart, Payments, Inventory...
│   │   │   ├── server.js
│   │   │   └── app.js
│   │   └── tests/               # Jest tests (Strict Tenant Isolation, Cart & Orders)
│   └── web/                     # Next.js App Router (JavaScript only, No TypeScript)
│       ├── app/
│       │   ├── (store)/         # Storefront: Catalog, Products, Cart, Checkout
│       │   ├── admin/           # Store Admin: Dashboard, Products, Orders, Inventory, Themes
│       │   ├── platform/        # Platform Super-Admin: SaaS Metrics, Tenants, Plans
│       │   ├── onboarding/      # Subdomain provisioning & theme selection
│       │   ├── login/ & register/
│       │   └── globals.css      # Vanilla CSS Design System & Theme Custom Properties
│       ├── components/          # Themes (fashion, electronics, minimal), UI, Product cards
│       ├── lib/                 # Tenant resolver, API client, SEO utilities
│       └── middleware.js        # Edge middleware for domain/subdomain resolution
├── packages/
│   └── shared/                  # Constants (roles, permissions, order states), Utils (slugify, formatters)
├── docs/                        # Architecture, Database schemas, Nginx reverse proxy specs
├── .env.example
└── package.json                 # npm workspaces
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+

### 2. Environment Setup
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
*(Note: If a local MongoDB or Redis daemon is not running, the application automatically uses built-in in-memory fallbacks so you can test immediately with zero friction!)*

### 3. Install Dependencies
```powershell
npm install
```

### 4. Run Automated Test Suite
Verify strict tenant isolation and order processing:
```powershell
npm test --workspace=apps/api
```

### 5. Seed Test Stores
Provisions two demo merchant stores with products, variants, coupons, and themes:
```powershell
npm run seed --workspace=apps/api
```
- **Aurora Luxe Fashion**: `aurora.dtabs.tech` (Theme: `fashion`, Editorial serif, Burgundy palette)
  - Admin: `owner@aurorafashion.com` / `password123`
- **Volt Audio & Tech**: `volt.dtabs.tech` (Theme: `electronics`, Space Grotesk, Cyan/Dark palette)
  - Admin: `owner@voltelectronics.com` / `password123`
- **Platform Super-Admin**: `admin@dtabs.tech` / `admin12345`

### 6. Start Development Servers
Start both backend API (port 5000) and frontend (port 3000):
```powershell
npm run dev
```
- Storefront: `http://localhost:3000/?tenant=aurora` or `http://localhost:3000/?tenant=volt`
- Store Admin: `http://localhost:3000/admin/dashboard?tenant=aurora`
- Platform Super-Admin: `http://localhost:3000/platform/dashboard`
- Launch New Store: `http://localhost:3000/onboarding`
