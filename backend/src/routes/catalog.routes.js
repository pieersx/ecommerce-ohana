const express = require('express');

const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { serializeCategory, serializeDistrict } = require('../utils/serializers');

const router = express.Router();

router.get('/categories', asyncHandler(async (_req, res) => {
  const categories = await prisma.categoria.findMany({
    orderBy: { nombre: 'asc' },
  });

  res.json(categories.map(serializeCategory));
}));

router.get('/districts', asyncHandler(async (_req, res) => {
  const districts = await prisma.distrito.findMany({
    orderBy: { nombre: 'asc' },
  });

  res.json(districts.map(serializeDistrict));
}));

module.exports = router;
