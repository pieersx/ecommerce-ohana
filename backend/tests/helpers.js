const request = require('supertest');

const app = require('../src/app');

const ADMIN_CREDENTIALS = { email: 'admin@ohana.com', password: 'admin123' };
const CLIENT_CREDENTIALS = { email: 'cliente@correo.com', password: 'cliente123' };

async function login(credentials) {
  const response = await request(app).post('/api/auth/login').send(credentials);

  if (response.status !== 200) {
    throw new Error(`Login falló para ${credentials.email}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return response.body.token;
}

let counter = 0;

async function registerClient(overrides = {}) {
  counter += 1;
  const email = `test-${Date.now()}-${counter}@test.com`;
  const response = await request(app).post('/api/auth/register').send({
    nombre_completo: 'Cliente De Prueba',
    email,
    password: 'clave-segura-123',
    ...overrides,
  });

  if (response.status !== 201) {
    throw new Error(`Registro falló: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { token: response.body.token, usuario: response.body.usuario, email };
}

module.exports = {
  ADMIN_CREDENTIALS,
  CLIENT_CREDENTIALS,
  app,
  login,
  registerClient,
  request,
};
