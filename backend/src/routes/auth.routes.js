const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');

const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { serializeUser } = require('../utils/serializers');
const { authLoginSchema, authRegisterSchema } = require('../validators/schemas');

const router = express.Router();

const publicUserSelect = {
  id_usuario: true,
  nombre_completo: true,
  email: true,
  rol: true,
  telefono: true,
  dni_ruc: true,
  fecha_registro: true,
};

function buildToken(user) {
  return jwt.sign(
    { userId: user.id_usuario, role: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

router.post('/register', validate(authRegisterSchema), asyncHandler(async (req, res) => {
  const {
    nombre_completo,
    email,
    password,
    telefono,
    dni_ruc,
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

module.exports = router;
