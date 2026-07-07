const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');

const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { serializeUser } = require('../utils/serializers');
const env = require('../config/env');
const {
  authLoginSchema,
  authRegisterSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require('../validators/schemas');

const router = express.Router();

const publicUserSelect = {
  id_usuario: true,
  nombre_completo: true,
  email: true,
  rol: true,
  telefono: true,
  dni_ruc: true,
  pais_region: true,
  direccion_calle: true,
  poblacion: true,
  region_provincia: true,
  codigo_postal: true,
  fecha_registro: true,
};

function buildToken(user) {
  return jwt.sign(
    { userId: user.id_usuario, role: user.rol },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

router.post('/register', validate(authRegisterSchema), asyncHandler(async (req, res) => {
  const {
    nombre_completo,
    email,
    password,
    telefono,
    dni_ruc,
    pais_region,
    direccion_calle,
    poblacion,
    region_provincia,
    codigo_postal,
  } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  let user;

  try {
    user = await prisma.usuario.create({
      data: {
        nombre_completo,
        email,
        password_hash: passwordHash,
        rol: 'cliente',
        telefono: telefono ?? null,
        dni_ruc: dni_ruc ?? null,
        pais_region: pais_region ?? 'Perú',
        direccion_calle: direccion_calle ?? null,
        poblacion: poblacion ?? null,
        region_provincia: region_provincia ?? 'Lima',
        codigo_postal: codigo_postal ?? null,
      },
      select: publicUserSelect,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw httpError(409, 'El email ya se encuentra registrado.');
    }

    throw error;
  }

  res.status(201).json({
    token: buildToken(user),
    usuario: serializeUser(user),
  });
}));

router.post('/login', validate(authLoginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.usuario.findUnique({
    where: { email },
  });

  if (!user) {
    throw httpError(401, 'Credenciales inválidas.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw httpError(401, 'Credenciales inválidas.');
  }

  res.json({
    token: buildToken(user),
    usuario: serializeUser(user),
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ usuario: serializeUser(req.user) });
}));

const PROFILE_FIELDS = [
  'nombre_completo',
  'telefono',
  'dni_ruc',
  'pais_region',
  'direccion_calle',
  'poblacion',
  'region_provincia',
  'codigo_postal',
];

router.put('/me', authenticate, validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const data = {};

  for (const field of PROFILE_FIELDS) {
    if (req.body[field] !== undefined) {
      data[field] = req.body[field];
    }
  }

  const user = await prisma.usuario.update({
    where: { id_usuario: req.user.id_usuario },
    data,
    select: publicUserSelect,
  });

  res.json({ usuario: serializeUser(user) });
}));

router.put('/me/password', authenticate, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { password_actual, password_nueva } = req.body;

  const user = await prisma.usuario.findUnique({
    where: { id_usuario: req.user.id_usuario },
  });

  const isPasswordValid = await bcrypt.compare(password_actual, user.password_hash);

  if (!isPasswordValid) {
    throw httpError(401, 'La contraseña actual no es correcta.');
  }

  await prisma.usuario.update({
    where: { id_usuario: req.user.id_usuario },
    data: { password_hash: await bcrypt.hash(password_nueva, 10) },
  });

  res.json({ message: 'Contraseña actualizada correctamente.' });
}));

module.exports = router;
