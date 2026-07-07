import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { Icon } from '../components/Icon';
import { useStore } from '../context/StoreContext';
import { sortOptions } from '../data/options';
import { apiRequest } from '../lib/api';
import { money } from '../lib/format';
import heroImage from '../assets/ohana-hero.png';

export function CatalogPage() {
  const { addToCart } = useStore();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [sort, setSort] = useState('recomendados');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('id_categoria', selectedCategory);
    if (query.trim()) params.set('q', query.trim());
    if (sort) params.set('sort', sort);

    Promise.all([apiRequest(`/products?${params.toString()}`), apiRequest('/catalog/categories')])
      .then(([productData, categoryData]) => {
        if (!active) return;
        setProducts(productData);
        setCategories(categoryData);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [query, selectedCategory, sort]);

  const featured = useMemo(() => products.filter((product) => product.destacado).slice(0, 4), [products]);
  const offers = useMemo(() => products.filter((product) => product.precio_oferta).slice(0, 4), [products]);
  const bestSellers = useMemo(() => [...products].sort((a, b) => Number(b.ventas_totales || 0) - Number(a.ventas_totales || 0)).slice(0, 12), [products]);
  const visibleProducts = selectedCategory || query || showAllProducts ? products : bestSellers;
  const showCompleteCatalog = () => {
    setSelectedCategory('');
    setQuery('');
    setShowAllProducts(true);
    window.requestAnimationFrame(() => {
      document.getElementById('productos-todos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <main className="shop-shell">
      <section className="hero-reference">
        <img className="absolute inset-0 h-full w-full object-cover" src={heroImage} alt="Mesa artesanal con regalos personalizados Ohana Moments" />
        <div className="hero-reference-overlay" />
        <div className="relative z-10 max-w-[560px]">
          <h1>Mesa artesanal con regalos personalizados <span>Ohana Moments</span></h1>
          <div className="hero-points">
            <p><Icon name="heart" /> Personalizados con calma y detalle</p>
            <p><Icon name="gift" /> Regalos hechos para Lima, con nombre propio.</p>
          </div>
          <p className="hero-copy">
            Tazas, polos, totes, arreglos y boxes personalizados con delivery por distrito y precios por cantidad.
          </p>
          <a className="btn-primary hero-cta" href="#catalogo">Ver catálogo</a>
        </div>
      </section>

      <section className="trust-strip" aria-label="Beneficios de compra">
        <article><Icon name="box" /><div><strong>{products.length || ' '} productos listos</strong><span>Para personalizar y comprar</span></div></article>
        <article><Icon name="shield" /><div><strong>Pago seguro configurable</strong><span>Yape, transferencia y más</span></div></article>
        <article><Icon name="pin" /><div><strong>Delivery por distrito</strong><span>Lima Metropolitana</span></div></article>
        <article><Icon name="edit" /><div><strong>Personalización visual</strong><span>Texto, imagen y vista previa</span></div></article>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12" id="catalogo">
        <div className="catalog-heading">
          <div>
            <h2>Catálogo Lima Peru</h2>
            <p>Elige, personaliza y compra</p>
          </div>
          <div className="catalog-search">
            <Icon name="search" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, regalo o evento" />
            <button type="button" aria-label="Buscar"><Icon name="search" /></button>
            <select className="field-input min-h-12" value={sort} onChange={(event) => setSort(event.target.value)}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <div className="category-tabs">
          <button className={`chip ${!selectedCategory && sort === 'recomendados' && !showAllProducts ? 'chip-selected' : ''}`} type="button" onClick={() => { setSelectedCategory(''); setShowAllProducts(false); setSort('recomendados'); }}><Icon name="star" /> Recomendados</button>
          <button className={`chip ${!selectedCategory && (sort !== 'recomendados' || showAllProducts) ? 'chip-selected' : ''}`} type="button" onClick={showCompleteCatalog}>Todos</button>
          {categories.map((category) => (
            <button
              className={`chip ${String(selectedCategory) === String(category.id_categoria) ? 'chip-selected' : ''}`}
              key={category.id_categoria}
              type="button"
              onClick={() => { setSelectedCategory(category.id_categoria); setShowAllProducts(false); }}
            >
              {category.nombre}
            </button>
          ))}
        </div>

        {featured.length && !selectedCategory && !query ? (
          <section className="catalog-section">
            <div className="section-title-row">
              <h3>Recomendados para hoy</h3>
              <button type="button" onClick={showCompleteCatalog}>Ver todos <Icon name="arrowRight" /></button>
            </div>
            <div className="featured-grid">
              {featured.map((product) => (
                <ProductCard key={`featured-${product.id_producto}`} product={product} onAdd={() => addToCart(product)} onOpen={() => setSelectedProduct(product)} />
              ))}
            </div>
          </section>
        ) : null}

        {offers.length && !selectedCategory && !query ? (
          <section className="catalog-section">
            <div className="section-title-row">
              <h3>Ofertas con personalización <span>Ahorra hoy</span></h3>
              <button type="button" onClick={showCompleteCatalog}>Ver todos <Icon name="arrowRight" /></button>
            </div>
            <div className="offer-row">
              {offers.map((product) => (
                <button className="offer-tile" key={`offer-${product.id_producto}`} type="button" onClick={() => setSelectedProduct(product)}>
                  <img src={product.imagen_url} alt={product.nombre} />
                  <div>
                    <strong>{product.nombre}</strong>
                    <span>{money(product.precio_actual || product.precio_base)} <small>{money(product.precio_base)}</small></span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {!selectedCategory && !query ? (
          <section className="market-row mb-10">
            <article>
              <Icon name="trophy" />
              <strong>Más vendidos</strong>
              <span>Productos con mayor rotación y reseñas verificadas.</span>
            </article>
            <article>
              <Icon name="edit" />
              <strong>Personalizables</strong>
              <span>Texto, talla, tamaño y vista sobre el producto.</span>
            </article>
            <article>
              <Icon name="gift" />
              <strong>Regalos rápidos</strong>
              <span>Boxes, tazas y tarjetas listas para pedir hoy.</span>
            </article>
          </section>
        ) : null}

        {loading ? (
          <div className="featured-grid">
            {[1, 2, 3].map((item) => <div className="h-[430px] animate-pulse rounded-lg bg-panel shadow-card" key={item} />)}
          </div>
        ) : !products.length ? (
          <div className="rounded-lg border border-dashed border-ink/15 bg-panel p-8 text-center shadow-card">
            <h3 className="text-2xl font-black">No encontramos productos con esos filtros.</h3>
            <p className="mt-2 font-sans text-stone">Prueba con otra categoria o limpia la busqueda.</p>
            <button className="btn-primary mt-5 min-h-11 px-4" type="button" onClick={() => { setQuery(''); setSelectedCategory(''); setSort('recomendados'); }}>Limpiar filtros</button>
          </div>
        ) : (
          <section className="catalog-section" id="productos-todos">
            <div className="section-title-row">
              <h3>{showAllProducts || selectedCategory || query ? 'Todos los productos' : 'Más vendidos'}</h3>
              <button type="button" onClick={showCompleteCatalog}>Ver todos <Icon name="arrowRight" /></button>
            </div>
            <div className="best-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id_producto}
                product={product}
                onAdd={() => addToCart(product)}
                onOpen={() => setSelectedProduct(product)}
              />
            ))}
            </div>
          </section>
        )}
      </section>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
    </main>
  );
}
