import { money, stars } from '../lib/format';
import { Icon } from './Icon';

export function ProductCard({ product, onAdd, onOpen }) {
  const hasOffer = product.precio_oferta && Number(product.precio_oferta) < Number(product.precio_base);
  const discount = hasOffer
    ? Math.round((1 - Number(product.precio_oferta) / Number(product.precio_base)) * 100)
    : 0;

  return (
    <article className="product-card group">
      <button className="product-card-media" type="button" onClick={onOpen}>
        {product.imagen_url ? (
          <img src={product.imagen_url} alt={product.nombre} />
        ) : (
          <span>{product.nombre.slice(0, 2).toUpperCase()}</span>
        )}
        <div className="product-card-badges">
          {product.etiqueta_badge ? <span>{product.etiqueta_badge}</span> : null}
          {hasOffer ? <b>-{discount}%</b> : null}
        </div>
      </button>
      <div className="product-card-body">
        <h3>{product.nombre}</h3>
        <span className="product-category">{product.categoria_nombre || 'Sin categoria'}</span>
        <p>{product.descripcion || 'Producto personalizado listo para configurar.'}</p>
        <div className="product-rating">
          <span className="text-gold">{stars(product.rating_promedio)}</span>
          <span className="text-stone">{Number(product.rating_promedio || 0).toFixed(1)} · {product.total_resenas || 0} reseñas</span>
        </div>
      </div>
      <div className="product-card-actions">
        <div className="product-price-row">
          <div>
            <strong>{money(product.precio_actual || product.precio_base)}</strong>
            {hasOffer ? <small className="ml-2 font-sans text-sm text-stone line-through">{money(product.precio_base)}</small> : null}
          </div>
          <small className={product.stock <= 5 ? 'font-sans text-sm font-bold text-danger' : 'font-sans text-sm text-stone'}>
            {product.stock <= 5 ? `Solo ${product.stock}` : `${product.stock} en stock`}
          </small>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button className="btn-primary min-h-10 active:scale-[0.98]" type="button" onClick={onAdd} disabled={product.stock < 1}>
            <Icon name="cart" />
            Agregar
          </button>
          <button className="btn-ghost min-h-10 px-3" type="button" onClick={onOpen} aria-label={`Ver ${product.nombre}`}>
            <Icon name="eye" />
          </button>
        </div>
      </div>
    </article>
  );
}
