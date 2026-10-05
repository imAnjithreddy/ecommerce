const express = require('express');
const router = express.Router();
const storefrontController = require('./controller');
const { resolveTenant } = require('../../middleware/tenant.middleware');
const { optionalAuthenticate } = require('../../middleware/auth.middleware');

// All storefront routes require a resolved tenant context
router.use(resolveTenant({ required: true }));
router.use(optionalAuthenticate);

// Store & Theme Info
router.get('/info', storefrontController.getStoreInfo);

// Catalog
router.get('/products', storefrontController.listProducts);
router.get('/products/:slug', storefrontController.getProductBySlug);
router.get('/categories', storefrontController.listCategories);

// Cart
router.get('/cart', storefrontController.getCart);
router.post('/cart/items', storefrontController.addToCart);
router.patch('/cart/items/:itemId', storefrontController.updateCartItem);
router.delete('/cart/items/:itemId', storefrontController.removeCartItem);
router.post('/cart/coupon', storefrontController.applyCoupon);

// Checkout
router.post('/checkout', storefrontController.checkout);

// Reviews
router.post('/reviews', storefrontController.submitReview);

module.exports = router;
