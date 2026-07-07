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
    ordersByStatus,
    topProductSales,
    bottomProductSales,
    totalResenas,
    resenasPromedio,
    totalCostoEnvio,
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
      take: 8,
    }),
    prisma.pedido.groupBy({
      by: ['estado'],
      _count: { _all: true },
      _sum: { monto_total: true },
    }),
    prisma.detallePedido.groupBy({
      by: ['id_producto'],
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: 5,
    }),
    prisma.detallePedido.groupBy({
      by: ['id_producto'],
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: 'asc' } },
      take: 5,
    }),
    prisma.resenaProducto.count(),
    prisma.resenaProducto.aggregate({ _avg: { rating: true } }),
    prisma.pedido.aggregate({ _sum: { costo_envio: true } }),
  ]);

  const topProductIds = topProductSales.map((item) => item.id_producto);
  const bottomProductIds = bottomProductSales.map((item) => item.id_producto);
  const allProductIds = [...new Set([...topProductIds, ...bottomProductIds])];

  const allProducts = allProductIds.length
    ? await prisma.producto.findMany({
      where: { id_producto: { in: allProductIds } },
      select: { id_producto: true, nombre: true },
    })
    : [];
  const productNameById = new Map(allProducts.map((product) => [product.id_producto, product.nombre]));

  const ingresosTotales = decimalToNumber(ingresos._sum.monto_total) ?? 0;
  const costoEnvioTotal = decimalToNumber(totalCostoEnvio._sum.costo_envio) ?? 0;
  const capitalEstimado = ingresosTotales * 0.4;
  const ganancias = ingresosTotales - capitalEstimado - costoEnvioTotal;

  return {
    metrics: {
      total_usuarios: totalUsuarios,
      total_productos: totalProductos,
      productos_bajo_stock: productosBajoStock,
      total_pedidos: totalPedidos,
      pedidos_pendientes: pedidosPendientes,
      ingresos_totales: ingresosTotales,
      capital_estimado: capitalEstimado,
      ganancias: ganancias,
      costo_envio_total: costoEnvioTotal,
      total_resenas: totalResenas,
      resena_promedio: decimalToNumber(resenasPromedio._avg.rating) ?? 0,
    },
    recent_orders: recentOrders.map(serializeOrderSummary),
    low_stock_products: lowStockProducts.map(serializeProduct),
    stock_threshold: 5,
    orders_by_status: ordersByStatus.map((item) => ({
      estado: item.estado,
      cantidad: item._count._all,
      total: decimalToNumber(item._sum.monto_total) ?? 0,
    })),
    top_products: topProductSales.map((item) => ({
      id_producto: item.id_producto,
      nombre: productNameById.get(item.id_producto) || `Producto #${item.id_producto}`,
      unidades: item._sum.cantidad || 0,
      total: decimalToNumber(item._sum.subtotal) ?? 0,
    })),
    bottom_products: bottomProductSales.map((item) => ({
      id_producto: item.id_producto,
      nombre: productNameById.get(item.id_producto) || `Producto #${item.id_producto}`,
      unidades: item._sum.cantidad || 0,
      total: decimalToNumber(item._sum.subtotal) ?? 0,
    })),
  };
}

module.exports = {
  getDashboardSummary,
};
