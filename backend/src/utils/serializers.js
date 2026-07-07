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
    pais_region: user.pais_region,
    direccion_calle: user.direccion_calle,
    poblacion: user.poblacion,
    region_provincia: user.region_provincia,
    codigo_postal: user.codigo_postal,
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

function serializeProductImage(image) {
  return {
    id_imagen: image.id_imagen,
    url: image.url,
    alt: image.alt,
    vista: image.vista,
    orden: image.orden,
  };
}

function serializeProductOption(option) {
  return {
    id_opcion: option.id_opcion,
    tipo: option.tipo,
    nombre: option.nombre,
    recargo: decimalToNumber(option.recargo),
    requerido: option.requerido,
    orden: option.orden,
  };
}

function serializeProduct(product) {
  const precioBase = decimalToNumber(product.precio_base);
  const precioOferta = decimalToNumber(product.precio_oferta);
  const fallbackImage = product.imagen_url
    ? [{
        id_imagen: null,
        url: product.imagen_url,
        alt: product.nombre,
        vista: 'Principal',
        orden: 0,
      }]
    : [];

  const serializedProduct = {
    id_producto: product.id_producto,
    id_categoria: product.id_categoria,
    categoria_nombre: product.categoria?.nombre ?? null,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio_base: precioBase,
    precio_oferta: precioOferta,
    precio_actual: precioOferta ?? precioBase,
    stock: product.stock,
    imagen_url: product.imagen_url,
    activo: product.activo,
    destacado: product.destacado,
    etiqueta_badge: product.etiqueta_badge,
    ventas_totales: product.ventas_totales,
    rating_promedio: decimalToNumber(product.rating_promedio),
    total_resenas: product.total_resenas,
  };

  if (product.escalas_precios) {
    serializedProduct.escalas_precios = product.escalas_precios.map(serializePriceScale);
  }

  if (product.imagenes) {
    serializedProduct.imagenes = product.imagenes.map(serializeProductImage);
  } else {
    serializedProduct.imagenes = fallbackImage;
  }

  if (product.opciones) {
    serializedProduct.opciones = product.opciones.map(serializeProductOption);
  }

  if (product.resenas) {
    serializedProduct.resenas = product.resenas.map(serializeReview);
  }

  return serializedProduct;
}

function serializeOrderSummary(order) {
  const activityDates = [
    order.fecha_pedido,
    ...(order.mensajes || []).map((message) => message?.fecha),
  ].filter(Boolean);
  const latestActivityDate = activityDates.reduce((latest, date) => (
    !latest || new Date(date) > new Date(latest) ? date : latest
  ), null);

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
    pais_region: order.pais_region,
    direccion_calle: order.direccion_calle,
    poblacion: order.poblacion,
    region_provincia: order.region_provincia,
    codigo_postal: order.codigo_postal,
    telefono_contacto: order.telefono_contacto,
    fecha_actualizacion: order.fecha_actualizacion,
    total_productos: decimalToNumber(order.total_productos),
    costo_envio: decimalToNumber(order.costo_envio),
    monto_total: decimalToNumber(order.monto_total),
    fecha_ultima_actividad: order.fecha_actualizacion || latestActivityDate || order.fecha_pedido,
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
      producto_imagen_url: detail.producto?.imagen_url ?? detail.imagen_referencia_url ?? null,
      cantidad: detail.cantidad,
      precio_unitario_fijado: decimalToNumber(detail.precio_unitario_fijado),
      precio_personalizacion: decimalToNumber(detail.precio_personalizacion),
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
      configuracion: detail.configuracion,
      subtotal: decimalToNumber(detail.subtotal),
    })),
    mensajes: (order.mensajes || []).map(serializeOrderMessage),
  };
}

function serializeOrderMessage(message) {
  return {
    id_mensaje: message.id_mensaje,
    id_pedido: message.id_pedido,
    id_usuario: message.id_usuario,
    tipo: message.tipo,
    contenido: message.contenido,
    imagen_url: message.imagen_url,
    fecha: message.fecha,
    visible_cliente: message.visible_cliente,
    autor_nombre: message.usuario?.nombre_completo ?? null,
  };
}

function serializeReview(review) {
  return {
    id_resena: review.id_resena,
    id_producto: review.id_producto,
    id_usuario: review.id_usuario,
    id_pedido: review.id_pedido,
    cliente_nombre: review.usuario?.nombre_completo ?? null,
    rating: review.rating,
    comentario: review.comentario,
    compra_verificada: review.compra_verificada,
    fecha: review.fecha,
  };
}

module.exports = {
  decimalToNumber,
  serializeUser,
  serializeCategory,
  serializeDistrict,
  serializePriceScale,
  serializeProductImage,
  serializeProductOption,
  serializeProduct,
  serializeOrderSummary,
  serializeOrder,
  serializeOrderMessage,
  serializeReview,
};
