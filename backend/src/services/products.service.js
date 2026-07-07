const prisma = require('../config/prisma');
const httpError = require('../utils/httpError');
const { serializeProduct, serializeReview } = require('../utils/serializers');

const productListInclude = {
  categoria: {
    select: {
      nombre: true,
    },
  },
  imagenes: {
    orderBy: [
      { orden: 'asc' },
      { id_imagen: 'asc' },
    ],
  },
};

const productDetailInclude = {
  ...productListInclude,
  escalas_precios: {
    orderBy: {
      cantidad_min: 'asc',
    },
  },
  opciones: {
    orderBy: [
      { tipo: 'asc' },
      { orden: 'asc' },
      { id_opcion: 'asc' },
    ],
  },
  resenas: {
    include: {
      usuario: {
        select: {
          nombre_completo: true,
        },
      },
    },
    orderBy: {
      fecha: 'desc',
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
  const where = {
    activo: true,
    ...(query.id_categoria
      ? { id_categoria: parsePositiveInteger(query.id_categoria, 'id_categoria') }
      : {}),
    ...(query.destacado === 'true' ? { destacado: true } : {}),
    ...(query.stock === 'available' ? { stock: { gt: 0 } } : {}),
    ...(query.q
      ? {
          OR: [
            { nombre: { contains: query.q, mode: 'insensitive' } },
            { descripcion: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderByMap = {
    precio_asc: [{ precio_oferta: 'asc' }, { precio_base: 'asc' }],
    precio_desc: [{ precio_oferta: 'desc' }, { precio_base: 'desc' }],
    vendidos: [{ ventas_totales: 'desc' }, { rating_promedio: 'desc' }],
    rating: [{ rating_promedio: 'desc' }, { total_resenas: 'desc' }],
    nuevos: [{ id_producto: 'desc' }],
    recomendados: [{ destacado: 'desc' }, { ventas_totales: 'desc' }, { rating_promedio: 'desc' }],
  };

  const products = await prisma.producto.findMany({
    where,
    include: productListInclude,
    orderBy: orderByMap[query.sort] || orderByMap.recomendados,
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
        precio_oferta: body.precio_oferta ?? null,
        stock: body.stock,
        imagen_url: body.imagen_url ?? null,
        activo: body.activo ?? true,
        destacado: body.destacado ?? false,
        etiqueta_badge: body.etiqueta_badge ?? null,
        escalas_precios: body.escalas_precios.length
          ? { create: body.escalas_precios }
          : undefined,
        imagenes: body.imagenes?.length
          ? { create: body.imagenes }
          : undefined,
        opciones: body.opciones?.length
          ? { create: body.opciones }
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
        precio_oferta: hasOwn(body, 'precio_oferta') ? body.precio_oferta : currentProduct.precio_oferta,
        stock: hasOwn(body, 'stock') ? body.stock : currentProduct.stock,
        imagen_url: hasOwn(body, 'imagen_url') ? body.imagen_url : currentProduct.imagen_url,
        activo: hasOwn(body, 'activo') ? body.activo : currentProduct.activo,
        destacado: hasOwn(body, 'destacado') ? body.destacado : currentProduct.destacado,
        etiqueta_badge: hasOwn(body, 'etiqueta_badge') ? body.etiqueta_badge : currentProduct.etiqueta_badge,
        escalas_precios: hasOwn(body, 'escalas_precios')
          ? {
              deleteMany: {},
              create: body.escalas_precios,
            }
          : undefined,
        imagenes: hasOwn(body, 'imagenes')
          ? {
              deleteMany: {},
              create: body.imagenes,
            }
          : undefined,
        opciones: hasOwn(body, 'opciones')
          ? {
              deleteMany: {},
              create: body.opciones,
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

async function listProductReviews(productId) {
  const parsedProductId = parsePositiveInteger(productId, 'id');

  const reviews = await prisma.resenaProducto.findMany({
    where: { id_producto: parsedProductId },
    include: {
      usuario: {
        select: {
          nombre_completo: true,
        },
      },
    },
    orderBy: { fecha: 'desc' },
  });

  return reviews.map(serializeReview);
}

async function refreshProductRating(client, productId) {
  const rating = await client.resenaProducto.aggregate({
    where: { id_producto: productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await client.producto.update({
    where: { id_producto: productId },
    data: {
      rating_promedio: Number((rating._avg.rating || 0).toFixed(2)),
      total_resenas: rating._count.rating,
    },
  });
}

async function createProductReview(productId, body, user) {
  if (user.rol !== 'cliente') {
    throw httpError(403, 'Solo los clientes pueden escribir reseñas.');
  }

  const parsedProductId = parsePositiveInteger(productId, 'id');

  const purchasedLine = await prisma.detallePedido.findFirst({
    where: {
      id_producto: parsedProductId,
      pedido: {
        id_usuario: user.id_usuario,
      },
    },
    include: {
      pedido: true,
    },
    orderBy: {
      id_detalle: 'desc',
    },
  });

  if (!purchasedLine) {
    throw httpError(403, 'Solo puedes reseñar productos previamente comprados.');
  }

  const review = await prisma.$transaction(async (tx) => {
    const createdReview = await tx.resenaProducto.upsert({
      where: {
        id_producto_id_usuario: {
          id_producto: parsedProductId,
          id_usuario: user.id_usuario,
        },
      },
      create: {
        id_producto: parsedProductId,
        id_usuario: user.id_usuario,
        id_pedido: purchasedLine.id_pedido,
        rating: body.rating,
        comentario: body.comentario,
        compra_verificada: true,
      },
      update: {
        id_pedido: purchasedLine.id_pedido,
        rating: body.rating,
        comentario: body.comentario,
        compra_verificada: true,
        fecha: new Date(),
      },
      include: {
        usuario: {
          select: {
            nombre_completo: true,
          },
        },
      },
    });

    await refreshProductRating(tx, parsedProductId);
    return createdReview;
  });

  return serializeReview(review);
}

module.exports = {
  createProductReview,
  createProduct,
  deleteProduct,
  getProduct,
  listProductReviews,
  listProducts,
  updateProduct,
};
