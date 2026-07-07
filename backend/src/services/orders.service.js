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
  mensajes: {
    select: {
      fecha: true,
    },
    orderBy: {
      fecha: 'desc',
    },
    take: 1,
  },
};

const orderDetailInclude = {
  ...orderListInclude,
  detalles: {
    include: {
      producto: {
        select: {
          id_producto: true,
          nombre: true,
          imagen_url: true,
        },
      },
    },
    orderBy: {
      id_detalle: 'asc',
    },
  },
  mensajes: {
    include: {
      usuario: {
        select: {
          nombre_completo: true,
        },
      },
    },
    orderBy: {
      id_mensaje: 'asc',
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

const orderStatuses = ['Pendiente', 'Pagado', 'Enviado', 'Entregado'];

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
      product.escalas_precios[0]?.precio_unitario ?? product.precio_oferta ?? product.precio_base,
    );
    const precioPersonalizacion = roundMoney(detalle.precio_personalizacion ?? 0);
    const subtotal = roundMoney((precioUnitario + precioPersonalizacion) * cantidad);

    lines.push({
      id_producto: idProducto,
      cantidad,
      precio_unitario_fijado: precioUnitario,
      precio_personalizacion: precioPersonalizacion,
      texto_personalizado: detalle.texto_personalizado ?? null,
      tecnica_personalizacion: detalle.tecnica_personalizacion ?? null,
      talla: detalle.talla ?? null,
      tamano: detalle.tamano ?? null,
      color_producto: detalle.color_producto ?? null,
      fuente_texto: detalle.fuente_texto ?? null,
      tamano_texto: detalle.tamano_texto ?? null,
      cara: detalle.cara ?? null,
      posicion_x: detalle.posicion_x ?? null,
      posicion_y: detalle.posicion_y ?? null,
      imagen_referencia_url: detalle.imagen_referencia_url ?? product.imagen_url ?? null,
      configuracion: detalle.configuracion ?? null,
      subtotal,
    });

    totalProductos += subtotal;

    await client.producto.update({
      where: { id_producto: idProducto },
      data: {
        ventas_totales: { increment: cantidad },
      },
    });
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
    orderBy: { fecha_actualizacion: 'desc' },
  });

  return orders
    .map(serializeOrderSummary)
    .sort((a, b) => new Date(b.fecha_ultima_actividad || b.fecha_actualizacion || b.fecha_pedido) - new Date(a.fecha_ultima_actividad || a.fecha_actualizacion || a.fecha_pedido));
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
  if (user.rol !== 'cliente') {
    throw httpError(403, 'Los administradores no realizan compras. Regístrate o inicia sesión como cliente.');
  }

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
        pais_region: body.pais_region ?? user.pais_region ?? 'Perú',
        direccion_calle: body.direccion_calle ?? body.direccion_envio,
        poblacion: body.poblacion ?? user.poblacion ?? 'Lima',
        region_provincia: body.region_provincia ?? user.region_provincia ?? 'Lima',
        codigo_postal: body.codigo_postal ?? user.codigo_postal ?? null,
        telefono_contacto: body.telefono_contacto ?? user.telefono ?? null,
        total_productos: totalProductos,
        costo_envio: costoEnvio,
        monto_total: montoTotal,
        detalles: {
          create: lines,
        },
        mensajes: {
          create: {
            id_usuario: user.id_usuario,
            tipo: 'Pendiente',
            contenido: 'Pedido creado. Revisa los datos y completa el pago para iniciar la produccion.',
          },
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

  if (!orderStatuses.includes(nextEstado)) {
    throw httpError(400, 'El estado indicado no es válido.');
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

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.pedido.update({
      where: { id_pedido: parsedOrderId },
      data: {
        id_distrito: districtId,
        direccion_envio: hasOwn(body, 'direccion_envio') ? body.direccion_envio : currentOrder.direccion_envio,
        estado: nextEstado,
        fecha_actualizacion: new Date(),
        metodo_pago: hasOwn(body, 'metodo_pago') ? body.metodo_pago : currentOrder.metodo_pago,
        costo_envio: costoEnvio,
        monto_total: montoTotal,
      },
      include: orderDetailInclude,
    });

    if (hasOwn(body, 'estado') && nextEstado !== currentOrder.estado) {
      await tx.mensajePedido.create({
        data: {
          id_pedido: parsedOrderId,
          id_usuario: user.id_usuario,
          tipo: nextEstado,
          contenido: buildStatusMessage(nextEstado),
        },
      });
    }

    return order;
  });

  return serializeOrder(updatedOrder);
}

async function createOrderMessage(orderId, body, user) {
  const parsedOrderId = parsePositiveInteger(orderId, 'id');
  const order = await findOrderById(parsedOrderId);

  if (!order) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  assertCanReadOrder(order, user);

  const message = await prisma.mensajePedido.create({
    data: {
      id_pedido: parsedOrderId,
      id_usuario: user.id_usuario,
      tipo: user.rol === 'admin' ? 'Admin' : 'Cliente',
      contenido: body.contenido?.trim() || (body.imagen_url ? 'Imagen de referencia adjunta.' : ''),
      imagen_url: body.imagen_url || null,
      visible_cliente: user.rol === 'admin' ? body.visible_cliente ?? true : true,
    },
    include: {
      usuario: {
        select: {
          nombre_completo: true,
        },
      },
    },
  });

  await prisma.pedido.update({
    where: { id_pedido: parsedOrderId },
    data: { fecha_actualizacion: new Date() },
  });

  return message;
}

function buildStatusMessage(status) {
  const messages = {
    Pendiente: 'El pedido esta pendiente de pago o confirmacion.',
    Pagado: 'Pago recibido. Tu pedido entro a produccion y tu boleta ya esta disponible en Mis pedidos.',
    Enviado: 'Tu pedido salio a reparto.',
    Entregado: 'Pedido entregado correctamente.',
  };

  return messages[status] || `El pedido cambio a ${status}.`;
}

function lineToCartItem(detail) {
  const product = detail.producto || {};

  return {
    product: {
      id_producto: detail.id_producto,
      nombre: product.nombre,
      imagen_url: product.imagen_url || detail.imagen_referencia_url,
      precio_base: decimalToNumber(detail.precio_unitario_fijado),
      precio_actual: decimalToNumber(detail.precio_unitario_fijado),
      stock: detail.cantidad,
    },
    cantidad: detail.cantidad,
    texto_personalizado: detail.texto_personalizado,
    tecnica_personalizacion: detail.tecnica_personalizacion,
    talla: detail.talla,
    tamano: detail.tamano,
    color_producto: detail.color_producto,
    fuente_texto: detail.fuente_texto,
    tamano_texto: detail.tamano_texto,
    cara: detail.cara,
    posicion_x: decimalToNumber(detail.posicion_x),
    posicion_y: decimalToNumber(detail.posicion_y),
    imagen_referencia_url: detail.imagen_referencia_url,
    precio_personalizacion: decimalToNumber(detail.precio_personalizacion),
    configuracion: detail.configuracion,
  };
}

async function removeOrderDetail(orderId, detailId, user) {
  const parsedOrderId = parsePositiveInteger(orderId, 'orderId');
  const parsedDetailId = parsePositiveInteger(detailId, 'detailId');

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.pedido.findUnique({
      where: { id_pedido: parsedOrderId },
      include: orderDetailInclude,
    });

    if (!order) {
      throw httpError(404, 'Pedido no encontrado.');
    }

    assertCanMutateOrder(order, user);

    if (order.estado !== 'Pendiente') {
      throw httpError(409, 'Solo puedes quitar productos de pedidos pendientes.');
    }

    const detail = order.detalles.find((line) => line.id_detalle === parsedDetailId);

    if (!detail) {
      throw httpError(404, 'Detalle de pedido no encontrado.');
    }

    await tx.producto.update({
      where: { id_producto: detail.id_producto },
      data: {
        stock: { increment: detail.cantidad },
        ventas_totales: { decrement: detail.cantidad },
      },
    });

    await tx.detallePedido.delete({
      where: { id_detalle: parsedDetailId },
    });

    const remainingDetails = order.detalles.filter((line) => line.id_detalle !== parsedDetailId);
    const returnedItem = lineToCartItem(detail);

    if (!remainingDetails.length) {
      await tx.mensajePedido.create({
        data: {
          id_pedido: parsedOrderId,
          id_usuario: user.id_usuario,
          tipo: 'Cancelado',
          contenido: 'Pedido pendiente eliminado porque ya no tenia productos.',
        },
      });
      await tx.pedido.delete({ where: { id_pedido: parsedOrderId } });

      return {
        deleted_order: true,
        order: null,
        returned_item: returnedItem,
      };
    }

    const totalProductos = roundMoney(remainingDetails.reduce((sum, line) => sum + decimalToNumber(line.subtotal), 0));
    const montoTotal = roundMoney(totalProductos + decimalToNumber(order.costo_envio));

    await tx.mensajePedido.create({
      data: {
        id_pedido: parsedOrderId,
        id_usuario: user.id_usuario,
        tipo: 'Editado',
        contenido: `${detail.producto?.nombre || 'Un producto'} fue retirado del pedido pendiente.`,
      },
    });

    const updatedOrder = await tx.pedido.update({
      where: { id_pedido: parsedOrderId },
      data: {
        total_productos: totalProductos,
        monto_total: montoTotal,
        fecha_actualizacion: new Date(),
      },
      include: orderDetailInclude,
    });

    return {
      deleted_order: false,
      order: serializeOrder(updatedOrder),
      returned_item: returnedItem,
    };
  });

  return result;
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

  const returnedItems = [];

  await prisma.$transaction(async (tx) => {
    for (const detail of currentOrder.detalles) {
      await tx.producto.update({
        where: { id_producto: detail.id_producto },
        data: {
          stock: { increment: detail.cantidad },
        },
      });
      returnedItems.push(lineToCartItem(detail));
    }

    await tx.pedido.delete({
      where: { id_pedido: parsedOrderId },
    });
  });

  return { returned_items: returnedItems };
}

module.exports = {
  createOrderMessage,
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  removeOrderDetail,
  updateOrder,
};
