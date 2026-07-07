const env = require('../config/env');
const prisma = require('../config/prisma');
const httpError = require('../utils/httpError');

async function createExternalCheckout({
  orderId,
  user,
  successUrl,
  cancelUrl,
}) {
  const order = await prisma.pedido.findUnique({
    where: { id_pedido: orderId },
    select: {
      id_pedido: true,
      id_usuario: true,
      estado: true,
      monto_total: true,
      metodo_pago: true,
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

  const shouldSimulateCheckout = !env.paymentCheckoutBaseUrl
    || ['external', 'simulado', 'simulated'].includes(String(env.paymentProvider).toLowerCase());

  if (shouldSimulateCheckout) {
    await prisma.$transaction([
      prisma.pedido.update({
        where: { id_pedido: order.id_pedido },
        data: {
          estado: 'Pagado',
          fecha_actualizacion: new Date(),
        },
      }),
      prisma.mensajePedido.create({
        data: {
          id_pedido: order.id_pedido,
          id_usuario: order.id_usuario,
          tipo: 'Pagado',
          contenido: `Pago simulado recibido por ${order.metodo_pago || env.paymentProvider}. Tu pedido entro a produccion y tu boleta ya esta disponible en Mis pedidos.`,
          visible_cliente: true,
        },
      }),
    ]);

    return {
      provider: 'simulado',
      checkout_url: successUrl,
      order_id: order.id_pedido,
      currency: 'PEN',
      amount: Number(order.monto_total),
      simulated: true,
    };
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
