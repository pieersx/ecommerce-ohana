export function money(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getUnitPrice(product, quantity = 1) {
  const scales = product?.escalas_precios || [];
  const bestScale = [...scales]
    .filter((scale) => Number(scale.cantidad_min) <= Number(quantity))
    .sort((a, b) => b.cantidad_min - a.cantidad_min)[0];

  return Number(bestScale?.precio_unitario || product?.precio_base || 0);
}
