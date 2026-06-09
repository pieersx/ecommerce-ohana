import { money } from '../lib/format';
import { Icon } from './Icon';

export function ProductCard({ product, onAdd, onOpen }) {
  return (
    <article className="group grid min-h-[430px] grid-rows-[210px_1fr_auto] overflow-hidden rounded-lg border border-ink/10 bg-panel shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-soft">
      <button className="grid place-items-center overflow-hidden bg-mist text-3xl font-black text-forest" type="button" onClick={onOpen}>
        {product.imagen_url ? (
          <img className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={product.imagen_url} alt={product.nombre} />
        ) : (
          <span>{product.nombre.slice(0, 2).toUpperCase()}</span>
        )}
      </button>
      <div className="p-5">
        <span className="font-sans text-xs font-semibold uppercase text-berry">{product.categoria_nombre || 'Sin categoria'}</span>
        <h3 className="mt-2 text-xl font-bold leading-tight">{product.nombre}</h3>
        <p className="mt-2 line-clamp-2 font-sans text-sm leading-6 text-stone">{product.descripcion || 'Producto personalizado listo para configurar.'}</p>
      </div>
      <div className="grid gap-3 p-5 pt-0">
        <div className="flex items-center justify-between gap-3">
          <strong className="text-xl">{money(product.precio_base)}</strong>
          <small className={product.stock <= 5 ? 'font-sans text-sm font-bold text-danger' : 'font-sans text-sm text-stone'}>
            {product.stock} en stock
          </small>
        </div>
        <button className="btn-primary min-h-11 w-full active:scale-[0.98]" type="button" onClick={onAdd} disabled={product.stock < 1}>
          <Icon name="cart" />
          Agregar
        </button>
      </div>
    </article>
  );
}
