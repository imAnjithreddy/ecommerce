const Product = require('../products/model');
const Category = require('../categories/model');
const Review = require('../reviews/model');
const Inventory = require('../inventory/model');
const Order = require('../orders/model');
const cartService = require('../cart/service');
const orderService = require('../orders/service');
const paymentService = require('../payments/payment.service');
const ApiResponse = require('../../core/response/ApiResponse');
const { getPaginationParams } = require('../../core/pagination/pagination');
const { NotFoundError, BadRequestError } = require('../../core/errors/AppError');

class StorefrontController {
  /**
   * Get store profile and theme configuration
   */
  async getStoreInfo(req, res, next) {
    try {
      return ApiResponse.success(res, {
        tenantId: req.tenant._id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        theme: req.tenant.theme,
        settings: req.tenant.settings,
        domains: req.tenant.domains
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Browse products with filtering, searching, and sorting
   */
  async listProducts(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const { category, search, minPrice, maxPrice, sort = 'newest', featured } = req.query;

      const query = {
        tenantId: req.tenantId,
        status: 'active',
        isDeleted: false
      };

      if (category) {
        const cat = await Category.findOne({ tenantId: req.tenantId, slug: category });
        if (cat) {
          query.categories = cat._id;
        }
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (featured === 'true') {
        query.isFeatured = true;
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      const sortOptions = {};
      if (sort === 'price_asc') sortOptions.price = 1;
      else if (sort === 'price_desc') sortOptions.price = -1;
      else if (sort === 'name_asc') sortOptions.name = 1;
      else sortOptions.createdAt = -1; // Default: newest

      const [products, totalItems] = await Promise.all([
        Product.find(query)
          .select('name slug price compareAtPrice images options variants isFeatured createdAt')
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);

      return ApiResponse.paginated(res, products, { page, limit, totalItems });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product details by slug with inventory and approved reviews
   */
  async getProductBySlug(req, res, next) {
    try {
      const product = await Product.findOne({
        slug: req.params.slug,
        tenantId: req.tenantId,
        status: 'active',
        isDeleted: false
      }).populate('categories', 'name slug');

      if (!product) {
        throw new NotFoundError('Product');
      }

      // Fetch inventory availability
      const skus = [product.sku, ...product.variants.map(v => v.sku)];
      const inventories = await Inventory.find({
        tenantId: req.tenantId,
        sku: { $in: skus }
      }).select('sku availableQuantity lowStockThreshold').lean();

      const inventoryMap = {};
      inventories.forEach(inv => {
        inventoryMap[inv.sku] = {
          inStock: inv.availableQuantity > 0,
          quantity: inv.availableQuantity
        };
      });

      // Fetch approved reviews
      const reviews = await Review.find({
        tenantId: req.tenantId,
        productId: product._id,
        status: 'approved'
      }).sort({ createdAt: -1 }).limit(20).lean();

      return ApiResponse.success(res, {
        product,
        inventory: inventoryMap,
        reviews
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List storefront categories
   */
  async listCategories(req, res, next) {
    try {
      const categories = await Category.find({
        tenantId: req.tenantId,
        isActive: true
      }).select('name slug description image parentId').lean();

      return ApiResponse.success(res, categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cart Operations
   */
  async getCart(req, res, next) {
    try {
      const sessionId = req.headers['x-cart-session'] || req.query.sessionId;
      const customerId = req.user ? req.user._id : null;

      const cart = await cartService.getOrCreateCart({
        tenantId: req.tenantId,
        sessionId,
        customerId
      });

      return ApiResponse.success(res, cart);
    } catch (error) {
      next(error);
    }
  }

  async addToCart(req, res, next) {
    try {
      const sessionId = req.headers['x-cart-session'] || req.body.sessionId;
      const customerId = req.user ? req.user._id : null;
      const { productId, variantId, quantity = 1 } = req.body;

      const cart = await cartService.addItem({
        tenantId: req.tenantId,
        sessionId,
        customerId,
        productId,
        variantId,
        quantity: Number(quantity)
      });

      return ApiResponse.success(res, cart, 'Item added to cart');
    } catch (error) {
      next(error);
    }
  }

  async updateCartItem(req, res, next) {
    try {
      const sessionId = req.headers['x-cart-session'] || req.body.sessionId;
      const customerId = req.user ? req.user._id : null;
      const { itemId } = req.params;
      const { quantity } = req.body;

      const cart = await cartService.updateItemQuantity({
        tenantId: req.tenantId,
        sessionId,
        customerId,
        itemId,
        quantity: Number(quantity)
      });

      return ApiResponse.success(res, cart);
    } catch (error) {
      next(error);
    }
  }

  async removeCartItem(req, res, next) {
    try {
      const sessionId = req.headers['x-cart-session'] || req.query.sessionId;
      const customerId = req.user ? req.user._id : null;
      const { itemId } = req.params;

      const cart = await cartService.removeItem({
        tenantId: req.tenantId,
        sessionId,
        customerId,
        itemId
      });

      return ApiResponse.success(res, cart, 'Item removed');
    } catch (error) {
      next(error);
    }
  }

  async applyCoupon(req, res, next) {
    try {
      const sessionId = req.headers['x-cart-session'] || req.body.sessionId;
      const customerId = req.user ? req.user._id : null;
      const { code } = req.body;

      if (!code) {
        throw new BadRequestError('Coupon code is required');
      }

      const result = await cartService.applyCoupon({
        tenantId: req.tenantId,
        sessionId,
        customerId,
        code
      });

      return ApiResponse.success(res, result, 'Coupon applied successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Checkout & Order Placement
   */
  async checkout(req, res, next) {
    try {
      const {
        cartId,
        customerDetails,
        shippingAddress,
        billingAddress,
        paymentMethod = 'mock',
        idempotencyKey
      } = req.body;

      if (!cartId || !customerDetails || !shippingAddress) {
        throw new BadRequestError('cartId, customerDetails, and shippingAddress are required');
      }

      // Create frozen order with server-calculated prices
      const order = await orderService.createFromCart({
        tenantId: req.tenantId,
        cartId,
        customerId: req.user ? req.user._id : null,
        customerDetails,
        shippingAddress,
        billingAddress,
        paymentMethod
      });

      // Initiate payment intent via provider abstraction
      const paymentResult = await paymentService.initiatePayment({
        tenantId: req.tenantId,
        orderId: order._id,
        providerName: paymentMethod,
        idempotencyKey
      });

      return ApiResponse.created(res, {
        order,
        payment: paymentResult
      }, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit product review
   */
  async submitReview(req, res, next) {
    try {
      const { productId, rating, comment, title, customerName, email } = req.body;

      if (!productId || !rating || !comment || !customerName) {
        throw new BadRequestError('productId, rating, comment, and customerName are required');
      }

      // Check if verified purchase
      let isVerifiedPurchase = false;
      if (email) {
        const pastOrder = await Order.findOne({
          tenantId: req.tenantId,
          'customerDetails.email': email.toLowerCase(),
          'items.productId': productId,
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        });
        if (pastOrder) isVerifiedPurchase = true;
      }

      const review = await Review.create({
        tenantId: req.tenantId,
        productId,
        customerName: customerName.trim(),
        rating: Number(rating),
        title: title ? title.trim() : '',
        comment: comment.trim(),
        isVerifiedPurchase,
        status: 'approved' // Auto-approved for frictionless demo
      });

      return ApiResponse.created(res, review, 'Review submitted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StorefrontController();
