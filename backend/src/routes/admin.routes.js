const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../config/prisma');
const { serializeReview } = require('../utils/serializers');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/reviews', asyncHandler(async (req, res) => {
  const { id_producto, rating, page = 1, limit = 20 } = req.query;

  const where = {};

  if (id_producto) {
    where.id_producto = Number(id_producto);
  }

  if (rating) {
    where.rating = Number(rating);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    prisma.resenaProducto.findMany({
      where,
      include: {
        usuario: { select: { nombre_completo: true } },
        producto: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.resenaProducto.count({ where }),
  ]);

  res.json({
    reviews: reviews.map((r) => ({
      ...serializeReview(r),
      producto_nombre: r.producto?.nombre ?? null,
    })),
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
}));

module.exports = router;
