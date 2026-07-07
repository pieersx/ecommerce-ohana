const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createProductReview,
  createProduct,
  deleteProduct,
  getProduct,
  listProductReviews,
  listProducts,
  updateProduct,
} = require('../services/products.service');
const asyncHandler = require('../utils/asyncHandler');
const {
  createProductSchema,
  createReviewSchema,
  listProductsSchema,
  productIdParamsSchema,
  updateProductSchema,
} = require('../validators/schemas');

const router = express.Router();

router.get('/', validate(listProductsSchema), asyncHandler(async (req, res) => {
  res.json(await listProducts(req.query));
}));

router.get('/:id', validate(productIdParamsSchema), asyncHandler(async (req, res) => {
  res.json(await getProduct(req.params.id));
}));

router.get('/:id/reviews', validate(productIdParamsSchema), asyncHandler(async (req, res) => {
  res.json(await listProductReviews(req.params.id));
}));

router.post('/:id/reviews', authenticate, validate(createReviewSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await createProductReview(req.params.id, req.body, req.user));
}));

router.post('/', authenticate, requireRole('admin'), validate(createProductSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await createProduct(req.body));
}));

router.put('/:id', authenticate, requireRole('admin'), validate(updateProductSchema), asyncHandler(async (req, res) => {
  res.json(await updateProduct(req.params.id, req.body));
}));

router.delete('/:id', authenticate, requireRole('admin'), validate(productIdParamsSchema), asyncHandler(async (req, res) => {
  await deleteProduct(req.params.id);
  res.status(204).send();
}));

module.exports = router;
