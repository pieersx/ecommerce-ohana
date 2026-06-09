const express = require('express');

const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
} = require('../services/orders.service');
const asyncHandler = require('../utils/asyncHandler');
const {
  createOrderSchema,
  orderIdParamsSchema,
  updateOrderSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await listOrders(req.user));
}));

router.get('/:id', validate(orderIdParamsSchema), asyncHandler(async (req, res) => {
  res.json(await getOrder(req.params.id, req.user));
}));

router.post('/', validate(createOrderSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await createOrder(req.body, req.user));
}));

router.put('/:id', validate(updateOrderSchema), asyncHandler(async (req, res) => {
  res.json(await updateOrder(req.params.id, req.body, req.user));
}));

router.delete('/:id', validate(orderIdParamsSchema), asyncHandler(async (req, res) => {
  await deleteOrder(req.params.id, req.user);
  res.status(204).send();
}));

module.exports = router;
