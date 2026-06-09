import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { emptyProduct, emptyUser, orderStatuses } from '../data/options';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { money } from '../lib/format';

function Dashboard() {
  const { token } = useStore();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    apiRequest('/dashboard', { token }).then(setDashboard);
  }, [token]);

  const metrics = dashboard?.metrics;

  return (
    <section>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Usuarios', metrics?.total_usuarios],
          ['Productos', metrics?.total_productos],
          ['Bajo stock', metrics?.productos_bajo_stock],
          ['Pedidos', metrics?.total_pedidos],
          ['Pendientes', metrics?.pedidos_pendientes],
          ['Ingresos', money(metrics?.ingresos_totales)],
        ].map(([label, value]) => (
          <article className="rounded-lg border border-ink/10 bg-panel p-5 shadow-card" key={label}>
            <span className="font-sans text-sm text-stone">{label}</span>
            <strong className="mt-2 block text-2xl">{value ?? '...'}</strong>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="admin-card">
          <h2>Pedidos recientes</h2>
          {(dashboard?.recent_orders || []).map((order) => (
            <div className="compact-row" key={order.id_pedido}><span>#{order.id_pedido} · {order.cliente_nombre}</span><strong>{money(order.monto_total)}</strong></div>
          ))}
        </div>
        <div className="admin-card">
          <h2>Stock bajo</h2>
          {(dashboard?.low_stock_products || []).map((product) => (
            <div className="compact-row" key={product.id_producto}><span>{product.nombre}</span><strong>{product.stock}</strong></div>
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

function ProductsAdmin() {
  const { setNotice, token } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => Promise.all([apiRequest('/products'), apiRequest('/catalog/categories')]).then(([productData, categoryData]) => {
    setProducts(productData);
    setCategories(categoryData);
    if (!form.id_categoria && categoryData[0]) setForm((current) => ({ ...current, id_categoria: categoryData[0].id_categoria }));
  });

  useEffect(() => { load(); }, []);

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
          stock: Number(form.stock),
          imagen_url: form.imagen_url || null,
          escalas_precios: parsePriceScales(form.escalas_precios),
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
      stock: detail.stock,
      imagen_url: detail.imagen_url || '',
      escalas_precios: (detail.escalas_precios || []).map((scale) => `${scale.cantidad_min}:${scale.precio_unitario}`).join('\n') || `1:${detail.precio_base}`,
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

  return (
    <section className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <form className="admin-form" onSubmit={submit}>
        <h2>{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
        <label className="field">Categoria<select value={form.id_categoria} onChange={(event) => setForm((current) => ({ ...current, id_categoria: event.target.value }))}>{categories.map((category) => <option key={category.id_categoria} value={category.id_categoria}>{category.nombre}</option>)}</select></label>
        <label className="field">Nombre<input required value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} /></label>
        <label className="field">Descripcion<textarea value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">Precio<input required min="0" step="0.01" type="number" value={form.precio_base} onChange={(event) => setForm((current) => ({ ...current, precio_base: event.target.value }))} /></label>
          <label className="field">Stock<input required min="0" type="number" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} /></label>
        </div>
        <label className="field">Imagen URL<input value={form.imagen_url} onChange={(event) => setForm((current) => ({ ...current, imagen_url: event.target.value }))} /></label>
        <label className="field">Escalas<textarea value={form.escalas_precios} onChange={(event) => setForm((current) => ({ ...current, escalas_precios: event.target.value }))} /></label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn-primary min-h-11 w-full" type="submit">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
      </form>
      <div className="admin-card">
        <h2>Productos</h2>
        {products.map((product) => (
          <div className="compact-row" key={product.id_producto}>
            <span>{product.nombre} · {money(product.precio_base)} · stock {product.stock}</span>
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
        {['nombre_completo', 'email', 'password', 'telefono', 'dni_ruc'].map((key) => (
          <label className="field" key={key}>{key.replace('_', ' ')}
            <input required={key !== 'telefono' && key !== 'dni_ruc' && !(editing && key === 'password')} type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
          </label>
        ))}
        <label className="field">Rol<select value={form.rol} onChange={(event) => setForm((current) => ({ ...current, rol: event.target.value }))}><option value="cliente">cliente</option><option value="admin">admin</option></select></label>
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

function OrdersAdmin() {
  const { setNotice, token } = useStore();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const load = () => apiRequest('/orders', { token }).then(setOrders);
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

  return (
    <section className="admin-card">
      <h2>Pedidos</h2>
      {error ? <p className="form-error">{error}</p> : null}
      {orders.map((order) => (
        <div className="compact-row" key={order.id_pedido}>
          <span>#{order.id_pedido} · {order.cliente_nombre} · {money(order.monto_total)}</span>
          <select className="max-w-40" value={order.estado} onChange={(event) => changeStatus(order.id_pedido, event.target.value)}>
            {orderStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
      ))}
    </section>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [tab, setTab] = useState('dashboard');

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
      <span className="eyebrow">Administracion</span>
      <h1 className="mb-6 text-4xl font-black">Centro de control</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {['dashboard', 'productos', 'usuarios', 'pedidos'].map((item) => (
          <button className={`chip ${tab === item ? 'chip-selected' : ''}`} key={item} type="button" onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === 'dashboard' ? <Dashboard /> : null}
      {tab === 'productos' ? <ProductsAdmin /> : null}
      {tab === 'usuarios' ? <UsersAdmin /> : null}
      {tab === 'pedidos' ? <OrdersAdmin /> : null}
    </main>
  );
}
