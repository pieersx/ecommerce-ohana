const prisma = require('../config/prisma');
const { decimalToNumber, serializeOrderSummary, serializeProduct } = require('../utils/serializers');

async function getDashboardSummary() {
  const [
    totalUsuarios,
    totalProductos,
    productosBajoStock,
    totalPedidos,
    pedidosPendientes,
    ingresos,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.producto.count(),
    prisma.producto.count({ where: { stock: { lte: 5 } } }),
    prisma.pedido.count(),
    prisma.pedido.count({ where: { estado: 'Pendiente' } }),
    prisma.pedido.aggregate({ _sum: { monto_total: true } }),
    prisma.pedido.findMany({
      include: {
        usuario: {
          select: {
            nombre_completo: true,
            email: true,
          },
        },
        distrito: {
          select: {
            nombre: true,
            costo_delivery: true,
          },
        },
      },
      orderBy: { fecha_pedido: 'desc' },
      take: 5,
    }),
    prisma.producto.findMany({
      where: { stock: { lte: 5 } },
      include: {
        categoria: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: [{ stock: 'asc' }, { nombre: 'asc' }],
      take: 5,
    }),
  ]);

  return {
    metrics: {
      total_usuarios: totalUsuarios,
      total_productos: totalProductos,
      productos_bajo_stock: productosBajoStock,
      total_pedidos: totalPedidos,
      pedidos_pendientes: pedidosPendientes,
      ingresos_totales: decimalToNumber(ingresos._sum.monto_total) ?? 0,
    },
    recent_orders: recentOrders.map(serializeOrderSummary),
    low_stock_products: lowStockProducts.map(serializeProduct),
  };
}

module.exports = {
  getDashboardSummary,
};
