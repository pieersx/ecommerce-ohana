const express = require('express');

const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createExternalCheckout } = require('../services/payments.service');
const asyncHandler = require('../utils/asyncHandler');
const { createPaymentCheckoutSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.post('/checkout', validate(createPaymentCheckoutSchema), asyncHandler(async (req, res) => {
  const checkout = await createExternalCheckout({
    orderId: req.body.id_pedido,
    user: req.user,
    successUrl: req.body.success_url,
    cancelUrl: req.body.cancel_url,
  });

  res.status(201).json(checkout);
}));

module.exports = router;
