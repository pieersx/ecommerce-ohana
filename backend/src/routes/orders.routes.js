const express = require('express');

const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const {
  decimalToNumber,
  serializeOrder,
  serializeOrderSummary,
} = require('../utils/serializers');
const {
  createOrderSchema,
  orderIdParamsSchema,
  updateOrderSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

const orderListInclude = {
  usuario: {
    select: {
      nombre_completo: true,
      email: true,
    },
  },
  distrito: {
    select: {
      nombre: true,
      costo_delivery: true,
    },
  },
};

const orderDetailInclude = {
  ...orderListInclude,
  detalles: {
    include: {
      producto: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: {
      id_detalle: 'asc',
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

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

async function getOrderById(orderId) {
  return prisma.pedido.findUnique({
    where: { id_pedido: orderId },
    include: orderDetailInclude,
  });
}

async function calculateOrderLines(client, detalles) {
  const lines = [];
  let totalProductos = 0;

  for (const detalle of detalles) {
    const idProducto = parsePositiveInteger(detalle.id_producto, 'id_producto');
    const cantidad = parsePositiveInteger(detalle.cantidad, 'cantidad');

    const product = await client.producto.findUnique({
      where: { id_producto: idProducto },
      include: {
        escalas_precios: {
          where: {
            cantidad_min: { lte: cantidad },
          },
          orderBy: {
            cantidad_min: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!product) {
      throw httpError(404, `No existe el producto con id ${idProducto}.`);
    }

    if (product.stock < cantidad) {
      throw httpError(400, `Stock insuficiente para ${product.nombre}.`);
    }

    const updateResult = await client.producto.updateMany({
      where: {
        id_producto: idProducto,
        stock: { gte: cantidad },
      },
      data: {
        stock: { decrement: cantidad },
      },
    });

    if (!updateResult.count) {
      throw httpError(400, `Stock insuficiente para ${product.nombre}.`);
    }

    const precioUnitario = decimalToNumber(
      product.escalas_precios[0]?.precio_unitario ?? product.precio_base,
    );
    const subtotal = roundMoney(precioUnitario * cantidad);

    lines.push({
      id_producto: idProducto,
      cantidad,
      precio_unitario_fijado: precioUnitario,
      texto_personalizado: detalle.texto_personalizado ?? null,
      tecnica_personalizacion: detalle.tecnica_personalizacion ?? null,
      subtotal,
    });

    totalProductos += subtotal;
  }

  return {
    lines,
    totalProductos: roundMoney(totalProductos),
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const where = req.user.rol !== 'admin'
    ? { id_usuario: req.user.id_usuario }
    : {};

  const orders = await prisma.pedido.findMany({
    where,
    include: orderListInclude,
    orderBy: { fecha_pedido: 'desc' },
  });

  res.json(orders.map(serializeOrderSummary));
}));

router.get('/:id', validate(orderIdParamsSchema), asyncHandler(async (req, res) => {
  const orderId = parsePositiveInteger(req.params.id, 'id');
  const order = await getOrderById(orderId);

  if (!order) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  if (req.user.rol !== 'admin' && order.id_usuario !== req.user.id_usuario) {
    throw httpError(403, 'No tienes permisos para ver este pedido.');
  }

  res.json(serializeOrder(order));
}));

router.post('/', validate(createOrderSchema), asyncHandler(async (req, res) => {
  const { id_distrito, direccion_envio, metodo_pago, detalles } = req.body;

  const createdOrder = await prisma.$transaction(async (tx) => {
    const districtId = parsePositiveInteger(id_distrito, 'id_distrito');
    const district = await tx.distrito.findUnique({
      where: { id_distrito: districtId },
    });

    if (!district) {
      throw httpError(404, 'Distrito no encontrado.');
    }

    const { lines, totalProductos } = await calculateOrderLines(tx, detalles);
    const costoEnvio = decimalToNumber(district.costo_delivery);
    const montoTotal = roundMoney(totalProductos + costoEnvio);

    return tx.pedido.create({
      data: {
        id_usuario: req.user.id_usuario,
        id_distrito: districtId,
        direccion_envio,
        estado: 'Pendiente',
        metodo_pago: metodo_pago ?? null,
        total_productos: totalProductos,
        costo_envio: costoEnvio,
        monto_total: montoTotal,
        detalles: {
          create: lines,
        },
      },
      include: orderDetailInclude,
    });
  });

  res.status(201).json(serializeOrder(createdOrder));
}));

router.put('/:id', validate(updateOrderSchema), asyncHandler(async (req, res) => {
  const orderId = parsePositiveInteger(req.params.id, 'id');
  const currentOrder = await getOrderById(orderId);

  if (!currentOrder) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  const isAdmin = req.user.rol === 'admin';
  const isOwner = currentOrder.id_usuario === req.user.id_usuario;

  if (!isAdmin && !isOwner) {
    throw httpError(403, 'No tienes permisos para actualizar este pedido.');
  }

  if (!isAdmin && currentOrder.estado !== 'Pendiente') {
    throw httpError(409, 'Solo se pueden editar pedidos pendientes.');
  }

  const nextEstado = hasOwn(req.body, 'estado') ? req.body.estado : currentOrder.estado;

  if (hasOwn(req.body, 'estado') && !isAdmin) {
    throw httpError(403, 'Solo un administrador puede cambiar el estado del pedido.');
  }

  if (!['Pendiente', 'Enviado', 'Entregado'].includes(nextEstado)) {
    throw httpError(400, 'El estado debe ser Pendiente, Enviado o Entregado.');
  }

  const districtId = hasOwn(req.body, 'id_distrito')
    ? parsePositiveInteger(req.body.id_distrito, 'id_distrito')
    : currentOrder.id_distrito;

  const district = await prisma.distrito.findUnique({
    where: { id_distrito: districtId },
  });

  if (!district) {
    throw httpError(404, 'Distrito no encontrado.');
  }

  const direccionEnvio = hasOwn(req.body, 'direccion_envio')
    ? req.body.direccion_envio
    : currentOrder.direccion_envio;
  const metodoPago = hasOwn(req.body, 'metodo_pago')
    ? req.body.metodo_pago
    : currentOrder.metodo_pago;
  const costoEnvio = decimalToNumber(district.costo_delivery);
  const montoTotal = roundMoney(decimalToNumber(currentOrder.total_productos) + costoEnvio);

  const updatedOrder = await prisma.pedido.update({
    where: { id_pedido: orderId },
    data: {
      id_distrito: districtId,
      direccion_envio: direccionEnvio,
      estado: nextEstado,
      metodo_pago: metodoPago,
      costo_envio: costoEnvio,
      monto_total: montoTotal,
    },
    include: orderDetailInclude,
  });

  res.json(serializeOrder(updatedOrder));
}));

router.delete('/:id', validate(orderIdParamsSchema), asyncHandler(async (req, res) => {
  const orderId = parsePositiveInteger(req.params.id, 'id');
  const currentOrder = await getOrderById(orderId);

  if (!currentOrder) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  const isAdmin = req.user.rol === 'admin';
  const isOwner = currentOrder.id_usuario === req.user.id_usuario;

  if (!isAdmin && !isOwner) {
    throw httpError(403, 'No tienes permisos para eliminar este pedido.');
  }

  if (currentOrder.estado !== 'Pendiente') {
    throw httpError(409, 'Solo se pueden eliminar pedidos pendientes.');
  }

  await prisma.$transaction(async (tx) => {
    for (const detail of currentOrder.detalles) {
      await tx.producto.update({
        where: { id_producto: detail.id_producto },
        data: {
          stock: { increment: detail.cantidad },
        },
      });
    }

    await tx.pedido.delete({
      where: { id_pedido: orderId },
    });
  });

  res.status(204).send();
}));

module.exports = router;
