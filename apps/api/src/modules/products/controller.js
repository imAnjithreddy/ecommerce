const Product = require('./model');
const Inventory = require('../inventory/model');
const InventoryTransaction = require('../inventory/transaction.model');
const AuditLog = require('../audit/audit.model');
const ApiResponse = require('../../core/response/ApiResponse');
const { getPaginationParams } = require('../../core/pagination/pagination');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');
const { slugify, AUDIT_ACTIONS, INVENTORY_TRANSACTION_TYPES } = require('@dtabs/shared');

class ProductController {
  /**
   * Admin: List products for current tenant
   */
  async listAdminProducts(req, res, next) {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      const { search, category, status } = req.query;

      const query = { tenantId: req.tenantId, isDeleted: false };

      if (status) {
        query.status = status;
      }
      if (category) {
        query.categories = category;
      }
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      const [products, totalItems] = await Promise.all([
        Product.find(query)
          .populate('categories', 'name slug')
          .sort({ createdAt: -1 })
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
   * Admin: Get single product by ID (strictly tenant-scoped)
   */
  async getAdminProductById(req, res, next) {
    try {
      const product = await Product.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
        isDeleted: false
      }).populate('categories', 'name slug');

      if (!product) {
        throw new NotFoundError('Product');
      }

      // Fetch corresponding inventory records
      const skus = [product.sku, ...product.variants.map(v => v.sku)];
      const inventoryList = await Inventory.find({
        tenantId: req.tenantId,
        sku: { $in: skus }
      }).lean();

      return ApiResponse.success(res, {
        product,
        inventory: inventoryList
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Create new product and synchronize inventory ledger
   */
  async createProduct(req, res, next) {
    try {
      const {
        name,
        slug: customSlug,
        description,
        price,
        compareAtPrice,
        sku,
        categories = [],
        options = [],
        variants = [],
        images = [],
        initialStock = 0,
        status = 'active',
        seo = {},
        isFeatured = false
      } = req.body;

      if (!name || price === undefined || !sku) {
        throw new BadRequestError('Name, price, and base SKU are required');
      }

      const slug = slugify(customSlug || name);

      // Verify slug uniqueness within this tenant
      const existingSlug = await Product.findOne({ tenantId: req.tenantId, slug });
      if (existingSlug) {
        throw new BadRequestError(`Product with slug '${slug}' already exists in your store`);
      }

      const product = await Product.create({
        tenantId: req.tenantId,
        name: name.trim(),
        slug,
        description: description || '',
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        sku: sku.trim(),
        categories,
        options,
        variants,
        images,
        status,
        seo,
        isFeatured
      });

      // Create base SKU inventory
      await Inventory.create({
        tenantId: req.tenantId,
        productId: product._id,
        sku: sku.trim(),
        availableQuantity: Number(initialStock) || 0
      });

      if (Number(initialStock) > 0) {
        await InventoryTransaction.create({
          tenantId: req.tenantId,
          sku: sku.trim(),
          type: INVENTORY_TRANSACTION_TYPES.RESTOCK,
          quantity: Number(initialStock),
          previousQuantity: 0,
          newQuantity: Number(initialStock),
          note: 'Initial product stock on creation',
          actorId: req.user._id
        });
      }

      // Create variant inventories if any
      for (const variant of product.variants) {
        const variantQty = Number(variant.inventoryQuantity) || 0;
        await Inventory.create({
          tenantId: req.tenantId,
          productId: product._id,
          variantId: variant._id,
          sku: variant.sku.trim(),
          availableQuantity: variantQty
        });

        if (variantQty > 0) {
          await InventoryTransaction.create({
            tenantId: req.tenantId,
            sku: variant.sku.trim(),
            type: INVENTORY_TRANSACTION_TYPES.RESTOCK,
            quantity: variantQty,
            previousQuantity: 0,
            newQuantity: variantQty,
            note: `Initial stock for variant ${variant.title || variant.sku}`,
            actorId: req.user._id
          });
        }
      }

      await AuditLog.create({
        tenantId: req.tenantId,
        actorId: req.user._id,
        action: AUDIT_ACTIONS.PRODUCT_CREATED,
        resource: 'Product',
        resourceId: product._id.toString(),
        metadata: { name: product.name, sku: product.sku }
      });

      return ApiResponse.created(res, product, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update product (Strictly tenant-scoped)
   */
  async updateProduct(req, res, next) {
    try {
      const product = await Product.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
        isDeleted: false
      });

      if (!product) {
        throw new NotFoundError('Product');
      }

      const updatableFields = [
        'name', 'description', 'price', 'compareAtPrice',
        'categories', 'options', 'variants', 'images', 'status', 'seo', 'isFeatured'
      ];

      for (const field of updatableFields) {
        if (req.body[field] !== undefined) {
          product[field] = req.body[field];
        }
      }

      if (req.body.name && !req.body.slug) {
        product.slug = slugify(req.body.name);
      } else if (req.body.slug) {
        product.slug = slugify(req.body.slug);
      }

      await product.save();

      await AuditLog.create({
        tenantId: req.tenantId,
        actorId: req.user._id,
        action: AUDIT_ACTIONS.PRODUCT_UPDATED,
        resource: 'Product',
        resourceId: product._id.toString(),
        metadata: req.body
      });

      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Soft-delete product (Strictly tenant-scoped)
   */
  async deleteProduct(req, res, next) {
    try {
      const product = await Product.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
        isDeleted: false
      });

      if (!product) {
        throw new NotFoundError('Product');
      }

      product.isDeleted = true;
      product.status = 'archived';
      await product.save();

      await AuditLog.create({
        tenantId: req.tenantId,
        actorId: req.user._id,
        action: AUDIT_ACTIONS.PRODUCT_DELETED,
        resource: 'Product',
        resourceId: product._id.toString()
      });

      return ApiResponse.success(res, null, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
