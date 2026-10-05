const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/modules/auth/user.model');
const Tenant = require('../src/modules/tenants/model');
const TenantMember = require('../src/modules/tenants/member.model');
const Product = require('../src/modules/products/model');
const Inventory = require('../src/modules/inventory/model');
const Coupon = require('../src/modules/coupons/model');
const Order = require('../src/modules/orders/model');
const { ROLES } = require('@dtabs/shared');

let mongoServer;
let tenant;
let product;
let coupon;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const owner = await User.create({
    email: 'shop@tester.com',
    passwordHash: await User.hashPassword('pass12345'),
    firstName: 'Store',
    lastName: 'Tester'
  });

  tenant = await Tenant.create({
    name: 'Cart Test Store',
    slug: 'carttest',
    ownerId: owner._id,
    domains: [{ hostname: 'carttest.dtabs.tech', type: 'subdomain', verified: true }]
  });

  await TenantMember.create({
    userId: owner._id,
    tenantId: tenant._id,
    role: ROLES.STORE_OWNER
  });

  // Create Product with 3 available in stock
  product = await Product.create({
    tenantId: tenant._id,
    name: 'Limited Sneakers',
    slug: 'limited-sneakers',
    price: 100,
    sku: 'SNK-001',
    status: 'active'
  });

  await Inventory.create({
    tenantId: tenant._id,
    productId: product._id,
    sku: 'SNK-001',
    availableQuantity: 3
  });

  // Create 10% coupon
  coupon = await Coupon.create({
    tenantId: tenant._id,
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    minimumOrderValue: 50,
    isActive: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Cart, Inventory Ledger & Order Snapshots Verification', () => {
  const sessionId = 'session_test_abc123';

  test('Guest can add item to cart', async () => {
    const res = await request(app)
      .post('/api/v1/storefront/cart/items')
      .set('Host', 'carttest.dtabs.tech')
      .send({
        sessionId,
        productId: product._id.toString(),
        quantity: 2
      });

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].unitPrice).toBe(100);
    expect(res.body.data.items[0].quantity).toBe(2);
  });

  test('Coupon discount calculates correctly', async () => {
    const res = await request(app)
      .post('/api/v1/storefront/cart/coupon')
      .set('Host', 'carttest.dtabs.tech')
      .send({
        sessionId,
        code: 'SAVE10'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.discount).toBe(20); // 10% of 2 * 100 = 20
  });

  test('Checkout freezes historical product details and decrements inventory', async () => {
    const cartRes = await request(app)
      .get('/api/v1/storefront/cart')
      .set('Host', 'carttest.dtabs.tech')
      .set('x-cart-session', sessionId);

    const cartId = cartRes.body.data._id;

    const checkoutRes = await request(app)
      .post('/api/v1/storefront/checkout')
      .set('Host', 'carttest.dtabs.tech')
      .send({
        cartId,
        customerDetails: {
          email: 'buyer@example.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        shippingAddress: {
          street: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105'
        }
      });

    expect(checkoutRes.status).toBe(201);
    const order = checkoutRes.body.data.order;
    expect(order.items[0].name).toBe('Limited Sneakers');
    expect(order.items[0].price).toBe(100);
    expect(order.items[0].quantity).toBe(2);

    // Verify stock decremented in Inventory ledger: 3 - 2 = 1 remaining
    const inv = await Inventory.findOne({ tenantId: tenant._id, sku: 'SNK-001' });
    expect(inv.availableQuantity).toBe(1);
    expect(inv.soldQuantity).toBe(2);

    // Mutate live product price in catalog to $999
    product.price = 999;
    product.name = 'Renamed Expensive Shoes';
    await product.save();

    // Verify order line item remains completely frozen to original state
    const fetchedOrder = await Order.findById(order._id);
    expect(fetchedOrder.items[0].price).toBe(100);
    expect(fetchedOrder.items[0].name).toBe('Limited Sneakers');
  });

  test('Overselling Protection: Cannot checkout more items than remaining in stock', async () => {
    // Add 2 sneakers to a new cart (only 1 remaining in stock)
    const newSession = 'session_oversell_attempt';
    const cartRes = await request(app)
      .post('/api/v1/storefront/cart/items')
      .set('Host', 'carttest.dtabs.tech')
      .send({
        sessionId: newSession,
        productId: product._id.toString(),
        quantity: 2
      });

    const cartId = cartRes.body.data._id;

    const checkoutRes = await request(app)
      .post('/api/v1/storefront/checkout')
      .set('Host', 'carttest.dtabs.tech')
      .send({
        cartId,
        customerDetails: {
          email: 'buyer2@example.com',
          firstName: 'Jane',
          lastName: 'Smith'
        },
        shippingAddress: {
          street: '456 Tech Blvd',
          city: 'San Jose',
          state: 'CA',
          postalCode: '95112'
        }
      });

    expect(checkoutRes.status).toBe(400);
    expect(checkoutRes.body.error.message).toContain('Out of stock');

    // Confirm inventory remains untouched at 1
    const inv = await Inventory.findOne({ tenantId: tenant._id, sku: 'SNK-001' });
    expect(inv.availableQuantity).toBe(1);
  });
});
