const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../modules/auth/user.model');
const Tenant = require('../modules/tenants/model');
const TenantMember = require('../modules/tenants/member.model');
const Category = require('../modules/categories/model');
const Product = require('../modules/products/model');
const Inventory = require('../modules/inventory/model');
const Coupon = require('../modules/coupons/model');
const { ROLES, SAAS_PLANS } = require('@dtabs/shared');
const { logger } = require('../core/logger/logger');

async function seed() {
  try {
    logger.info('Starting DTabs Commerce database seeding...');
    await connectDB();

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Tenant.deleteMany({}),
      TenantMember.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      Coupon.deleteMany({})
    ]);

    // 1. Create Platform Admin User
    const platformAdmin = await User.create({
      email: 'admin@dtabs.tech',
      passwordHash: await User.hashPassword('admin12345'),
      firstName: 'Platform',
      lastName: 'Superadmin',
      isPlatformAdmin: true,
      status: 'active'
    });
    logger.info('Created Platform Admin:', { email: platformAdmin.email });

    // 2. Create Tenant 1: Aurora Fashion
    const auroraOwner = await User.create({
      email: 'owner@aurorafashion.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Elena',
      lastName: 'Vance',
      status: 'active'
    });

    const auroraTenant = await Tenant.create({
      name: 'Aurora Luxe Fashion',
      slug: 'aurora',
      ownerId: auroraOwner._id,
      plan: SAAS_PLANS.PROFESSIONAL,
      domains: [
        { hostname: 'aurora.dtabs.tech', type: 'subdomain', verified: true, verifiedAt: new Date() },
        { hostname: 'aurora.localhost', type: 'subdomain', verified: true, verifiedAt: new Date() }
      ],
      theme: {
        id: 'fashion',
        version: '1.0.0',
        settings: {
          primaryColor: '#881337',
          secondaryColor: '#fff1f2',
          accentColor: '#fb7185',
          fontFamily: 'Playfair Display',
          headerLayout: 'centered',
          bannerText: 'Autumn Elegance Collection 2026'
        }
      },
      settings: {
        storeName: 'Aurora Luxe Fashion',
        currency: 'USD',
        timezone: 'America/New_York',
        supportEmail: 'concierge@aurorafashion.com'
      },
      status: 'active'
    });

    await TenantMember.create({
      userId: auroraOwner._id,
      tenantId: auroraTenant._id,
      role: ROLES.STORE_OWNER,
      status: 'active'
    });

    // Aurora Categories
    const auroraCatJackets = await Category.create({
      tenantId: auroraTenant._id,
      name: 'Outerwear & Jackets',
      slug: 'outerwear',
      description: 'Hand-tailored coats and leather jackets'
    });
    const auroraCatDresses = await Category.create({
      tenantId: auroraTenant._id,
      name: 'Evening Dresses',
      slug: 'dresses',
      description: 'Timeless couture dresses'
    });

    // Aurora Products
    const jacketProduct = await Product.create({
      tenantId: auroraTenant._id,
      name: 'Vintage Florentine Leather Jacket',
      slug: 'vintage-florentine-leather-jacket',
      description: 'Crafted from vegetable-tanned Italian calfskin with solid brass hardware.',
      price: 495,
      compareAtPrice: 595,
      sku: 'AUR-JKT-001',
      categories: [auroraCatJackets._id],
      isFeatured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80', isDefault: true, alt: 'Leather Jacket' }
      ],
      options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
      variants: [
        { sku: 'AUR-JKT-S', title: 'Small', price: 495, options: { Size: 'S' }, inventoryQuantity: 10 },
        { sku: 'AUR-JKT-M', title: 'Medium', price: 495, options: { Size: 'M' }, inventoryQuantity: 15 },
        { sku: 'AUR-JKT-L', title: 'Large', price: 495, options: { Size: 'L' }, inventoryQuantity: 8 }
      ]
    });

    await Inventory.create({ tenantId: auroraTenant._id, productId: jacketProduct._id, sku: 'AUR-JKT-001', availableQuantity: 33 });
    await Inventory.create({ tenantId: auroraTenant._id, productId: jacketProduct._id, sku: 'AUR-JKT-S', availableQuantity: 10 });
    await Inventory.create({ tenantId: auroraTenant._id, productId: jacketProduct._id, sku: 'AUR-JKT-M', availableQuantity: 15 });
    await Inventory.create({ tenantId: auroraTenant._id, productId: jacketProduct._id, sku: 'AUR-JKT-L', availableQuantity: 8 });

    const dressProduct = await Product.create({
      tenantId: auroraTenant._id,
      name: 'Midnight Silk Wrap Gown',
      slug: 'midnight-silk-wrap-gown',
      description: '100% mulberry silk with an asymmetrical drape.',
      price: 340,
      sku: 'AUR-DRS-001',
      categories: [auroraCatDresses._id],
      isFeatured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80', isDefault: true, alt: 'Silk Gown' }
      ],
      options: [{ name: 'Size', values: ['XS', 'S', 'M'] }],
      variants: [
        { sku: 'AUR-DRS-XS', title: 'XS', price: 340, options: { Size: 'XS' }, inventoryQuantity: 5 },
        { sku: 'AUR-DRS-S', title: 'S', price: 340, options: { Size: 'S' }, inventoryQuantity: 12 },
        { sku: 'AUR-DRS-M', title: 'M', price: 340, options: { Size: 'M' }, inventoryQuantity: 7 }
      ]
    });
    await Inventory.create({ tenantId: auroraTenant._id, productId: dressProduct._id, sku: 'AUR-DRS-001', availableQuantity: 24 });
    await Inventory.create({ tenantId: auroraTenant._id, productId: dressProduct._id, sku: 'AUR-DRS-XS', availableQuantity: 5 });
    await Inventory.create({ tenantId: auroraTenant._id, productId: dressProduct._id, sku: 'AUR-DRS-S', availableQuantity: 12 });
    await Inventory.create({ tenantId: auroraTenant._id, productId: dressProduct._id, sku: 'AUR-DRS-M', availableQuantity: 7 });

    // Aurora Coupon
    await Coupon.create({
      tenantId: auroraTenant._id,
      code: 'LUXE15',
      type: 'percentage',
      value: 15,
      minimumOrderValue: 200,
      isActive: true
    });

    // 3. Create Tenant 2: Volt Electronics
    const voltOwner = await User.create({
      email: 'owner@voltelectronics.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Marcus',
      lastName: 'Chen',
      status: 'active'
    });

    const voltTenant = await Tenant.create({
      name: 'Volt Audio & Tech',
      slug: 'volt',
      ownerId: voltOwner._id,
      plan: SAAS_PLANS.STARTER,
      domains: [
        { hostname: 'volt.dtabs.tech', type: 'subdomain', verified: true, verifiedAt: new Date() },
        { hostname: 'volt.localhost', type: 'subdomain', verified: true, verifiedAt: new Date() }
      ],
      theme: {
        id: 'electronics',
        version: '1.0.0',
        settings: {
          primaryColor: '#0ea5e9',
          secondaryColor: '#0f172a',
          accentColor: '#38bdf8',
          fontFamily: 'Space Grotesk',
          headerLayout: 'search-prominent',
          bannerText: 'Next-Gen Acoustic Engineering'
        }
      },
      settings: {
        storeName: 'Volt Audio & Tech',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        supportEmail: 'help@voltelectronics.com'
      },
      status: 'active'
    });

    await TenantMember.create({
      userId: voltOwner._id,
      tenantId: voltTenant._id,
      role: ROLES.STORE_OWNER,
      status: 'active'
    });

    // Volt Categories
    const voltCatAudio = await Category.create({
      tenantId: voltTenant._id,
      name: 'Wireless Audio',
      slug: 'audio',
      description: 'High-fidelity planar magnetic headphones and earbuds'
    });

    // Volt Products
    const headphones = await Product.create({
      tenantId: voltTenant._id,
      name: 'Volt Pro Spatial Wireless Headphones',
      slug: 'volt-pro-spatial-wireless-headphones',
      description: '45mm beryllium drivers, active hybrid noise cancellation, 60h battery.',
      price: 299,
      compareAtPrice: 349,
      sku: 'VLT-AUD-001',
      categories: [voltCatAudio._id],
      isFeatured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', isDefault: true, alt: 'Headphones' }
      ],
      options: [{ name: 'Color', values: ['Matte Black', 'Titanium Silver'] }],
      variants: [
        { sku: 'VLT-AUD-BLK', title: 'Matte Black', price: 299, options: { Color: 'Matte Black' }, inventoryQuantity: 25 },
        { sku: 'VLT-AUD-SLV', title: 'Titanium Silver', price: 299, options: { Color: 'Titanium Silver' }, inventoryQuantity: 18 }
      ]
    });
    await Inventory.create({ tenantId: voltTenant._id, productId: headphones._id, sku: 'VLT-AUD-001', availableQuantity: 43 });
    await Inventory.create({ tenantId: voltTenant._id, productId: headphones._id, sku: 'VLT-AUD-BLK', availableQuantity: 25 });
    await Inventory.create({ tenantId: voltTenant._id, productId: headphones._id, sku: 'VLT-AUD-SLV', availableQuantity: 18 });

    // Volt Coupon
    await Coupon.create({
      tenantId: voltTenant._id,
      code: 'TECH10',
      type: 'percentage',
      value: 10,
      minimumOrderValue: 100,
      isActive: true
    });

    logger.info('Database seeding completed successfully!');
    logger.info(`Seeded Tenants:
- Aurora Luxe Fashion: aurora.dtabs.tech (Theme: fashion)
- Volt Audio & Tech: volt.dtabs.tech (Theme: electronics)`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

seed();
