const env = require('../config/env');
const prisma = require('../config/prisma');
const httpError = require('../utils/httpError');

async function createExternalCheckout({
  orderId,
  user,
  successUrl,
  cancelUrl,
}) {
  if (!env.paymentCheckoutBaseUrl) {
    throw httpError(503, 'El checkout externo no está configurado.');
  }

  const order = await prisma.pedido.findUnique({
    where: { id_pedido: orderId },
    select: {
      id_pedido: true,
      id_usuario: true,
      estado: true,
      monto_total: true,
    },
  });

  if (!order) {
    throw httpError(404, 'Pedido no encontrado.');
  }

  if (user.rol !== 'admin' && order.id_usuario !== user.id_usuario) {
    throw httpError(403, 'No tienes permisos para pagar este pedido.');
  }

  if (order.estado !== 'Pendiente') {
    throw httpError(409, 'Solo se pueden pagar pedidos pendientes.');
  }

  const checkoutUrl = new URL(env.paymentCheckoutBaseUrl);
  checkoutUrl.searchParams.set('provider', env.paymentProvider);
  checkoutUrl.searchParams.set('order_id', String(order.id_pedido));
  checkoutUrl.searchParams.set('amount', String(order.monto_total));
  checkoutUrl.searchParams.set('currency', 'PEN');
  checkoutUrl.searchParams.set('success_url', successUrl);
  checkoutUrl.searchParams.set('cancel_url', cancelUrl);

  return {
    provider: env.paymentProvider,
    checkout_url: checkoutUrl.toString(),
    order_id: order.id_pedido,
    currency: 'PEN',
    amount: Number(order.monto_total),
  };
}

module.exports = {
  createExternalCheckout,
};
