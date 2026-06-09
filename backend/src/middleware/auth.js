const jwt = require('jsonwebtoken');

const env = require('../config/env');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const publicUserSelect = {
  id_usuario: true,
  nombre_completo: true,
  email: true,
  rol: true,
  telefono: true,
  dni_ruc: true,
  fecha_registro: true,
};

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: payload.userId },
      select: publicUserSelect,
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado para este token.' });
    }

    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
};
