const bcrypt = require('bcrypt');

const prisma = require('../config/prisma');
const httpError = require('../utils/httpError');
const { serializeUser } = require('../utils/serializers');

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

async function listUsers() {
  const users = await prisma.usuario.findMany({
    orderBy: { id_usuario: 'desc' },
  });

  return users.map(serializeUser);
}

async function getUser(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id_usuario: parseUserId(userId) },
  });

  if (!user) {
    throw httpError(404, 'Usuario no encontrado.');
  }

  return serializeUser(user);
}

async function createUser(body) {
  const passwordHash = await bcrypt.hash(body.password, 10);

  try {
    const user = await prisma.usuario.create({
      data: {
        nombre_completo: body.nombre_completo,
        email: body.email,
        password_hash: passwordHash,
        rol: normalizeRole(body.rol),
        telefono: body.telefono ?? null,
        dni_ruc: body.dni_ruc ?? null,
      },
    });

    return serializeUser(user);
  } catch (error) {
    if (error.code === 'P2002') {
      throw httpError(409, 'El email ya se encuentra registrado.');
    }

    throw error;
  }
}

async function updateUser(userId, body) {
  const parsedUserId = parseUserId(userId);
  const currentUser = await prisma.usuario.findUnique({
    where: { id_usuario: parsedUserId },
  });

  if (!currentUser) {
    throw httpError(404, 'Usuario no encontrado.');
  }

  const passwordHash = hasOwn(body, 'password')
    ? await bcrypt.hash(body.password, 10)
    : currentUser.password_hash;

  try {
    const user = await prisma.usuario.update({
      where: { id_usuario: parsedUserId },
      data: {
        nombre_completo: hasOwn(body, 'nombre_completo') ? body.nombre_completo : currentUser.nombre_completo,
        email: hasOwn(body, 'email') ? body.email : currentUser.email,
        password_hash: passwordHash,
        rol: hasOwn(body, 'rol') ? normalizeRole(body.rol) : currentUser.rol,
        telefono: hasOwn(body, 'telefono') ? body.telefono : currentUser.telefono,
        dni_ruc: hasOwn(body, 'dni_ruc') ? body.dni_ruc : currentUser.dni_ruc,
      },
    });

    return serializeUser(user);
  } catch (error) {
    if (error.code === 'P2002') {
      throw httpError(409, 'El email ya se encuentra registrado.');
    }

    throw error;
  }
}

async function deleteUser(userId, currentUser) {
  const parsedUserId = parseUserId(userId);

  if (currentUser.id_usuario === parsedUserId) {
    throw httpError(400, 'No puedes eliminar tu propio usuario administrador desde esta ruta.');
  }

  try {
    await prisma.usuario.delete({
      where: { id_usuario: parsedUserId },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw httpError(404, 'Usuario no encontrado.');
    }

    if (error.code === 'P2003') {
      throw httpError(409, 'No se puede eliminar el usuario porque tiene pedidos asociados.');
    }

    throw error;
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
};
