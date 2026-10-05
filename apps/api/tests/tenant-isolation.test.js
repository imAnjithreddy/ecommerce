const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/modules/auth/user.model');
const Tenant = require('../src/modules/tenants/model');
const TenantMember = require('../src/modules/tenants/member.model');
const Product = require('../src/modules/products/model');
const { ROLES } = require('@dtabs/shared');

let mongoServer;
let tenantAToken, tenantBToken;
let tenantA, tenantB;
let productA, productB;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create User A & Tenant A
  const userA = await User.create({
    email: 'usera@tenanta.com',
    passwordHash: await User.hashPassword('pass12345'),
    firstName: 'Alice',
    lastName: 'Admin'
  });

  tenantA = await Tenant.create({
    name: 'Store Alpha',
    slug: 'alpha',
    ownerId: userA._id,
    domains: [{ hostname: 'alpha.dtabs.tech', type: 'subdomain', verified: true }]
  });

  await TenantMember.create({
    userId: userA._id,
    tenantId: tenantA._id,
    role: ROLES.STORE_OWNER
  });

  // Login User A
  const loginARes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'usera@tenanta.com', password: 'pass12345' });
  tenantAToken = loginARes.body.data.token;

  // Create User B & Tenant B
  const userB = await User.create({
    email: 'userb@tenantb.com',
    passwordHash: await User.hashPassword('pass12345'),
    firstName: 'Bob',
    lastName: 'Admin'
  });

  tenantB = await Tenant.create({
    name: 'Store Beta',
    slug: 'beta',
    ownerId: userB._id,
    domains: [{ hostname: 'beta.dtabs.tech', type: 'subdomain', verified: true }]
  });

  await TenantMember.create({
    userId: userB._id,
    tenantId: tenantB._id,
    role: ROLES.STORE_OWNER
  });

  // Login User B
  const loginBRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'userb@tenantb.com', password: 'pass12345' });
  tenantBToken = loginBRes.body.data.token;

  // Create Product in Tenant A
  const prodARes = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${tenantAToken}`)
    .set('x-tenant-id', tenantA._id.toString())
    .send({
      name: 'Alpha Secret Watch',
      sku: 'ALP-001',
      price: 250,
      initialStock: 10
    });
  productA = prodARes.body.data;

  // Create Product in Tenant B
  const prodBRes = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${tenantBToken}`)
    .set('x-tenant-id', tenantB._id.toString())
    .send({
      name: 'Beta Drone',
      sku: 'BET-001',
      price: 500,
      initialStock: 5
    });
  productB = prodBRes.body.data;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Strict Tenant Isolation Verification', () => {
  test('Tenant A can view its own product via Admin API', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/products/${productA._id}`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .set('x-tenant-id', tenantA._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.name).toBe('Alpha Secret Watch');
  });

  test('SECURITY: Tenant B CANNOT view Tenant A product by ID (Returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/products/${productA._id}`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .set('x-tenant-id', tenantB._id.toString());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('SECURITY: Tenant B CANNOT mutate Tenant A product (Returns 404)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${productA._id}`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .set('x-tenant-id', tenantB._id.toString())
      .send({ price: 10 }); // Attempt malicious price tampering

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify price did not change in DB
    const freshA = await Product.findById(productA._id);
    expect(freshA.price).toBe(250);
  });

  test('SECURITY: Tenant B CANNOT spoof Tenant A headers if token does not belong to Tenant A (Returns 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .set('x-tenant-id', tenantA._id.toString()); // Tenant B user trying to access Tenant A

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Storefront Isolation: Storefront Alpha only returns Alpha products', async () => {
    const res = await request(app)
      .get('/api/v1/storefront/products')
      .set('Host', 'alpha.dtabs.tech');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Alpha Secret Watch');
    // Ensure Beta Drone is nowhere in Alpha's catalog
    const hasBeta = res.body.data.some(p => p.name === 'Beta Drone');
    expect(hasBeta).toBe(false);
  });
});
