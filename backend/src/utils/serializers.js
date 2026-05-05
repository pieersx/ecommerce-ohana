function decimalToNumber(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  return Number(value);
}

function serializeUser(user) {
  return {
    id_usuario: user.id_usuario,
    nombre_completo: user.nombre_completo,
    email: user.email,
    rol: user.rol,
    telefono: user.telefono,
    dni_ruc: user.dni_ruc,
    fecha_registro: user.fecha_registro,
  };
}

function serializeCategory(category) {
  return {
    id_categoria: category.id_categoria,
    nombre: category.nombre,
  };
}

function serializeDistrict(district) {
  return {
    id_distrito: district.id_distrito,
    nombre: district.nombre,
    costo_delivery: decimalToNumber(district.costo_delivery),
  };
}

function serializePriceScale(scale) {
  return {
    id_escala: scale.id_escala,
    cantidad_min: scale.cantidad_min,
    precio_unitario: decimalToNumber(scale.precio_unitario),
  };
}

function serializeProduct(product) {
  const serializedProduct = {
    id_producto: product.id_producto,
    id_categoria: product.id_categoria,
    categoria_nombre: product.categoria?.nombre ?? null,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio_base: decimalToNumber(product.precio_base),
    stock: product.stock,
    imagen_url: product.imagen_url,
  };

  if (product.escalas_precios) {
    serializedProduct.escalas_precios = product.escalas_precios.map(serializePriceScale);
  }

  return serializedProduct;
}

function serializeOrderSummary(order) {
  return {
    id_pedido: order.id_pedido,
    id_usuario: order.id_usuario,
    cliente_nombre: order.usuario?.nombre_completo ?? null,
    id_distrito: order.id_distrito,
    distrito_nombre: order.distrito?.nombre ?? null,
    direccion_envio: order.direccion_envio,
    fecha_pedido: order.fecha_pedido,
    estado: order.estado,
    metodo_pago: order.metodo_pago,
    total_productos: decimalToNumber(order.total_productos),
    costo_envio: decimalToNumber(order.costo_envio),
    monto_total: decimalToNumber(order.monto_total),
  };
}

function serializeOrder(order) {
  return {
    ...serializeOrderSummary(order),
    cliente_email: order.usuario?.email ?? null,
    detalles: (order.detalles || []).map((detail) => ({
      id_detalle: detail.id_detalle,
      id_producto: detail.id_producto,
      producto_nombre: detail.producto?.nombre ?? null,
      cantidad: detail.cantidad,
      precio_unitario_fijado: decimalToNumber(detail.precio_unitario_fijado),
      texto_personalizado: detail.texto_personalizado,
      tecnica_personalizacion: detail.tecnica_personalizacion,
      subtotal: decimalToNumber(detail.subtotal),
    })),
  };
}

module.exports = {
  decimalToNumber,
  serializeUser,
  serializeCategory,
  serializeDistrict,
  serializePriceScale,
  serializeProduct,
  serializeOrderSummary,
  serializeOrder,
};
