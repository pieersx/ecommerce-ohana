const assert = require('node:assert/strict');
const { after, test } = require('node:test');

const prisma = require('../src/config/prisma');
const { app, request } = require('./helpers');

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/catalog/districts lista distritos de Lima Metropolitana con costo de delivery', async () => {
  const response = await request(app).get('/api/catalog/districts');

  assert.equal(response.status, 200);
  assert.ok(response.body.length >= 30, `Se esperaban 30+ distritos, llegaron ${response.body.length}`);

  const miraflores = response.body.find((district) => district.nombre === 'Miraflores');
  assert.ok(miraflores, 'Debe existir el distrito Miraflores');
  assert.ok(Number(miraflores.costo_delivery) > 0);
});

test('GET /api/catalog/categories lista categorías', async () => {
  const response = await request(app).get('/api/catalog/categories');

  assert.equal(response.status, 200);
  assert.ok(response.body.length > 0);
  assert.ok(response.body[0].nombre);
});

test('GET /api/products lista productos activos con precio actual', async () => {
  const response = await request(app).get('/api/products');

  assert.equal(response.status, 200);
  assert.ok(response.body.length > 0);

  for (const product of response.body) {
    assert.equal(product.activo, true);
    assert.ok(Number(product.precio_actual) > 0);
  }
});

test('GET /api/products/:id devuelve detalle con imágenes y opciones', async () => {
  const list = await request(app).get('/api/products');
  const first = list.body[0];

  const response = await request(app).get(`/api/products/${first.id_producto}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id_producto, first.id_producto);
  assert.ok(Array.isArray(response.body.imagenes));
  assert.ok(Array.isArray(response.body.opciones));
});

test('GET /api/products/:id con id inexistente devuelve 404', async () => {
  const response = await request(app).get('/api/products/999999');

  assert.equal(response.status, 404);
});
