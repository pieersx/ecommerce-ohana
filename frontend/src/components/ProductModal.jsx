import { useEffect, useState } from 'react';

import { techniques } from '../data/options';
import { apiRequest } from '../lib/api';
import { getUnitPrice, money } from '../lib/format';

export function ProductModal({ product, onClose, onAdd }) {
  const [detail, setDetail] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');
  const [technique, setTechnique] = useState(techniques[0]);

  useEffect(() => {
    if (!product) return;

    setDetail(product);
    setQuantity(1);
    setCustomText('');
    setTechnique(techniques[0]);
    apiRequest(`/products/${product.id_producto}`).then(setDetail).catch(() => setDetail(product));
  }, [product]);

  if (!product) return null;

  const currentProduct = detail || product;
  const unitPrice = getUnitPrice(currentProduct, quantity);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="presentation" onClick={onClose}>
      <article className="grid max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-auto rounded-lg bg-panel shadow-soft lg:grid-cols-[0.9fr_1.1fr]" onClick={(event) => event.stopPropagation()}>
        <div className="grid min-h-72 place-items-center overflow-hidden bg-mist text-3xl font-black text-forest lg:min-h-[520px]">
          {currentProduct.imagen_url ? <img className="h-full w-full object-cover" src={currentProduct.imagen_url} alt={currentProduct.nombre} /> : 'Ohana'}
        </div>
        <div className="relative grid gap-4 p-6">
          <button className="btn-ghost absolute right-4 top-4" type="button" onClick={onClose}>Cerrar</button>
          <span className="eyebrow">{currentProduct.categoria_nombre || 'Producto'}</span>
          <h2 className="pr-24 text-3xl font-black leading-tight">{currentProduct.nombre}</h2>
          <p className="font-sans leading-7 text-stone">{currentProduct.descripcion}</p>

          <div className="flex flex-wrap gap-2">
            {(currentProduct.escalas_precios || []).map((scale) => (
              <span className="rounded-full bg-mist px-3 py-2 font-sans text-xs font-bold text-forest" key={scale.id_escala || scale.cantidad_min}>
                Desde {scale.cantidad_min}: {money(scale.precio_unitario)}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              Cantidad
              <input min="1" max={currentProduct.stock || 1} type="number" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} />
            </label>
            <label className="field">
              Tecnica
              <select value={technique} onChange={(event) => setTechnique(event.target.value)}>
                {techniques.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <label className="field">
            Texto personalizado
            <textarea value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder="Ej: Para mama, con amor" />
          </label>

          <div className="flex items-center justify-between border-t border-ink/10 pt-4 font-sans">
            <span>{money(unitPrice)} por unidad</span>
            <strong className="text-2xl">{money(unitPrice * quantity)}</strong>
          </div>

          <button
            className="btn-primary min-h-12 w-full active:scale-[0.98]"
            type="button"
            disabled={!currentProduct.stock}
            onClick={() => {
              onAdd(currentProduct, {
                cantidad: quantity,
                texto_personalizado: customText,
                tecnica_personalizacion: technique,
              });
              onClose();
            }}
          >
            Agregar al carrito
          </button>
        </div>
      </article>
    </div>
  );
}
