const express = require('express');
const router = express.Router();
const adminController = require('./controller');
const productController = require('../products/controller');
const categoryController = require('../categories/controller');
const tenantController = require('../tenants/controller');
const paymentService = require('../payments/payment.service');
const ApiResponse = require('../../core/response/ApiResponse');
const { authenticate } = require('../../middleware/auth.middleware');
const { resolveTenant } = require('../../middleware/tenant.middleware');
const { requireTenantMembership } = require('../../middleware/role.middleware');
const { PERMISSIONS } = require('@dtabs/shared');

// Enforce auth, resolved tenant, and store membership for all admin endpoints
router.use(authenticate);
router.use(resolveTenant({ required: true }));
router.use(requireTenantMembership());

// Executive Dashboard & Overview
router.get('/dashboard', adminController.getDashboardMetrics);

// Product Catalog
router.get('/products', productController.listAdminProducts);
router.get('/products/:id', productController.getAdminProductById);
router.post('/products', requireTenantMembership(PERMISSIONS.PRODUCTS_CREATE), productController.createProduct);
router.patch('/products/:id', requireTenantMembership(PERMISSIONS.PRODUCTS_UPDATE), productController.updateProduct);
router.delete('/products/:id', requireTenantMembership(PERMISSIONS.PRODUCTS_DELETE), productController.deleteProduct);

// Categories
router.get('/categories', categoryController.listCategories);
router.post('/categories', requireTenantMembership(PERMISSIONS.PRODUCTS_CREATE), categoryController.createCategory);
router.patch('/categories/:id', requireTenantMembership(PERMISSIONS.PRODUCTS_UPDATE), categoryController.updateCategory);
router.delete('/categories/:id', requireTenantMembership(PERMISSIONS.PRODUCTS_DELETE), categoryController.deleteCategory);

// Orders
router.get('/orders', requireTenantMembership(PERMISSIONS.ORDERS_READ), adminController.listOrders);
router.get('/orders/:id', requireTenantMembership(PERMISSIONS.ORDERS_READ), adminController.getOrderById);
router.patch('/orders/:id/status', requireTenantMembership(PERMISSIONS.ORDERS_UPDATE), adminController.updateOrderStatus);

// Order Refund
router.post('/orders/:id/refund', requireTenantMembership(PERMISSIONS.ORDERS_UPDATE), async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const result = await paymentService.processRefund({
      tenantId: req.tenantId,
      orderId: req.params.id,
      amount,
      reason
    });
    return ApiResponse.success(res, result, 'Refund processed successfully');
  } catch (error) {
    next(error);
  }
});

// Inventory
router.get('/inventory', requireTenantMembership(PERMISSIONS.INVENTORY_READ), adminController.listInventory);
router.post('/inventory/adjust', requireTenantMembership(PERMISSIONS.INVENTORY_UPDATE), adminController.adjustInventory);

// Customers
router.get('/customers', requireTenantMembership(PERMISSIONS.CUSTOMERS_READ), adminController.listCustomers);

// Theme & Settings
router.patch('/theme', requireTenantMembership(PERMISSIONS.THEMES_UPDATE), tenantController.updateTheme);
router.patch('/settings', requireTenantMembership(PERMISSIONS.SETTINGS_UPDATE), tenantController.updateSettings);
router.post('/domains', requireTenantMembership(PERMISSIONS.SETTINGS_UPDATE), tenantController.addCustomDomain);

module.exports = router;
