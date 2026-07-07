import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { emptyProduct, emptyUser, orderStatuses } from '../data/options';
import { useStore } from '../context/StoreContext';
import { apiRequest, uploadFile } from '../lib/api';
import { money } from '../lib/format';

function Dashboard({ onEditProduct }) {
  const { token } = useStore();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    apiRequest('/dashboard', { token }).then(setDashboard);
  }, [token]);

  const metrics = dashboard?.metrics;
  const maxStatus = Math.max(1, ...(dashboard?.orders_by_status || []).map((item) => item.cantidad));
  const maxProductUnits = Math.max(1, ...(dashboard?.top_products || []).map((item) => item.unidades));

  return (
    <section>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {[
          ['Usuarios', metrics?.total_usuarios],
          ['Productos', metrics?.total_productos],
          ['Bajo stock', metrics?.productos_bajo_stock],
          ['Pedidos', metrics?.total_pedidos],
          ['Pendientes', metrics?.pedidos_pendientes],
          ['Ingresos', money(metrics?.ingresos_totales)],
          ['Capital estimado', money(metrics?.capital_estimado)],
          ['Ganancias', money(metrics?.ganancias)],
          ['Envíos totales', money(metrics?.costo_envio_total)],
          ['Reseñas', `${metrics?.resena_promedio?.toFixed(1) || '0'} (${metrics?.total_resenas || 0})`],
        ].map(([label, value]) => (
          <article className="rounded-lg border border-ink/10 bg-panel p-5 shadow-card" key={label}>
            <span className="font-sans text-sm text-stone">{label}</span>
            <strong className="mt-2 block text-2xl">{value ?? '...'}</strong>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="admin-card">
          <h2>Pedidos por estado</h2>
          <div className="chart-list">
            {(dashboard?.orders_by_status || []).map((item) => (
              <div className="chart-row" key={item.estado}>
                <div><strong>{item.estado}</strong><span>{item.cantidad} pedidos · {money(item.total)}</span></div>
                <i><b style={{ width: `${Math.max(8, (item.cantidad / maxStatus) * 100)}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card">
          <h2>Productos más vendidos</h2>
          <div className="chart-list">
            {(dashboard?.top_products || []).map((item) => (
              <div className="chart-row" key={item.id_producto}>
                <div><strong>{item.nombre}</strong><span>{item.unidades} unidades · {money(item.total)}</span></div>
                <i><b style={{ width: `${Math.max(8, (item.unidades / maxProductUnits) * 100)}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card">
          <h2>Productos menos vendidos</h2>
          <div className="chart-list">
            {(dashboard?.bottom_products || []).map((item) => (
              <div className="chart-row" key={item.id_producto}>
                <div><strong>{item.nombre}</strong><span>{item.unidades} unidades · {money(item.total)}</span></div>
                <i><b style={{ width: `${Math.max(8, (item.unidades / maxProductUnits) * 100)}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card">
          <h2>Pedidos recientes</h2>
          {(dashboard?.recent_orders || []).map((order) => (
            <div className="compact-row" key={order.id_pedido}><span>#{order.id_pedido} · {order.cliente_nombre}</span><strong>{money(order.monto_total)}</strong></div>
          ))}
        </div>
        <div className="admin-card">
          <h2>Stock bajo</h2>
          <p className="stock-note">Alerta configurada en {dashboard?.stock_threshold || 5} unidades o menos. Recomendado: reponer cada producto a 15-20 unidades.</p>
          {(dashboard?.low_stock_products || []).map((product) => (
            <button className="compact-row w-full text-left" key={product.id_producto} type="button" onClick={() => onEditProduct(product)}>
              <span>{product.nombre}</span><strong>Comprar/reponer: {product.stock}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function parsePriceScales(value) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [cantidad, precio] = line.split(':');
    return { cantidad_min: Number(cantidad), precio_unitario: Number(precio) };
  }).filter((scale) => scale.cantidad_min > 0 && scale.precio_unitario >= 0);
}

function parseImages(value, includeDrafts = false) {
  return value.split('\n').map((line, index) => {
    const [vista, url, alt] = line.split('|').map((part) => part?.trim());
    if (!url && !includeDrafts) return null;
    if (!url && !vista && !alt) return null;
    return { vista: vista || 'Principal', url: url || '', alt: alt || '', orden: index };
  }).filter(Boolean);
}

function parseOptions(value, includeDrafts = false) {
  return value.split('\n').map((line, index) => {
    const [tipo, nombre, recargo = '0', requerido = 'true'] = line.split(':').map((part) => part?.trim());
    if ((!tipo || !nombre) && !includeDrafts) return null;
    if (!tipo && !nombre) return null;
    return {
      tipo,
      nombre: nombre || '',
      recargo: Number(recargo || 0),
      requerido: requerido === 'true' || requerido === 'si',
      orden: index,
    };
  }).filter(Boolean);
}

function imagesToText(rows) {
  return rows.map((image) => [image.vista, image.url, image.alt].map((part) => String(part || '').trim()).join('|')).join('\n');
}

function optionsToText(rows) {
  return rows.map((option) => [option.tipo, option.nombre, option.recargo, option.requerido ? 'true' : 'false'].map((part) => String(part ?? '').trim()).join(':')).join('\n');
}

function priceScalesToText(rows) {
  return rows.map((scale) => [scale.cantidad_min, scale.precio_unitario].map((part) => String(part ?? '').trim()).join(':')).join('\n');
}

function ProductsAdmin({ initialEdit, onEditingConsumed }) {
  const { setNotice, token } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const galleryRows = parseImages(form.imagenes || '', true);
  const optionRows = parseOptions(form.opciones || '', true);
  const scaleRows = parsePriceScales(form.escalas_precios || '');

  const load = () => Promise.all([apiRequest('/products'), apiRequest('/catalog/categories')]).then(([productData, categoryData]) => {
    setProducts(productData);
    setCategories(categoryData);
    if (!form.id_categoria && categoryData[0]) setForm((current) => ({ ...current, id_categoria: categoryData[0].id_categoria }));
  });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!initialEdit) return;
    edit(initialEdit).then(() => onEditingConsumed?.());
  }, [initialEdit]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiRequest(editing ? `/products/${editing}` : '/products', {
        method: editing ? 'PUT' : 'POST',
        token,
        body: {
          id_categoria: Number(form.id_categoria),
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          precio_base: Number(form.precio_base),
          precio_oferta: form.precio_oferta ? Number(form.precio_oferta) : null,
          stock: Number(form.stock),
          imagen_url: form.imagen_url || null,
          destacado: Boolean(form.destacado),
          etiqueta_badge: form.etiqueta_badge || null,
          escalas_precios: parsePriceScales(form.escalas_precios),
          imagenes: parseImages(form.imagenes || ''),
          opciones: parseOptions(form.opciones || ''),
        },
      });
      setForm({ ...emptyProduct, id_categoria: categories[0]?.id_categoria || '' });
      setEditing(null);
      setNotice({ message: editing ? 'Producto actualizado.' : 'Producto creado.' });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const edit = async (product) => {
    const detail = await apiRequest(`/products/${product.id_producto}`);
    setEditing(detail.id_producto);
    setForm({
      id_categoria: detail.id_categoria || '',
      nombre: detail.nombre,
      descripcion: detail.descripcion || '',
      precio_base: detail.precio_base,
      precio_oferta: detail.precio_oferta || '',
      stock: detail.stock,
      imagen_url: detail.imagen_url || '',
      destacado: Boolean(detail.destacado),
      etiqueta_badge: detail.etiqueta_badge || '',
      escalas_precios: (detail.escalas_precios || []).map((scale) => `${scale.cantidad_min}:${scale.precio_unitario}`).join('\n') || `1:${detail.precio_base}`,
      imagenes: (detail.imagenes || []).map((image) => `${image.vista}|${image.url}|${image.alt || ''}`).join('\n'),
      opciones: (detail.opciones || []).map((option) => `${option.tipo}:${option.nombre}:${option.recargo}:${option.requerido}`).join('\n'),
    });
  };

  const remove = async (productId) => {
    try {
      await apiRequest(`/products/${productId}`, { method: 'DELETE', token });
      setNotice({ message: 'Producto eliminado.' });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const data = await uploadFile(file, token);
      setForm((current) => ({ ...current, imagen_url: data.url }));
      setNotice({ message: 'Imagen subida correctamente.' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateGalleryRow = (index, key, value) => {
    const rows = galleryRows.length ? galleryRows : [{ vista: 'Principal', url: '', alt: '', orden: 0 }];
    const next = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row));
    setForm((current) => ({ ...current, imagenes: imagesToText(next) }));
  };

  const addGalleryRow = () => {
    const next = [...galleryRows, { vista: 'Nueva vista', url: '', alt: '', orden: galleryRows.length }];
    setForm((current) => ({ ...current, imagenes: imagesToText(next) }));
  };

  const removeGalleryRow = (index) => {
    const next = galleryRows.filter((_, rowIndex) => rowIndex !== index);
    setForm((current) => ({ ...current, imagenes: imagesToText(next) }));
  };

  const updateScaleRow = (index, key, value) => {
    const rows = scaleRows.length ? scaleRows : [{ cantidad_min: 1, precio_unitario: form.precio_base || 0 }];
    const next = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row));
    setForm((current) => ({ ...current, escalas_precios: priceScalesToText(next) }));
  };

  const addScaleRow = () => {
    const next = [
      ...scaleRows,
      { cantidad_min: scaleRows.length ? Number(scaleRows[scaleRows.length - 1].cantidad_min || 1) + 1 : 1, precio_unitario: form.precio_base || 0 },
    ];
    setForm((current) => ({ ...current, escalas_precios: priceScalesToText(next) }));
  };

  const removeScaleRow = (index) => {
    const next = scaleRows.filter((_, rowIndex) => rowIndex !== index);
    setForm((current) => ({ ...current, escalas_precios: priceScalesToText(next) }));
  };

  const updateOptionRow = (index, key, value) => {
    const rows = optionRows.length ? optionRows : [{ tipo: 'color', nombre: '', recargo: 0, requerido: false, orden: 0 }];
    const next = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row));
    setForm((current) => ({ ...current, opciones: optionsToText(next) }));
  };

  const addOptionRow = () => {
    const next = [...optionRows, { tipo: 'color', nombre: '', recargo: 0, requerido: true, orden: optionRows.length }];
    setForm((current) => ({ ...current, opciones: optionsToText(next) }));
  };

  const removeOptionRow = (index) => {
    const next = optionRows.filter((_, rowIndex) => rowIndex !== index);
    setForm((current) => ({ ...current, opciones: optionsToText(next) }));
  };

  return (
    <section className="admin-products-layout">
      <form className="admin-form" onSubmit={submit}>
        <h2>{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
        <label className="field">Categoría<select value={form.id_categoria} onChange={(event) => setForm((current) => ({ ...current, id_categoria: event.target.value }))}>{categories.map((category) => <option key={category.id_categoria} value={category.id_categoria}>{category.nombre}</option>)}</select></label>
        <label className="field">Nombre<input required value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} /></label>
        <label className="field">Descripción<textarea value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">Precio<input required min="0" step="0.01" type="number" value={form.precio_base} onChange={(event) => setForm((current) => ({ ...current, precio_base: event.target.value }))} /></label>
          <label className="field">Precio oferta<input min="0" step="0.01" type="number" value={form.precio_oferta} onChange={(event) => setForm((current) => ({ ...current, precio_oferta: event.target.value }))} /></label>
          <label className="field">Stock<input required min="0" type="number" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} /></label>
          <label className="field">Badge<input value={form.etiqueta_badge} onChange={(event) => setForm((current) => ({ ...current, etiqueta_badge: event.target.value }))} /></label>
        </div>
        <label className="field field-inline"><input checked={form.destacado} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, destacado: event.target.checked }))} /> Destacado</label>
        <div className="field">
          <span>Imagen del producto</span>
          <input ref={fileInputRef} accept="image/*" className="hidden" type="file" onChange={handleFileUpload} />
          {form.imagen_url ? (
            <div className="mt-2 flex items-start gap-3">
              <img alt="Preview" className="h-20 w-20 rounded border border-ink/10 object-cover" src={form.imagen_url} />
              <div className="flex flex-col gap-1">
                <button className="btn-ghost text-sm" disabled={uploading} type="button" onClick={() => fileInputRef.current?.click()}>{uploading ? 'Subiendo...' : 'Cambiar imagen'}</button>
                <button className="btn-ghost text-sm text-danger" type="button" onClick={() => setForm((current) => ({ ...current, imagen_url: '' }))}>Quitar</button>
              </div>
            </div>
          ) : (
            <button className="btn-ghost mt-1 min-h-10 w-full border border-dashed border-ink/20" disabled={uploading} type="button" onClick={() => fileInputRef.current?.click()}>{uploading ? 'Subiendo...' : 'Subir imagen desde tu computadora'}</button>
          )}
          <input className="mt-2" placeholder="O pega una URL de imagen" value={form.imagen_url} onChange={(event) => setForm((current) => ({ ...current, imagen_url: event.target.value }))} />
        </div>
        <div className="admin-editor-block">
          <div className="admin-editor-head">
            <div>
              <strong>Escalas de precio</strong>
              <small className="text-stone">Descuentos por cantidad. Si no hay descuento, deja solo una fila desde 1 unidad.</small>
            </div>
            <button className="btn-ghost text-sm" type="button" onClick={addScaleRow}>Agregar escala</button>
          </div>
          {(scaleRows.length ? scaleRows : [{ cantidad_min: 1, precio_unitario: form.precio_base || 0 }]).map((scale, index) => (
            <div className="admin-scale-row" key={`${scale.cantidad_min}-${index}`}>
              <span className="admin-row-badge">#{index + 1}</span>
              <label className="field">Desde unidades<input min="1" type="number" value={scale.cantidad_min || ''} onChange={(event) => updateScaleRow(index, 'cantidad_min', event.target.value)} /></label>
              <label className="field">Precio unitario S/<input min="0" step="0.01" type="number" value={scale.precio_unitario || ''} onChange={(event) => updateScaleRow(index, 'precio_unitario', event.target.value)} /></label>
              <button className="btn-ghost text-danger" type="button" onClick={() => removeScaleRow(index)}>Quitar</button>
            </div>
          ))}
        </div>
        <div className="admin-editor-block">
          <div className="admin-editor-head">
            <div>
              <strong>Galería del producto</strong>
              <small className="text-stone">Cada fila es una foto que verá el cliente. Usa nombres como Principal, Negro, Blanco Atrás o Medidas.</small>
            </div>
            <button className="btn-ghost text-sm" type="button" onClick={addGalleryRow}>Agregar imagen</button>
          </div>
          {(galleryRows.length ? galleryRows : [{ vista: 'Principal', url: '', alt: '', orden: 0 }]).map((image, index) => (
            <div className="admin-image-row" key={`${image.url}-${index}`}>
              <img alt={image.alt || image.vista || 'Imagen'} src={image.url || form.imagen_url || '/products/taza-11oz-ai.png'} />
              <div className="admin-row-main">
                <label className="field">Nombre de la vista<input placeholder="Ej. Principal, Negro, Medidas" value={image.vista || ''} onChange={(event) => updateGalleryRow(index, 'vista', event.target.value)} /></label>
                <label className="field">Ruta de imagen<input placeholder="/products/imagen.png" value={image.url || ''} onChange={(event) => updateGalleryRow(index, 'url', event.target.value)} /></label>
                <label className="field">Descripción de imagen<input placeholder="Ej. Hoodie negro vista adelante" value={image.alt || ''} onChange={(event) => updateGalleryRow(index, 'alt', event.target.value)} /></label>
              </div>
              <button className="btn-ghost text-danger" type="button" onClick={() => removeGalleryRow(index)}>Quitar</button>
            </div>
          ))}
        </div>
        <div className="admin-editor-block">
          <div className="admin-editor-head">
            <div>
              <strong>Opciones del producto</strong>
              <small className="text-stone">Lo que el cliente puede elegir antes de comprar. El nombre debe coincidir con la vista si debe cambiar la imagen.</small>
            </div>
            <button className="btn-ghost text-sm" type="button" onClick={addOptionRow}>Agregar opción</button>
          </div>
          {(optionRows.length ? optionRows : [{ tipo: 'color', nombre: '', recargo: 0, requerido: true, orden: 0 }]).map((option, index) => (
            <div className="admin-option-row" key={`${option.tipo}-${option.nombre}-${index}`}>
              <span className="admin-row-badge">#{index + 1}</span>
              <label className="field">Tipo de opción
                <select value={option.tipo || 'color'} onChange={(event) => updateOptionRow(index, 'tipo', event.target.value)}>
                  <option value="color">Color</option>
                  <option value="talla">Talla</option>
                  <option value="tamano">Tamaño</option>
                  <option value="cara">Cara</option>
                  <option value="figura">Figura/modelo</option>
                </select>
              </label>
              <label className="field">Nombre visible<input placeholder="Ej. Negro, M, 500 ml" value={option.nombre || ''} onChange={(event) => updateOptionRow(index, 'nombre', event.target.value)} /></label>
              <label className="field">Recargo S/<input min="0" step="0.01" type="number" value={option.recargo || 0} onChange={(event) => updateOptionRow(index, 'recargo', event.target.value)} /></label>
              <button className="btn-ghost text-danger" type="button" onClick={() => removeOptionRow(index)}>Quitar</button>
            </div>
          ))}
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn-primary min-h-11 w-full" type="submit">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
      </form>
      <div className="admin-card">
        <h2>Productos</h2>
        {products.map((product) => (
          <div className="compact-row" key={product.id_producto}>
            <span>{product.nombre} · {money(product.precio_base)} · Stock {product.stock}</span>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => edit(product)}>Editar</button>
              <button className="btn-ghost text-danger" type="button" onClick={() => remove(product.id_producto)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UsersAdmin() {
  const { setNotice, token } = useStore();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => apiRequest('/users', { token }).then(setUsers);
  useEffect(() => { load(); }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const body = { ...form };
    if (editing && !body.password) delete body.password;
    try {
      await apiRequest(editing ? `/users/${editing}` : '/users', { method: editing ? 'PUT' : 'POST', token, body });
      setForm(emptyUser);
      setEditing(null);
      setNotice({ message: editing ? 'Usuario actualizado.' : 'Usuario creado.' });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <form className="admin-form" onSubmit={submit}>
        <h2>{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        {[
          ['nombre_completo', 'Nombre completo'],
          ['email', 'Email'],
          ...(!editing ? [['password', 'Password']] : []),
          ['telefono', 'Telefono'],
          ['dni_ruc', 'DNI/RUC'],
        ].map(([key, label]) => (
          <label className="field" key={key}>{label}
            <input required={key !== 'telefono' && key !== 'dni_ruc' && !(editing && key === 'password')} type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
          </label>
        ))}
        <label className="field">Rol<select value={form.rol} onChange={(event) => setForm((current) => ({ ...current, rol: event.target.value }))}><option value="admin">admin</option><option value="cliente">cliente existente</option></select></label>
        {!editing ? <p className="font-sans text-sm text-stone">Desde aqui se crean administradores. Los clientes se registran por si mismos.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn-primary min-h-11 w-full" type="submit">{editing ? 'Guardar cambios' : 'Crear usuario'}</button>
      </form>
      <div className="admin-card">
        <h2>Usuarios</h2>
        {users.map((user) => (
          <div className="compact-row" key={user.id_usuario}>
            <span>{user.nombre_completo} · {user.email} · {user.rol}</span>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => { setEditing(user.id_usuario); setForm({ ...emptyUser, ...user, password: '' }); }}>Editar</button>
              <button className="btn-ghost text-danger" type="button" onClick={() => apiRequest(`/users/${user.id_usuario}`, { method: 'DELETE', token }).then(load).catch((requestError) => setError(requestError.message))}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewsAdmin() {
  const { token } = useStore();
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ id_producto: '', rating: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const load = (page = 1) => {
    const params = new URLSearchParams({ page, limit: 10 });
    if (filters.id_producto) params.set('id_producto', filters.id_producto);
    if (filters.rating) params.set('rating', filters.rating);

    apiRequest(`/admin/reviews?${params}`, { token }).then((data) => {
      setReviews(data.reviews);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    });
  };

  useEffect(() => {
    apiRequest('/products', { token }).then(setProducts);
  }, [token]);

  useEffect(() => { load(); }, [filters, token]);

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <section className="admin-card">
      <h2>Reseñas ({pagination.total})</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="field">Producto
          <select value={filters.id_producto} onChange={(e) => setFilters((c) => ({ ...c, id_producto: e.target.value }))}>
            <option value="">Todos</option>
            {products.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="field">Rating
          <select value={filters.rating} onChange={(e) => setFilters((c) => ({ ...c, rating: e.target.value }))}>
            <option value="">Todos</option>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{stars(r)} ({r})</option>)}
          </select>
        </label>
      </div>
      {reviews.length === 0 ? (
        <p className="text-stone">No hay reseñas con estos filtros.</p>
      ) : (
        reviews.map((review) => (
          <div className="compact-row" key={review.id_resena}>
            <div className="flex flex-col gap-1">
              <span>{stars(review.rating)} · <strong>{review.cliente_nombre}</strong> · {review.producto_nombre}</span>
              <span className="text-sm text-stone">{review.comentario}</span>
              <small className="text-stone">{review.compra_verificada ? 'Compra verificada' : 'Sin verificar'} · {new Date(review.fecha).toLocaleDateString()}</small>
            </div>
          </div>
        ))
      )}
      {pagination.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-ghost" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Anterior</button>
          <span className="self-center text-sm text-stone">{pagination.page} / {pagination.pages}</span>
          <button className="btn-ghost" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Siguiente →</button>
        </div>
      )}
    </section>
  );
}

function OrdersAdmin() {
  const { setNotice, token } = useStore();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const load = () => apiRequest('/orders', { token }).then((data) => {
    setOrders([...data].sort((a, b) => new Date(b.fecha_ultima_actividad || b.fecha_pedido) - new Date(a.fecha_ultima_actividad || a.fecha_pedido)));
  });
  useEffect(() => { load(); }, [token]);

  const changeStatus = async (orderId, estado) => {
    setError('');
    try {
      await apiRequest(`/orders/${orderId}`, { method: 'PUT', token, body: { estado } });
      setNotice({ message: 'Estado actualizado.' });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const openDetail = async (order) => {
    setError('');
    try {
      setSelected(await apiRequest(`/orders/${order.id_pedido}`, { token }));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="admin-card">
      <h2>Pedidos</h2>
      {error ? <p className="form-error">{error}</p> : null}
      {orders.map((order) => (
        <div className="compact-row" key={order.id_pedido}>
          <span>
            #{order.id_pedido} · {order.cliente_nombre} · {money(order.monto_total)}
            <small className="block text-stone">Última actividad: {new Date(order.fecha_ultima_actividad || order.fecha_pedido).toLocaleString()}</small>
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" type="button" onClick={() => openDetail(order)}>Ver detalles</button>
            <select className="max-w-40" value={order.estado} onChange={(event) => changeStatus(order.id_pedido, event.target.value)}>
              {orderStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        </div>
      ))}
      {selected ? (
        <div className="modal-lite" role="presentation" onClick={() => setSelected(null)}>
          <article onClick={(event) => event.stopPropagation()}>
            <button className="btn-ghost float-right" type="button" onClick={() => setSelected(null)}>Cerrar</button>
            <span className="eyebrow">Pedido #{selected.id_pedido}</span>
            <h3 className="text-2xl font-black">{selected.cliente_nombre}</h3>
            <p className="font-sans text-stone">{selected.cliente_email} · {selected.telefono_contacto || 'Sin telefono'}</p>
            <p className="mt-2 font-sans">{selected.direccion_envio} · {selected.distrito_nombre}</p>
            <div className="my-4 grid gap-3">
              {(selected.detalles || []).map((line) => (
                <div className="order-line-detail" key={line.id_detalle}>
                  <img src={line.producto_imagen_url || line.imagen_referencia_url} alt={line.producto_nombre} />
                  <div>
                    <strong>{line.producto_nombre} x{line.cantidad}</strong>
                    <small>{line.texto_personalizado || 'Sin texto'} · {line.tecnica_personalizacion || 'Sin tecnica'}</small>
                    <small>{[line.talla && `Talla ${line.talla}`, line.tamano && `Tamaño ${line.tamano}`, line.cara && `Cara ${line.cara}`].filter(Boolean).join(' · ')}</small>
                    {line.configuracion?.indicaciones_adicionales ? <small>Indicaciones: {line.configuracion.indicaciones_adicionales}</small> : null}
                  </div>
                  <strong>{money(line.subtotal)}</strong>
                </div>
              ))}
            </div>
            <div className="grid gap-2 border-t border-ink/10 pt-4 font-sans">
              <span className="flex justify-between">Productos <strong>{money(selected.total_productos)}</strong></span>
              <span className="flex justify-between">Envio <strong>{money(selected.costo_envio)}</strong></span>
              <b className="flex justify-between">Total <strong>{money(selected.monto_total)}</strong></b>
            </div>
            {selected.mensajes?.length ? (
              <div className="mt-4 grid gap-2 rounded-lg bg-mist/60 p-4 font-sans">
                <strong>Mensajes del pedido</strong>
                {selected.mensajes.map((msg) => (
                  <p className="text-sm text-stone" key={msg.id_mensaje}><b>{msg.tipo}:</b> {msg.contenido}</p>
                ))}
              </div>
            ) : null}
            <a className="mt-3 inline-flex items-center gap-2 text-sm text-forest underline" href={`https://wa.me/51913912694?text=Hola%20Ohana%2C%20respecto%20al%20pedido%20%23${selected.id_pedido}`} target="_blank" rel="noopener noreferrer">
              Contactar por WhatsApp
            </a>
          </article>
        </div>
      ) : null}
    </section>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [tab, setTab] = useState('dashboard');
  const [productToEdit, setProductToEdit] = useState(null);

  if (user?.rol !== 'admin') {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
          <h1 className="text-3xl font-black">Panel solo para administradores</h1>
          <button className="btn-primary mt-5 min-h-11 px-4" type="button" onClick={() => navigate('/login')}>Entrar como admin</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <span className="eyebrow">Administración</span>
      <h1 className="mb-6 text-4xl font-black">Centro de control</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {['dashboard', 'productos', 'usuarios', 'pedidos', 'resenas'].map((item) => (
          <button className={`chip ${tab === item ? 'chip-selected' : ''}`} key={item} type="button" onClick={() => setTab(item)}>
            {item === 'resenas' ? 'Reseñas' : item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'dashboard' ? <Dashboard onEditProduct={(product) => { setProductToEdit(product); setTab('productos'); }} /> : null}
      {tab === 'productos' ? <ProductsAdmin initialEdit={productToEdit} onEditingConsumed={() => setProductToEdit(null)} /> : null}
      {tab === 'usuarios' ? <UsersAdmin /> : null}
      {tab === 'pedidos' ? <OrdersAdmin /> : null}
      {tab === 'resenas' ? <ReviewsAdmin /> : null}
    </main>
  );
}
