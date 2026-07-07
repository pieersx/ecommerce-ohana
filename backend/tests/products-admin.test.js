const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const prisma = require('../src/config/prisma');
const {
  ADMIN_CREDENTIALS,
  app,
  login,
  registerClient,
  request,
} = require('./helpers');

let adminToken;
let clientToken;
let categoryId;

before(async () => {
  adminToken = await login(ADMIN_CREDENTIALS);
  ({ token: clientToken } = await registerClient());

  const categories = await request(app).get('/api/catalog/categories');
  categoryId = categories.body[0].id_categoria;
});

after(async () => {
  await prisma.$disconnect();
});

const productPayload = () => ({
  id_categoria: categoryId,
  nombre: 'Producto Test Admin',
  descripcion: 'Producto creado por el test de integración.',
  precio_base: 50,
  precio_oferta: 39.9,
  stock: 10,
  activo: true,
  destacado: false,
});

test('un invitado no puede crear productos (401)', async () => {
  const response = await request(app).post('/api/products').send(productPayload());

  assert.equal(response.status, 401);
});

test('un cliente no puede crear productos (403)', async () => {
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${clientToken}`)
    .send(productPayload());

  assert.equal(response.status, 403);
});

test('el admin puede crear, actualizar y eliminar un producto', async () => {
  const created = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(productPayload());

  assert.equal(created.status, 201);
  assert.equal(created.body.nombre, 'Producto Test Admin');
  assert.equal(Number(created.body.precio_actual), 39.9);

  const productId = created.body.id_producto;

  const updated = await request(app)
    .put(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ stock: 25, destacado: true });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.stock, 25);
  assert.equal(updated.body.destacado, true);

  const clientDelete = await request(app)
    .delete(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${clientToken}`);

  assert.equal(clientDelete.status, 403);

  const adminDelete = await request(app)
    .delete(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(adminDelete.status, 204);
});

test('solo el admin puede listar usuarios', async () => {
  const asClient = await request(app).get('/api/users').set('Authorization', `Bearer ${clientToken}`);
  assert.equal(asClient.status, 403);

  const asAdmin = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(asAdmin.status, 200);
  assert.ok(asAdmin.body.length >= 2);
});

test('solo el admin puede ver el dashboard', async () => {
  const asGuest = await request(app).get('/api/dashboard');
  assert.equal(asGuest.status, 401);

  const asClient = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${clientToken}`);
  assert.equal(asClient.status, 403);

  const asAdmin = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(asAdmin.status, 200);
});
