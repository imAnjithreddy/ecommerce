const express = require('express');
const router = express.Router();
const paymentService = require('./payment.service');
const ApiResponse = require('../../core/response/ApiResponse');

// Webhook listener for payment providers (Stripe, Dodo, Mock)
router.post('/webhooks/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const signature = req.headers['stripe-signature'] ||
                      req.headers['x-dodo-signature'] ||
                      req.headers['x-webhook-signature'] || '';

    const result = await paymentService.processWebhook({
      providerName: provider,
      payload: req.body,
      signature
    });

    return ApiResponse.success(res, result, 'Webhook processed');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
