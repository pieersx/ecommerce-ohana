const assert = require('node:assert/strict');
const { after, test } = require('node:test');

const prisma = require('../src/config/prisma');
const {
  ADMIN_CREDENTIALS,
  CLIENT_CREDENTIALS,
  app,
  login,
  registerClient,
  request,
} = require('./helpers');

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/health responde ok con base de datos conectada', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.database, 'connected');
});

test('registro crea cuenta cliente y devuelve token', async () => {
  const { usuario, token } = await registerClient();

  assert.equal(usuario.rol, 'cliente');
  assert.ok(token.length > 20);
});

test('registro rechaza email duplicado con 409', async () => {
  const { email } = await registerClient();

  const response = await request(app).post('/api/auth/register').send({
    nombre_completo: 'Otro Usuario',
    email,
    password: 'clave-segura-123',
  });

  assert.equal(response.status, 409);
});

test('registro acepta campos opcionales vacíos como envía el formulario web', async () => {
  const response = await request(app).post('/api/auth/register').send({
    nombre_completo: 'Cliente Formulario',
    email: `form-${Date.now()}@test.com`,
    password: 'clave-segura-123',
    telefono: '',
    dni_ruc: '',
    pais_region: 'Perú',
    direccion_calle: '',
    poblacion: 'Lima',
    region_provincia: 'Lima',
    codigo_postal: '',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.usuario.telefono, null);
});

test('registro rechaza password corta con 400', async () => {
  const response = await request(app).post('/api/auth/register').send({
    nombre_completo: 'Usuario Invalido',
    email: 'password-corta@test.com',
    password: '123',
  });

  assert.equal(response.status, 400);
});

test('login con credenciales seed de admin y cliente', async () => {
  const adminToken = await login(ADMIN_CREDENTIALS);
  const clientToken = await login(CLIENT_CREDENTIALS);

  const adminMe = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
  const clientMe = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${clientToken}`);

  assert.equal(adminMe.body.usuario.rol, 'admin');
  assert.equal(clientMe.body.usuario.rol, 'cliente');
});

test('login con contraseña incorrecta devuelve 401', async () => {
  const response = await request(app).post('/api/auth/login').send({
    email: ADMIN_CREDENTIALS.email,
    password: 'incorrecta',
  });

  assert.equal(response.status, 401);
});

test('GET /api/auth/me sin token devuelve 401', async () => {
  const response = await request(app).get('/api/auth/me');

  assert.equal(response.status, 401);
});

test('PUT /api/auth/me actualiza el perfil propio', async () => {
  const { token } = await registerClient();

  const response = await request(app)
    .put('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ telefono: '999000111', direccion_calle: 'Av. Larco 345', poblacion: 'Miraflores' });

  assert.equal(response.status, 200);
  assert.equal(response.body.usuario.telefono, '999000111');
  assert.equal(response.body.usuario.direccion_calle, 'Av. Larco 345');
});

test('PUT /api/auth/me/password exige contraseña actual correcta', async () => {
  const { token, email } = await registerClient();

  const wrong = await request(app)
    .put('/api/auth/me/password')
    .set('Authorization', `Bearer ${token}`)
    .send({ password_actual: 'no-es-esta', password_nueva: 'clave-nueva-123' });

  assert.equal(wrong.status, 401);

  const ok = await request(app)
    .put('/api/auth/me/password')
    .set('Authorization', `Bearer ${token}`)
    .send({ password_actual: 'clave-segura-123', password_nueva: 'clave-nueva-123' });

  assert.equal(ok.status, 200);

  const newLogin = await request(app).post('/api/auth/login').send({ email, password: 'clave-nueva-123' });
  assert.equal(newLogin.status, 200);
});
