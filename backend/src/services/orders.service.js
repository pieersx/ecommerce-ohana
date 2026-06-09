const prisma = require('../config/prisma');
const httpError = require('../utils/httpError');
const {
  decimalToNumber,
  serializeOrder,
  serializeOrderSummary,
} = require('../utils/serializers');

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

async function findOrderById(orderId) {
  return prisma.pedido.findUnique({
    where: { id_pedido: orderId },
    include: orderDetailInclude,
  });
}

function assertCanReadOrder(order, user) {
  if (user.rol !== 'admin' && order.id_usuario !== user.id_usuario) {
    throw httpError(403, 'No tienes permisos para ver este pedido.');
  }
}

function assertCanMutateOrder(order, user) {
  const isAdmin = user.rol === 'admin';
  const isOwner = order.id_usuario === user.id_usuario;

  if (!isAdmin && !isOwner) {
    throw httpError(403, 'No tienes permisos para actualizar este pedido.');
  }

  if (!isAdmin && order.estado !== 'Pendiente') {
    throw httpError(409, 'Solo se pueden editar pedidos pendientes.');
  }
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

async function listOrders(user) {
  const where = user.rol !== 'admin'
    ? { id_usuario: user.id_usuario }
    : {};

  const orders = await prisma.pedido.findMany({
    where,
    include: orderListInclude,
    orderBy: { fecha_pedido: 'desc' },
  });

  return orders.map(serializeOrderSummary);
}

async function getOrder(orderId, user) {
  const order = await findOrderById(parsePositiveInteger(orderId, 'id'));

  if (!order) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  assertCanReadOrder(order, user);
  return serializeOrder(order);
}

async function createOrder(body, user) {
  const createdOrder = await prisma.$transaction(async (tx) => {
    const districtId = parsePositiveInteger(body.id_distrito, 'id_distrito');
    const district = await tx.distrito.findUnique({
      where: { id_distrito: districtId },
    });

    if (!district) {
      throw httpError(404, 'Distrito no encontrado.');
    }

    const { lines, totalProductos } = await calculateOrderLines(tx, body.detalles);
    const costoEnvio = decimalToNumber(district.costo_delivery);
    const montoTotal = roundMoney(totalProductos + costoEnvio);

    return tx.pedido.create({
      data: {
        id_usuario: user.id_usuario,
        id_distrito: districtId,
        direccion_envio: body.direccion_envio,
        estado: 'Pendiente',
        metodo_pago: body.metodo_pago ?? null,
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

  return serializeOrder(createdOrder);
}

async function updateOrder(orderId, body, user) {
  const parsedOrderId = parsePositiveInteger(orderId, 'id');
  const currentOrder = await findOrderById(parsedOrderId);

  if (!currentOrder) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  assertCanMutateOrder(currentOrder, user);

  const isAdmin = user.rol === 'admin';
  const nextEstado = hasOwn(body, 'estado') ? body.estado : currentOrder.estado;

  if (hasOwn(body, 'estado') && !isAdmin) {
    throw httpError(403, 'Solo un administrador puede cambiar el estado del pedido.');
  }

  if (!['Pendiente', 'Enviado', 'Entregado'].includes(nextEstado)) {
    throw httpError(400, 'El estado debe ser Pendiente, Enviado o Entregado.');
  }

  const districtId = hasOwn(body, 'id_distrito')
    ? parsePositiveInteger(body.id_distrito, 'id_distrito')
    : currentOrder.id_distrito;

  const district = await prisma.distrito.findUnique({
    where: { id_distrito: districtId },
  });

  if (!district) {
    throw httpError(404, 'Distrito no encontrado.');
  }

  const costoEnvio = decimalToNumber(district.costo_delivery);
  const montoTotal = roundMoney(decimalToNumber(currentOrder.total_productos) + costoEnvio);

  const updatedOrder = await prisma.pedido.update({
    where: { id_pedido: parsedOrderId },
    data: {
      id_distrito: districtId,
      direccion_envio: hasOwn(body, 'direccion_envio') ? body.direccion_envio : currentOrder.direccion_envio,
      estado: nextEstado,
      metodo_pago: hasOwn(body, 'metodo_pago') ? body.metodo_pago : currentOrder.metodo_pago,
      costo_envio: costoEnvio,
      monto_total: montoTotal,
    },
    include: orderDetailInclude,
  });

  return serializeOrder(updatedOrder);
}

async function deleteOrder(orderId, user) {
  const parsedOrderId = parsePositiveInteger(orderId, 'id');
  const currentOrder = await findOrderById(parsedOrderId);

  if (!currentOrder) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  const isAdmin = user.rol === 'admin';
  const isOwner = currentOrder.id_usuario === user.id_usuario;

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
      where: { id_pedido: parsedOrderId },
    });
  });
}

module.exports = {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
};
