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

  return Number(bestScale?.precio_unitario || product?.precio_actual || product?.precio_oferta || product?.precio_base || 0);
}

export function getOptionGroups(product) {
  return (product?.opciones || []).reduce((groups, option) => {
    const key = option.tipo;
    return {
      ...groups,
      [key]: [...(groups[key] || []), option],
    };
  }, {});
}

export function getOptionSurcharge(product, selections = {}) {
  const options = product?.opciones || [];
  return options.reduce((sum, option) => (
    Object.values(selections).includes(option.nombre)
      ? sum + Number(option.recargo || 0)
      : sum
  ), 0);
}

export function getConfiguredUnitPrice(product, quantity = 1, selections = {}, customText = '') {
  const isPolo = product?.nombre?.toLowerCase?.().includes('polo');
  const textSurcharge = !isPolo && customText?.trim() ? 3 : 0;
  return getUnitPrice(product, quantity) + getOptionSurcharge(product, selections) + textSurcharge;
}

export function stars(value = 0) {
  const rating = Math.round(Number(value || 0));
  return '★★★★★'.split('').map((star, index) => (index < rating ? star : '☆')).join('');
}
