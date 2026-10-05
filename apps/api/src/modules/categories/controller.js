const Category = require('./model');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');
const { slugify } = require('@dtabs/shared');

class CategoryController {
  async listCategories(req, res, next) {
    try {
      const categories = await Category.find({
        tenantId: req.tenantId,
        isActive: true
      }).sort({ name: 1 }).lean();

      return ApiResponse.success(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const { name, slug: customSlug, description, image, parentId } = req.body;

      if (!name) {
        throw new BadRequestError('Category name is required');
      }

      const slug = slugify(customSlug || name);

      const existing = await Category.findOne({ tenantId: req.tenantId, slug });
      if (existing) {
        throw new BadRequestError(`Category '${slug}' already exists in this store`);
      }

      const category = await Category.create({
        tenantId: req.tenantId,
        name: name.trim(),
        slug,
        description: description || '',
        image: image || '',
        parentId: parentId || null
      });

      return ApiResponse.created(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await Category.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      if (req.body.name) category.name = req.body.name.trim();
      if (req.body.description !== undefined) category.description = req.body.description;
      if (req.body.image !== undefined) category.image = req.body.image;
      if (req.body.parentId !== undefined) category.parentId = req.body.parentId;
      if (req.body.isActive !== undefined) category.isActive = req.body.isActive;

      await category.save();
      return ApiResponse.success(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const category = await Category.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.tenantId
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      return ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
