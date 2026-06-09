const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} = require('../services/users.service');
const asyncHandler = require('../utils/asyncHandler');
const {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await listUsers());
}));

router.get('/:id', validate(userIdParamsSchema), asyncHandler(async (req, res) => {
  res.json(await getUser(req.params.id));
}));

router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await createUser(req.body));
}));

router.put('/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  res.json(await updateUser(req.params.id, req.body));
}));

router.delete('/:id', validate(userIdParamsSchema), asyncHandler(async (req, res) => {
  await deleteUser(req.params.id, req.user);
  res.status(204).send();
}));

module.exports = router;
