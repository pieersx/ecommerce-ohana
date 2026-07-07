const { z } = require('zod');

const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().min(0);
const nonNegativeNumber = z.coerce.number().min(0);
const emailSchema = z.string().trim().toLowerCase().email().max(150);
const passwordSchema = z.string().min(6).max(100);
const roleSchema = z.enum(['admin', 'cliente']);
const orderStatusSchema = z.enum(['Pendiente', 'Pagado', 'Enviado', 'Entregado']);

const optionalShortText = (maxLength) => z.string().trim().min(1).max(maxLength).nullable().optional();
const optionalLongText = z.string().trim().min(1).nullable().optional();
const assetUrlSchema = (maxLength = 500) => z.string().trim().max(maxLength).refine(
  (value) => /^https?:\/\//i.test(value) || value.startsWith('/products/') || value.startsWith('/brand/') || value.startsWith('/uploads/'),
  { message: 'Debe ser una URL http(s) o una ruta local de assets.' },
);
const optionalUrl = assetUrlSchema(255).nullable().optional();

const atLeastOneField = (schema) => schema.refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar.' },
);

const priceScaleSchema = z.object({
  cantidad_min: positiveInt,
  precio_unitario: nonNegativeNumber,
});

const productImageSchema = z.object({
  url: assetUrlSchema(500),
  alt: optionalShortText(180),
  vista: z.string().trim().min(1).max(40).default('Principal'),
  orden: nonNegativeInt.default(0),
});

const productOptionSchema = z.object({
  tipo: z.enum(['talla', 'tamano', 'cara', 'tecnica', 'color', 'figura']),
  nombre: z.string().trim().min(1).max(80),
  recargo: nonNegativeNumber.default(0),
  requerido: z.boolean().default(false),
  orden: nonNegativeInt.default(0),
});

const orderDetailSchema = z.object({
  id_producto: positiveInt,
  cantidad: positiveInt,
  texto_personalizado: optionalLongText,
  tecnica_personalizacion: optionalShortText(50),
  talla: optionalShortText(30),
  tamano: optionalShortText(50),
  color_producto: optionalShortText(50),
  fuente_texto: optionalShortText(80),
  tamano_texto: z.coerce.number().int().min(12).max(72).nullable().optional(),
  cara: optionalShortText(40),
  posicion_x: z.coerce.number().min(0).max(100).nullable().optional(),
  posicion_y: z.coerce.number().min(0).max(100).nullable().optional(),
  imagen_referencia_url: assetUrlSchema(500).nullable().optional(),
  precio_personalizacion: nonNegativeNumber.default(0),
  configuracion: z.record(z.string(), z.any()).nullable().optional(),
});

const authRegisterSchema = z.object({
  body: z.object({
    nombre_completo: z.string().trim().min(1).max(150),
    email: emailSchema,
    password: passwordSchema,
    telefono: optionalShortText(20),
    dni_ruc: optionalShortText(20),
    pais_region: optionalShortText(80),
    direccion_calle: optionalLongText,
    poblacion: optionalShortText(120),
    region_provincia: optionalShortText(120),
    codigo_postal: optionalShortText(20),
  }),
});

const authLoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1),
  }),
});

const userIdParamsSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
});

const createUserSchema = z.object({
  body: z.object({
    nombre_completo: z.string().trim().min(1).max(150),
    email: emailSchema,
    password: passwordSchema,
    rol: roleSchema.default('cliente'),
    telefono: optionalShortText(20),
    dni_ruc: optionalShortText(20),
    pais_region: optionalShortText(80),
    direccion_calle: optionalLongText,
    poblacion: optionalShortText(120),
    region_provincia: optionalShortText(120),
    codigo_postal: optionalShortText(20),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
  body: atLeastOneField(z.object({
    nombre_completo: z.string().trim().min(1).max(150).optional(),
    email: emailSchema.optional(),
    rol: roleSchema.optional(),
    telefono: optionalShortText(20),
    dni_ruc: optionalShortText(20),
    pais_region: optionalShortText(80),
    direccion_calle: optionalLongText,
    poblacion: optionalShortText(120),
    region_provincia: optionalShortText(120),
    codigo_postal: optionalShortText(20),
  })),
});

const listProductsSchema = z.object({
  query: z.object({
    id_categoria: positiveInt.optional(),
    q: z.string().trim().max(120).optional(),
    sort: z.enum(['recomendados', 'precio_asc', 'precio_desc', 'vendidos', 'rating', 'nuevos']).optional(),
    destacado: z.enum(['true', 'false']).optional(),
    stock: z.enum(['available']).optional(),
  }),
});

const productIdParamsSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
});

const createProductSchema = z.object({
  body: z.object({
    id_categoria: positiveInt,
    nombre: z.string().trim().min(1).max(150),
    descripcion: optionalLongText,
    precio_base: nonNegativeNumber,
    precio_oferta: nonNegativeNumber.nullable().optional(),
    stock: nonNegativeInt.default(0),
    imagen_url: optionalUrl,
    activo: z.boolean().default(true),
    destacado: z.boolean().default(false),
    etiqueta_badge: optionalShortText(40),
    escalas_precios: z.array(priceScaleSchema).default([]),
    imagenes: z.array(productImageSchema).default([]),
    opciones: z.array(productOptionSchema).default([]),
  }),
});

const updateProductSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
  body: atLeastOneField(z.object({
    id_categoria: positiveInt.optional(),
    nombre: z.string().trim().min(1).max(150).optional(),
    descripcion: optionalLongText,
    precio_base: nonNegativeNumber.optional(),
    precio_oferta: nonNegativeNumber.nullable().optional(),
    stock: nonNegativeInt.optional(),
    imagen_url: optionalUrl,
    activo: z.boolean().optional(),
    destacado: z.boolean().optional(),
    etiqueta_badge: optionalShortText(40),
    escalas_precios: z.array(priceScaleSchema).optional(),
    imagenes: z.array(productImageSchema).optional(),
    opciones: z.array(productOptionSchema).optional(),
  })),
});

const orderIdParamsSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
});

const createPaymentCheckoutSchema = z.object({
  body: z.object({
    id_pedido: positiveInt,
    success_url: z.string().trim().url().max(255),
    cancel_url: z.string().trim().url().max(255),
  }),
});

const createOrderSchema = z.object({
  body: z.object({
    id_distrito: positiveInt,
    direccion_envio: z.string().trim().min(1),
    metodo_pago: optionalShortText(50),
    pais_region: optionalShortText(80),
    direccion_calle: optionalLongText,
    poblacion: optionalShortText(120),
    region_provincia: optionalShortText(120),
    codigo_postal: optionalShortText(20),
    telefono_contacto: optionalShortText(20),
    detalles: z.array(orderDetailSchema).min(1),
  }),
});

const updateOrderSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
  body: atLeastOneField(z.object({
    id_distrito: positiveInt.optional(),
    direccion_envio: z.string().trim().min(1).optional(),
    metodo_pago: optionalShortText(50),
    estado: orderStatusSchema.optional(),
  })),
});

const createOrderMessageSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
  body: z.object({
    contenido: z.string().trim().max(1500).optional(),
    imagen_url: assetUrlSchema(500).nullable().optional(),
    visible_cliente: z.boolean().optional(),
  }).refine((value) => Boolean(value.contenido?.trim() || value.imagen_url), {
    message: 'Envía un mensaje o una imagen.',
  }),
});

const deleteOrderDetailSchema = z.object({
  params: z.object({
    orderId: positiveInt,
    detailId: positiveInt,
  }),
});

const createReviewSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comentario: z.string().trim().min(3).max(1000),
  }),
});

module.exports = {
  authRegisterSchema,
  authLoginSchema,
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
  listProductsSchema,
  productIdParamsSchema,
  createProductSchema,
  updateProductSchema,
  orderIdParamsSchema,
  deleteOrderDetailSchema,
  createPaymentCheckoutSchema,
  createOrderSchema,
  createOrderMessageSchema,
  createReviewSchema,
  updateOrderSchema,
};
