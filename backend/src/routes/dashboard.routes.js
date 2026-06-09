const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getDashboardSummary } = require('../services/dashboard.service');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await getDashboardSummary());
}));

module.exports = router;
