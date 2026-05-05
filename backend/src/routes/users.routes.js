const bcrypt = require('bcrypt');
const express = require('express');

const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { serializeUser } = require('../utils/serializers');
const {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

function hasOwn(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function normalizeRole(role) {
  if (!['admin', 'cliente'].includes(role)) {
    throw httpError(400, 'rol debe ser admin o cliente.');
  }

  return role;
}

function parseUserId(value) {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw httpError(400, 'El id del usuario es inválido.');
  }

  return userId;
}

router.get('/', asyncHandler(async (_req, res) => {
  const users = await prisma.usuario.findMany({
    orderBy: { id_usuario: 'desc' },
  });

  res.json(users.map(serializeUser));
}));

router.get('/:id', validate(userIdParamsSchema), asyncHandler(async (req, res) => {
  const userId = parseUserId(req.params.id);
  const user = await prisma.usuario.findUnique({
    where: { id_usuario: userId },
  });

  if (!user) {
    throw httpError(404, 'Usuario no encontrado.');
  }

  res.json(serializeUser(user));
}));

router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  const {
    nombre_completo,
    email,
    password,
    rol,
    telefono,
    dni_ruc,
  } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.usuario.create({
      data: {
        nombre_completo,
        email,
        password_hash: passwordHash,
        rol: normalizeRole(rol),
        telefono: telefono ?? null,
        dni_ruc: dni_ruc ?? null,
      },
    });

    res.status(201).json(serializeUser(user));
  } catch (error) {
    if (error.code === 'P2002') {
      throw httpError(409, 'El email ya se encuentra registrado.');
    }

    throw error;
  }
}));

router.put('/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const userId = parseUserId(req.params.id);
  const currentUser = await prisma.usuario.findUnique({
    where: { id_usuario: userId },
  });

  if (!currentUser) {
    throw httpError(404, 'Usuario no encontrado.');
  }

  const updatedEmail = hasOwn(req.body, 'email')
    ? req.body.email
    : currentUser.email;

  const passwordHash = hasOwn(req.body, 'password')
    ? await bcrypt.hash(req.body.password, 10)
    : currentUser.password_hash;

  try {
    const user = await prisma.usuario.update({
      where: { id_usuario: userId },
      data: {
        nombre_completo: hasOwn(req.body, 'nombre_completo') ? req.body.nombre_completo : currentUser.nombre_completo,
        email: updatedEmail,
        password_hash: passwordHash,
        rol: hasOwn(req.body, 'rol') ? normalizeRole(req.body.rol) : currentUser.rol,
        telefono: hasOwn(req.body, 'telefono') ? req.body.telefono : currentUser.telefono,
        dni_ruc: hasOwn(req.body, 'dni_ruc') ? req.body.dni_ruc : currentUser.dni_ruc,
      },
    });

    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === 'P2002') {
      throw httpError(409, 'El email ya se encuentra registrado.');
    }

    throw error;
  }
}));

router.delete('/:id', validate(userIdParamsSchema), asyncHandler(async (req, res) => {
  const userId = parseUserId(req.params.id);

  if (req.user.id_usuario === userId) {
    throw httpError(400, 'No puedes eliminar tu propio usuario administrador desde esta ruta.');
  }

  try {
    await prisma.usuario.delete({
      where: { id_usuario: userId },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      throw httpError(404, 'Usuario no encontrado.');
    }

    if (error.code === 'P2003') {
      throw httpError(409, 'No se puede eliminar el usuario porque tiene pedidos asociados.');
    }

    throw error;
  }
}));

module.exports = router;
