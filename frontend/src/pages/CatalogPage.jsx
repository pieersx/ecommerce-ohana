import { useEffect, useMemo, useState } from 'react';

import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import heroImage from '../assets/ohana-hero.png';

export function CatalogPage() {
  const { addToCart } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([apiRequest('/products'), apiRequest('/catalog/categories')])
      .then(([productData, categoryData]) => {
        if (!active) return;
        setProducts(productData);
        setCategories(categoryData);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = selectedCategory ? String(product.id_categoria) === String(selectedCategory) : true;
    const text = `${product.nombre} ${product.descripcion || ''}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [products, query, selectedCategory]);

  return (
    <main>
      <section className="relative grid min-h-[560px] items-center overflow-hidden border-b border-ink/10 px-4 py-12 lg:px-16">
        <img className="absolute inset-0 h-full w-full object-cover" src={heroImage} alt="Mesa artesanal con regalos personalizados Ohana Moments" />
        <div className="absolute inset-0 bg-gradient-to-r from-ivory via-ivory/80 to-ivory/10" />
        <div className="relative z-10 max-w-xl">
          <span className="eyebrow">Personalizados con calma y detalle</span>
          <h1 className="text-5xl font-black leading-none sm:text-6xl">Regalos hechos para Lima, con nombre propio.</h1>
          <p className="mt-5 max-w-lg font-sans text-lg leading-8 text-stone">
            Tazas, polos, totes, stickers y boxes personalizados con delivery por distrito y precios por cantidad.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 font-sans">
            <a className="btn-primary min-h-12 px-5" href="#catalogo">Ver catalogo</a>
            <span className="font-semibold text-stone">{products.length || ' '} productos listos</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12" id="catalogo">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Catalogo Lima Peru</span>
            <h2 className="text-3xl font-black">Elige, personaliza y compra</h2>
          </div>
          <input
            className="field-input min-h-12 max-w-md"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar producto"
          />
        </div>

        <div className="mb-7 flex flex-wrap gap-2">
          <button className={`chip ${!selectedCategory ? 'chip-selected' : ''}`} type="button" onClick={() => setSelectedCategory('')}>Todos</button>
          {categories.map((category) => (
            <button
              className={`chip ${String(selectedCategory) === String(category.id_categoria) ? 'chip-selected' : ''}`}
              key={category.id_categoria}
              type="button"
              onClick={() => setSelectedCategory(category.id_categoria)}
            >
              {category.nombre}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => <div className="h-[430px] animate-pulse rounded-lg bg-panel shadow-card" key={item} />)}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id_producto}
                product={product}
                onAdd={() => addToCart(product)}
                onOpen={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}
      </section>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
    </main>
  );
}
