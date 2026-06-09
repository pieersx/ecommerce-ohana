const prisma = require('../config/prisma');
const httpError = require('../utils/httpError');
const { serializeProduct } = require('../utils/serializers');

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

async function listProducts(query = {}) {
  const where = query.id_categoria
    ? { id_categoria: parsePositiveInteger(query.id_categoria, 'id_categoria') }
    : {};

  const products = await prisma.producto.findMany({
    where,
    include: productListInclude,
    orderBy: { id_producto: 'desc' },
  });

  return products.map(serializeProduct);
}

async function getProduct(productId) {
  const product = await prisma.producto.findUnique({
    where: { id_producto: parsePositiveInteger(productId, 'id') },
    include: productDetailInclude,
  });

  if (!product) {
    throw httpError(404, 'Producto no encontrado.');
  }

  return serializeProduct(product);
}

async function createProduct(body) {
  const product = await prisma.$transaction(async (tx) => {
    await ensureCategoryExists(tx, body.id_categoria);

    return tx.producto.create({
      data: {
        id_categoria: body.id_categoria,
        nombre: body.nombre,
        descripcion: body.descripcion ?? null,
        precio_base: body.precio_base,
        stock: body.stock,
        imagen_url: body.imagen_url ?? null,
        escalas_precios: body.escalas_precios.length
          ? { create: body.escalas_precios }
          : undefined,
      },
      include: productDetailInclude,
    });
  });

  return serializeProduct(product);
}

async function updateProduct(productId, body) {
  const parsedProductId = parsePositiveInteger(productId, 'id');

  const product = await prisma.$transaction(async (tx) => {
    const currentProduct = await tx.producto.findUnique({
      where: { id_producto: parsedProductId },
    });

    if (!currentProduct) {
      throw httpError(404, 'Producto no encontrado.');
    }

    const updatedCategoryId = hasOwn(body, 'id_categoria')
      ? parsePositiveInteger(body.id_categoria, 'id_categoria')
      : currentProduct.id_categoria;

    if (updatedCategoryId !== null) {
      await ensureCategoryExists(tx, updatedCategoryId);
    }

    return tx.producto.update({
      where: { id_producto: parsedProductId },
      data: {
        id_categoria: updatedCategoryId,
        nombre: hasOwn(body, 'nombre') ? body.nombre : currentProduct.nombre,
        descripcion: hasOwn(body, 'descripcion') ? body.descripcion : currentProduct.descripcion,
        precio_base: hasOwn(body, 'precio_base') ? body.precio_base : currentProduct.precio_base,
        stock: hasOwn(body, 'stock') ? body.stock : currentProduct.stock,
        imagen_url: hasOwn(body, 'imagen_url') ? body.imagen_url : currentProduct.imagen_url,
        escalas_precios: hasOwn(body, 'escalas_precios')
          ? {
              deleteMany: {},
              create: body.escalas_precios,
            }
          : undefined,
      },
      include: productDetailInclude,
    });
  });

  return serializeProduct(product);
}

async function deleteProduct(productId) {
  try {
    await prisma.producto.delete({
      where: { id_producto: parsePositiveInteger(productId, 'id') },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw httpError(404, 'Producto no encontrado.');
    }

    if (error.code === 'P2003') {
      throw httpError(409, 'No se puede eliminar el producto porque tiene pedidos asociados.');
    }

    throw error;
  }
}

module.exports = {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
};
