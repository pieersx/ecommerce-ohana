const { z } = require('zod');

const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().min(0);
const nonNegativeNumber = z.coerce.number().min(0);
const emailSchema = z.string().trim().toLowerCase().email().max(150);
const passwordSchema = z.string().min(6).max(100);
const roleSchema = z.enum(['admin', 'cliente']);
const orderStatusSchema = z.enum(['Pendiente', 'Enviado', 'Entregado']);

const optionalShortText = (maxLength) => z.string().trim().min(1).max(maxLength).nullable().optional();
const optionalLongText = z.string().trim().min(1).nullable().optional();
const optionalUrl = z.string().trim().url().max(255).nullable().optional();

const atLeastOneField = (schema) => schema.refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar.' },
);

const priceScaleSchema = z.object({
  cantidad_min: positiveInt,
  precio_unitario: nonNegativeNumber,
});

const orderDetailSchema = z.object({
  id_producto: positiveInt,
  cantidad: positiveInt,
  texto_personalizado: optionalLongText,
  tecnica_personalizacion: optionalShortText(50),
});

const authRegisterSchema = z.object({
  body: z.object({
    nombre_completo: z.string().trim().min(1).max(150),
    email: emailSchema,
    password: passwordSchema,
    telefono: optionalShortText(20),
    dni_ruc: optionalShortText(20),
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
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: positiveInt,
  }),
  body: atLeastOneField(z.object({
    nombre_completo: z.string().trim().min(1).max(150).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    rol: roleSchema.optional(),
    telefono: optionalShortText(20),
    dni_ruc: optionalShortText(20),
  })),
});

const listProductsSchema = z.object({
  query: z.object({
    id_categoria: positiveInt.optional(),
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
    stock: nonNegativeInt.default(0),
    imagen_url: optionalUrl,
    escalas_precios: z.array(priceScaleSchema).default([]),
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
    stock: nonNegativeInt.optional(),
    imagen_url: optionalUrl,
    escalas_precios: z.array(priceScaleSchema).optional(),
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
  createPaymentCheckoutSchema,
  createOrderSchema,
  updateOrderSchema,
};
