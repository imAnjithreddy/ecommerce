# Database Schema Specifications

## Collections & Indexes

### 1. `users` (Global Platform Accounts)
```javascript
{
  _id: ObjectId,
  email: String (lowercase, unique, index),
  passwordHash: String,
  firstName: String,
  lastName: String,
  phone: String,
  isPlatformAdmin: Boolean (default: false),
  status: 'active' | 'suspended' | 'pending',
  createdAt: Date,
  updatedAt: Date
}
```

### 2. `tenants` (Merchants / Independent Stores)
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String (lowercase, unique, index), // e.g. "abc" for abc.dtabs.tech
  ownerId: ObjectId (ref: 'User', index),
  domains: [
    {
      hostname: String (lowercase, unique, index), // e.g. "www.abcstore.com"
      type: 'subdomain' | 'custom',
      verified: Boolean,
      verifiedAt: Date
    }
  ],
  plan: 'free' | 'starter' | 'professional' | 'enterprise',
  theme: {
    id: String (e.g. 'fashion', 'electronics', 'minimal'),
    version: String,
    settings: Object // Palette, typography, layout options
  },
  settings: {
    storeName: String,
    currency: String (default: 'USD'),
    timezone: String (default: 'UTC'),
    country: String (default: 'US'),
    supportEmail: String,
    logoUrl: String,
    faviconUrl: String
  },
  status: 'active' | 'suspended' | 'archived',
  createdAt: Date,
  updatedAt: Date
}
```

### 3. `tenantMembers` (User-to-Tenant RBAC)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', index),
  tenantId: ObjectId (ref: 'Tenant', index),
  role: 'store_owner' | 'store_admin' | 'store_manager' | 'store_staff',
  permissions: [String], // Explicit permission overrides if needed
  status: 'active' | 'invited' | 'disabled',
  createdAt: Date,
  updatedAt: Date
}
// Compound Unique Index: { userId: 1, tenantId: 1 }
```

### 4. `products` (Catalog Items)
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId (ref: 'Tenant', index),
  name: String,
  slug: String,
  description: String,
  images: [{ url: String, alt: String, isDefault: Boolean }],
  price: Number,
  compareAtPrice: Number,
  sku: String,
  categories: [ObjectId (ref: 'Category')],
  options: [{ name: String, values: [String] }], // e.g. Size: [S, M, L], Color: [Red, Blue]
  variants: [
    {
      _id: ObjectId,
      sku: String,
      price: Number,
      compareAtPrice: Number,
      options: Map (e.g. { size: 'M', color: 'Black' }),
      inventoryQuantity: Number,
      images: [String]
    }
  ],
  status: 'draft' | 'active' | 'archived',
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  metadata: Map,
  isDeleted: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { tenantId: 1, slug: 1 } (unique), { tenantId: 1, status: 1 }, { tenantId: 1, sku: 1 }
```

### 5. `inventory` & `inventoryTransactions` (Stock Ledger)
```javascript
// inventory
{
  _id: ObjectId,
  tenantId: ObjectId (index),
  productId: ObjectId (ref: 'Product', index),
  variantId: ObjectId,
  sku: String (index),
  availableQuantity: Number,
  reservedQuantity: Number,
  soldQuantity: Number,
  lowStockThreshold: Number,
  updatedAt: Date
}
// Compound Index: { tenantId: 1, sku: 1 } (unique)

// inventoryTransactions
{
  _id: ObjectId,
  tenantId: ObjectId (index),
  sku: String (index),
  type: 'PURCHASE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN' | 'CANCELLATION',
  quantity: Number, // positive or negative
  previousQuantity: Number,
  newQuantity: Number,
  referenceId: String, // orderId, returnId, or auditId
  note: String,
  actorId: ObjectId (ref: 'User'),
  createdAt: Date
}
```

### 6. `orders` & `orderItems` (Frozen Historical Snapshots)
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId (index),
  orderNumber: String (index), // e.g. "ORD-1001"
  customerId: ObjectId (ref: 'Customer', index),
  customerDetails: {
    email: String,
    firstName: String,
    lastName: String,
    phone: String
  },
  shippingAddress: { ... },
  billingAddress: { ... },
  items: [
    {
      productId: ObjectId,
      variantId: ObjectId,
      name: String, // Frozen product name
      sku: String,  // Frozen SKU
      price: Number,// Frozen unit price
      quantity: Number,
      variantOptions: Object,
      discount: Number,
      tax: Number,
      total: Number
    }
  ],
  subtotal: Number,
  discountTotal: Number,
  taxTotal: Number,
  shippingTotal: Number,
  grandTotal: Number,
  currency: String,
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
  paymentStatus: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded',
  fulfillmentStatus: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled',
  paymentMethod: String,
  paymentReference: String,
  appliedCoupon: {
    code: String,
    discountAmount: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```
