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
let product;
let district;

before(async () => {
  adminToken = await login(ADMIN_CREDENTIALS);

  const products = await request(app).get('/api/products?stock=available');
  product = products.body[0];

  const districts = await request(app).get('/api/catalog/districts');
  district = districts.body.find((item) => item.nombre === 'Miraflores');
});

after(async () => {
  await prisma.$disconnect();
});

function orderPayload(quantity = 2) {
  return {
    id_distrito: district.id_distrito,
    direccion_envio: 'Av. Larco 345, Miraflores',
    metodo_pago: 'yape',
    telefono_contacto: '999888777',
    detalles: [{ id_producto: product.id_producto, cantidad: quantity }],
  };
}

test('un invitado no puede crear pedidos (401)', async () => {
  const response = await request(app).post('/api/orders').send(orderPayload());

  assert.equal(response.status, 401);
});

test('ciclo completo: pedido → pago → boleta → estados', async () => {
  const { token } = await registerClient();

  const created = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(orderPayload(2));

  assert.equal(created.status, 201);
  assert.equal(created.body.estado, 'Pendiente');

  const orderId = created.body.id_pedido;
  const expectedProducts = Number(created.body.detalles[0].precio_unitario_fijado) * 2;
  assert.equal(Number(created.body.total_productos), expectedProducts);
  assert.equal(Number(created.body.costo_envio), Number(district.costo_delivery));
  assert.equal(
    Number(created.body.monto_total),
    Number(created.body.total_productos) + Number(created.body.costo_envio),
  );

  // La boleta no está disponible antes de pagar.
  const earlyReceipt = await request(app)
    .get(`/api/orders/${orderId}/receipt.pdf`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(earlyReceipt.status, 409);

  // El cliente no puede cambiar el estado.
  const forbiddenState = await request(app)
    .put(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ estado: 'Entregado' });
  assert.equal(forbiddenState.status, 403);

  // Pago simulado.
  const payment = await request(app)
    .post('/api/payments/checkout')
    .set('Authorization', `Bearer ${token}`)
    .send({
      id_pedido: orderId,
      success_url: 'http://localhost:5173/pedidos',
      cancel_url: 'http://localhost:5173/carrito',
    });

  assert.equal(payment.status, 201);
  assert.equal(payment.body.simulated, true);

  const paid = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(paid.body.estado, 'Pagado');

  // Boleta disponible después del pago.
  const receipt = await request(app)
    .get(`/api/orders/${orderId}/receipt.pdf`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(receipt.status, 200);
  assert.equal(receipt.headers['content-type'], 'application/pdf');

  // El admin avanza el estado del pedido.
  const shipped = await request(app)
    .put(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ estado: 'Enviado' });
  assert.equal(shipped.status, 200);
  assert.equal(shipped.body.estado, 'Enviado');
});

test('un cliente no puede ver ni pagar pedidos de otro cliente', async () => {
  const { token: ownerToken } = await registerClient();
  const { token: intruderToken } = await registerClient();

  const created = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send(orderPayload(1));
  const orderId = created.body.id_pedido;

  const view = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${intruderToken}`);
  assert.ok([403, 404].includes(view.status), `Esperaba 403/404, llegó ${view.status}`);

  const pay = await request(app)
    .post('/api/payments/checkout')
    .set('Authorization', `Bearer ${intruderToken}`)
    .send({
      id_pedido: orderId,
      success_url: 'http://localhost:5173/pedidos',
      cancel_url: 'http://localhost:5173/carrito',
    });
  assert.equal(pay.status, 403);

  const list = await request(app)
    .get('/api/orders')
    .set('Authorization', `Bearer ${intruderToken}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 0);
});

test('el cliente puede eliminar su pedido solo en estado Pendiente', async () => {
  const { token } = await registerClient();

  const created = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(orderPayload(1));
  const orderId = created.body.id_pedido;

  const deleted = await request(app)
    .delete(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(deleted.status, 200);

  const second = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(orderPayload(1));
  const secondId = second.body.id_pedido;

  await request(app)
    .post('/api/payments/checkout')
    .set('Authorization', `Bearer ${token}`)
    .send({
      id_pedido: secondId,
      success_url: 'http://localhost:5173/pedidos',
      cancel_url: 'http://localhost:5173/carrito',
    });

  const deletePaid = await request(app)
    .delete(`/api/orders/${secondId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.ok([403, 409].includes(deletePaid.status), `Esperaba 403/409, llegó ${deletePaid.status}`);
});

test('el pedido descuenta stock y rechaza cantidades mayores al stock', async () => {
  const { token } = await registerClient();

  const before = await request(app).get(`/api/products/${product.id_producto}`);
  const stockBefore = before.body.stock;

  const created = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(orderPayload(1));
  assert.equal(created.status, 201);

  const after = await request(app).get(`/api/products/${product.id_producto}`);
  assert.equal(after.body.stock, stockBefore - 1);

  const tooMany = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(orderPayload(stockBefore + 100));
  assert.ok([400, 409].includes(tooMany.status), `Esperaba 400/409, llegó ${tooMany.status}`);
});
