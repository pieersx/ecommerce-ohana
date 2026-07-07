const express = require('express');

const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createOrder,
  createOrderMessage,
  deleteOrder,
  getOrder,
  listOrders,
  removeOrderDetail,
  updateOrder,
} = require('../services/orders.service');
const { assertCanDownloadReceipt, writeReceiptPdf } = require('../services/receipts.service');
const asyncHandler = require('../utils/asyncHandler');
const {
  createOrderSchema,
  createOrderMessageSchema,
  deleteOrderDetailSchema,
  orderIdParamsSchema,
  updateOrderSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await listOrders(req.user));
}));

router.get('/:id/receipt.pdf', validate(orderIdParamsSchema), asyncHandler(async (req, res) => {
  const order = await getOrder(req.params.id, req.user);
  assertCanDownloadReceipt(order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=\"boleta-ohana-${order.id_pedido}.pdf\"`);
  writeReceiptPdf(order, res);
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

router.post('/:id/messages', validate(createOrderMessageSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await createOrderMessage(req.params.id, req.body, req.user));
}));

router.delete('/:orderId/details/:detailId', validate(deleteOrderDetailSchema), asyncHandler(async (req, res) => {
  res.json(await removeOrderDetail(req.params.orderId, req.params.detailId, req.user));
}));

router.delete('/:id', validate(orderIdParamsSchema), asyncHandler(async (req, res) => {
  const result = await deleteOrder(req.params.id, req.user);
  res.json(result);
}));

module.exports = router;
