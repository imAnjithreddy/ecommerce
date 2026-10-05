const Inventory = require('./model');
const InventoryTransaction = require('./transaction.model');
const { INVENTORY_TRANSACTION_TYPES } = require('@dtabs/shared');
const { BadRequestError, NotFoundError } = require('../../core/errors/AppError');
const { logger } = require('../../core/logger/logger');

class InventoryService {
  /**
   * Adjusts stock level and records an audit transaction
   */
  async adjustStock({ tenantId, sku, quantity, type, referenceId = '', note = '', actorId = null }) {
    let inventory = await Inventory.findOne({ tenantId, sku });

    if (!inventory) {
      throw new NotFoundError(`Inventory record for SKU ${sku}`);
    }

    const previousQuantity = inventory.availableQuantity;
    const newQuantity = previousQuantity + quantity;

    if (newQuantity < 0) {
      throw new BadRequestError(`Insufficient stock for SKU ${sku}. Available: ${previousQuantity}, Requested: ${Math.abs(quantity)}`);
    }

    inventory.availableQuantity = newQuantity;
    if (type === INVENTORY_TRANSACTION_TYPES.PURCHASE) {
      inventory.soldQuantity += Math.abs(quantity);
    }
    await inventory.save();

    const transaction = await InventoryTransaction.create({
      tenantId,
      sku,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      referenceId,
      note,
      actorId
    });

    logger.info('Inventory adjusted', {
      tenantId,
      sku,
      type,
      quantity,
      newQuantity
    });

    return { inventory, transaction };
  }

  /**
   * Atomic check-and-decrement for cart checkout to prevent overselling
   */
  async deductForOrder({ tenantId, items, orderId, actorId = null }) {
    const deductions = [];

    for (const item of items) {
      // Find and atomically decrement only if availableQuantity >= item.quantity
      const updated = await Inventory.findOneAndUpdate(
        {
          tenantId,
          sku: item.sku,
          availableQuantity: { $gte: item.quantity }
        },
        {
          $inc: {
            availableQuantity: -item.quantity,
            soldQuantity: item.quantity
          }
        },
        { new: true }
      );

      if (!updated) {
        // Rollback any earlier deductions from this order
        for (const done of deductions) {
          await Inventory.findOneAndUpdate(
            { tenantId, sku: done.sku },
            {
              $inc: {
                availableQuantity: done.quantity,
                soldQuantity: -done.quantity
              }
            }
          );
        }
        throw new BadRequestError(`Out of stock for item '${item.name}' (SKU: ${item.sku})`);
      }

      deductions.push({ sku: item.sku, quantity: item.quantity });

      // Record transaction
      await InventoryTransaction.create({
        tenantId,
        sku: item.sku,
        type: INVENTORY_TRANSACTION_TYPES.PURCHASE,
        quantity: -item.quantity,
        previousQuantity: updated.availableQuantity + item.quantity,
        newQuantity: updated.availableQuantity,
        referenceId: orderId.toString(),
        note: `Order ${orderId}`,
        actorId
      });
    }

    return true;
  }

  /**
   * Restores inventory upon cancellation or return
   */
  async restoreForOrder({ tenantId, items, orderId, type = INVENTORY_TRANSACTION_TYPES.CANCELLATION, actorId = null }) {
    for (const item of items) {
      const updated = await Inventory.findOneAndUpdate(
        { tenantId, sku: item.sku },
        {
          $inc: {
            availableQuantity: item.quantity,
            soldQuantity: -item.quantity
          }
        },
        { new: true }
      );

      if (updated) {
        await InventoryTransaction.create({
          tenantId,
          sku: item.sku,
          type,
          quantity: item.quantity,
          previousQuantity: updated.availableQuantity - item.quantity,
          newQuantity: updated.availableQuantity,
          referenceId: orderId.toString(),
          note: `Restocked from order ${orderId}`,
          actorId
        });
      }
    }
  }
}

module.exports = new InventoryService();
