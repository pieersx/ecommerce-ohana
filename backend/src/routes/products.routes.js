const express = require('express');

const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { serializeProduct } = require('../utils/serializers');
const {
  createProductSchema,
  listProductsSchema,
  productIdParamsSchema,
  updateProductSchema,
} = require('../validators/schemas');

const router = express.Router();

const productListInclude = {
  categoria: {
    select: {
      nombre: true,
    },
  },
};

const productDetailInclude = {
  ...productListInclude,
  escalas_precios: {
    orderBy: {
      cantidad_min: 'asc',
    },
  },
};

function hasOwn(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function parsePositiveInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw httpError(400, `${fieldName} debe ser un entero positivo.`);
  }

  return parsedValue;
}

async function ensureCategoryExists(client, categoryId) {
  const category = await client.categoria.findUnique({
    where: { id_categoria: categoryId },
  });

  if (!category) {
    throw httpError(404, 'La categoría indicada no existe.');
  }
}

router.get('/', validate(listProductsSchema), asyncHandler(async (req, res) => {
  const where = req.query.id_categoria
    ? { id_categoria: parsePositiveInteger(req.query.id_categoria, 'id_categoria') }
    : {};

  const products = await prisma.producto.findMany({
    where,
    include: productListInclude,
    orderBy: { id_producto: 'desc' },
  });

  res.json(products.map(serializeProduct));
}));

router.get('/:id', validate(productIdParamsSchema), asyncHandler(async (req, res) => {
  const productId = parsePositiveInteger(req.params.id, 'id');
  const product = await prisma.producto.findUnique({
    where: { id_producto: productId },
    include: productDetailInclude,
  });

  if (!product) {
    throw httpError(404, 'Producto no encontrado.');
  }

  res.json(serializeProduct(product));
}));

router.post('/', authenticate, requireRole('admin'), validate(createProductSchema), asyncHandler(async (req, res) => {
  const {
    id_categoria,
    nombre,
    descripcion,
    precio_base,
    stock,
    imagen_url,
    escalas_precios,
  } = req.body;

  const product = await prisma.$transaction(async (tx) => {
    await ensureCategoryExists(tx, id_categoria);

    return tx.producto.create({
      data: {
        id_categoria,
        nombre,
        descripcion: descripcion ?? null,
        precio_base,
        stock,
        imagen_url: imagen_url ?? null,
        escalas_precios: escalas_precios.length
          ? {
              create: escalas_precios,
            }
          : undefined,
      },
      include: productDetailInclude,
    });
  });

  res.status(201).json(serializeProduct(product));
}));

router.put('/:id', authenticate, requireRole('admin'), validate(updateProductSchema), asyncHandler(async (req, res) => {
  const productId = parsePositiveInteger(req.params.id, 'id');

  const product = await prisma.$transaction(async (tx) => {
    const currentProduct = await tx.producto.findUnique({
      where: { id_producto: productId },
    });

    if (!currentProduct) {
      throw httpError(404, 'Producto no encontrado.');
    }

    const updatedCategoryId = hasOwn(req.body, 'id_categoria')
      ? parsePositiveInteger(req.body.id_categoria, 'id_categoria')
      : currentProduct.id_categoria;

    if (updatedCategoryId !== null) {
      await ensureCategoryExists(tx, updatedCategoryId);
    }

    return tx.producto.update({
      where: { id_producto: productId },
      data: {
        id_categoria: updatedCategoryId,
        nombre: hasOwn(req.body, 'nombre') ? req.body.nombre : currentProduct.nombre,
        descripcion: hasOwn(req.body, 'descripcion') ? req.body.descripcion : currentProduct.descripcion,
        precio_base: hasOwn(req.body, 'precio_base') ? req.body.precio_base : currentProduct.precio_base,
        stock: hasOwn(req.body, 'stock') ? req.body.stock : currentProduct.stock,
        imagen_url: hasOwn(req.body, 'imagen_url') ? req.body.imagen_url : currentProduct.imagen_url,
        escalas_precios: hasOwn(req.body, 'escalas_precios')
          ? {
              deleteMany: {},
              create: req.body.escalas_precios,
            }
          : undefined,
      },
      include: productDetailInclude,
    });
  });

  res.json(serializeProduct(product));
}));

router.delete('/:id', authenticate, requireRole('admin'), validate(productIdParamsSchema), asyncHandler(async (req, res) => {
  const productId = parsePositiveInteger(req.params.id, 'id');

  try {
    await prisma.producto.delete({
      where: { id_producto: productId },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      throw httpError(404, 'Producto no encontrado.');
    }

    if (error.code === 'P2003') {
      throw httpError(409, 'No se puede eliminar el producto porque tiene pedidos asociados.');
    }

    throw error;
  }
}));

module.exports = router;
