import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../components/Icon';
import { ProductModal } from '../components/ProductModal';
import { paymentOptions } from '../data/options';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { getConfiguredUnitPrice, money } from '../lib/format';

function buildCheckoutFromUser(user) {
  return {
    nombre_completo: user?.nombre_completo || '',
    pais_region: user?.pais_region || 'Perú',
    direccion_calle: user?.direccion_calle || '',
    poblacion: user?.poblacion || 'Lima',
    region_provincia: user?.region_provincia || 'Lima',
    codigo_postal: user?.codigo_postal || '',
    telefono_contacto: user?.telefono || '',
    id_distrito: '',
    direccion_envio: user?.direccion_calle || '',
    metodo_pago: paymentOptions[0],
  };
}

export function CartPage() {
  const navigate = useNavigate();
  const {
    cart,
    clearCart,
    removeCartItem,
    setNotice,
    token,
    updateCartItem,
    user,
  } = useStore();
  const [districts, setDistricts] = useState([]);
  const [checkout, setCheckout] = useState(() => buildCheckoutFromUser(user));
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCheckout((current) => ({ ...buildCheckoutFromUser(user), id_distrito: current.id_distrito, metodo_pago: current.metodo_pago }));
  }, [user]);

  useEffect(() => {
    apiRequest('/catalog/districts').then((data) => {
      setDistricts(data);
      if (data[0]) setCheckout((current) => ({ ...current, id_distrito: current.id_distrito || data[0].id_distrito }));
    });
  }, []);

  const selectedDistrict = districts.find((district) => String(district.id_distrito) === String(checkout.id_distrito));
  const productTotal = cart.reduce((sum, item) => {
    const unitPrice = getConfiguredUnitPrice(item.product, item.cantidad, {
      talla: item.talla,
      tamano: item.tamano,
      color: item.color_producto,
      cara: item.cara,
      figura: item.configuracion?.figura,
    }, item.texto_personalizado) || (Number(item.product.precio_actual || item.product.precio_base || 0) + Number(item.precio_personalizacion || 0));
    return sum + unitPrice * item.cantidad;
  }, 0);
  const total = productTotal + Number(selectedDistrict?.costo_delivery || 0);

  const update = (key, value) => setCheckout((current) => ({ ...current, [key]: value }));

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: '/carrito' } });
      return;
    }

    if (user.rol === 'admin') {
      setError('Los administradores no realizan compras. Cierra sesión y regístrate como cliente.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiRequest('/orders', {
        method: 'POST',
        token,
        body: {
          id_distrito: Number(checkout.id_distrito),
          direccion_envio: checkout.direccion_envio,
          metodo_pago: checkout.metodo_pago,
          pais_region: checkout.pais_region,
          direccion_calle: checkout.direccion_calle,
          poblacion: checkout.poblacion,
          region_provincia: checkout.region_provincia,
          codigo_postal: checkout.codigo_postal || null,
          telefono_contacto: checkout.telefono_contacto,
          detalles: cart.map((item) => ({
            id_producto: item.product.id_producto,
            cantidad: item.cantidad,
            texto_personalizado: item.texto_personalizado || null,
            tecnica_personalizacion: item.tecnica_personalizacion || null,
            talla: item.talla || null,
            tamano: item.tamano || null,
            color_producto: item.color_producto || null,
            fuente_texto: item.fuente_texto || null,
            tamano_texto: item.tamano_texto || null,
            cara: item.cara || null,
            posicion_x: item.posicion_x ?? 50,
            posicion_y: item.posicion_y ?? 50,
            imagen_referencia_url: item.imagen_referencia_url || item.product.imagen_url || null,
            precio_personalizacion: Number(item.precio_personalizacion || 0),
            configuracion: item.configuracion || null,
          })),
        },
      });
      clearCart();
      setNotice({ message: 'Pedido creado correctamente. Completa el pago desde Mis pedidos.' });
      navigate('/pedidos?created=1');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_420px]">
      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Carrito</span>
            <h1 className="text-4xl font-black">Tu pedido personalizado</h1>
          </div>
          {cart.length ? <button className="btn-ghost" type="button" onClick={clearCart}>Vaciar</button> : null}
        </div>

        {cart.length ? cart.map((item) => {
          const unitPrice = getConfiguredUnitPrice(item.product, item.cantidad, {
            talla: item.talla,
            tamano: item.tamano,
            color: item.color_producto,
            cara: item.cara,
            figura: item.configuracion?.figura,
          }, item.texto_personalizado);

          return (
            <article className="cart-line" key={item.key}>
              <img src={item.imagen_referencia_url || item.product.imagen_url} alt={item.product.nombre} />
              <div>
                <strong>{item.product.nombre}</strong>
                <span>{item.texto_personalizado || 'Sin texto'} · {item.tecnica_personalizacion || 'Tecnica por definir'}</span>
                <small>{[item.talla && `Talla ${item.talla}`, item.tamano && `Tamaño ${item.tamano}`, item.color_producto && `Color ${item.color_producto}`, item.configuracion?.figura && `Figura ${item.configuracion.figura}`, item.cara && `Cara ${item.cara}`, item.fuente_texto && `Fuente ${item.fuente_texto}`, item.tamano_texto && `${item.tamano_texto}px`].filter(Boolean).join(' · ') || 'Configuracion estandar'}</small>
                {item.configuracion?.indicaciones_adicionales ? <small>Indicaciones: {item.configuracion.indicaciones_adicionales}</small> : null}
              </div>
              <input min="1" max={item.product.stock || undefined} type="number" value={item.cantidad} onChange={(event) => updateCartItem(item.key, { cantidad: Math.max(1, Math.min(item.product.stock || 999, Number(event.target.value))) })} />
              <strong>{money(unitPrice * item.cantidad)}</strong>
              <div className="flex flex-wrap justify-end gap-2">
                <button className="btn-ghost" type="button" onClick={() => setEditingItem(item)}><Icon name="edit" /> Editar</button>
                <button className="btn-ghost text-danger" type="button" onClick={() => removeCartItem(item.key)}><Icon name="trash" /> Quitar</button>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
            <h2 className="text-2xl font-black">Tu carrito esta listo para empezar.</h2>
            <p className="mt-2 font-sans text-stone">Agrega productos del catalogo y vuelve aqui para finalizar la compra.</p>
            <button className="btn-primary mt-5 min-h-11 px-4" type="button" onClick={() => navigate('/')}>Ir al catalogo</button>
          </div>
        )}
      </section>

      <aside className="h-fit rounded-lg border border-ink/10 bg-panel p-6 shadow-card lg:sticky lg:top-28">
        <span className="eyebrow">Checkout Lima</span>
        <h2 className="text-2xl font-black">Entrega y pago</h2>
        <div className="checkout-steps"><span>1 Carrito</span><span>2 Entrega</span><span>3 Pago</span></div>
        <form className="mt-5 grid gap-4" onSubmit={submitOrder}>
          <label className="field">Nombre y apellidos<input required value={checkout.nombre_completo} onChange={(event) => update('nombre_completo', event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">País/región<input required value={checkout.pais_region} onChange={(event) => update('pais_region', event.target.value)} /></label>
            <label className="field">Teléfono<input required value={checkout.telefono_contacto} onChange={(event) => update('telefono_contacto', event.target.value)} /></label>
          </div>
          <label className="field">Dirección de calle<input required value={checkout.direccion_calle} onChange={(event) => { update('direccion_calle', event.target.value); update('direccion_envio', event.target.value); }} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">Población<input required value={checkout.poblacion} onChange={(event) => update('poblacion', event.target.value)} /></label>
            <label className="field">Región/provincia<input required value={checkout.region_provincia} onChange={(event) => update('region_provincia', event.target.value)} /></label>
          </div>
          <label className="field">Codigo postal<input value={checkout.codigo_postal} onChange={(event) => update('codigo_postal', event.target.value)} /></label>
          <label className="field">
            Distrito de Lima
            <select required value={checkout.id_distrito} onChange={(event) => update('id_distrito', event.target.value)}>
              {districts.map((district) => <option key={district.id_distrito} value={district.id_distrito}>{district.nombre} - {money(district.costo_delivery)}</option>)}
            </select>
            <small className="text-stone">Aún no está habilitado envíos a provincia.</small>
          </label>
          <label className="field">
            Metodo de pago
            <select value={checkout.metodo_pago} onChange={(event) => update('metodo_pago', event.target.value)}>
              {paymentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="grid gap-2 border-t border-ink/10 pt-4 font-sans">
            <span className="flex justify-between">Productos <strong>{money(productTotal)}</strong></span>
            <span className="flex justify-between">Envio <strong>{money(selectedDistrict?.costo_delivery)}</strong></span>
            <b className="flex justify-between text-lg">Total <strong>{money(total)}</strong></b>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn-primary min-h-12 w-full" type="submit" disabled={!cart.length || loading}>{user ? loading ? 'Creando pedido...' : 'Crear pedido' : 'Registrate o inicia sesion'}</button>
        </form>
      </aside>

      <ProductModal
        product={editingItem?.product}
        initialConfig={editingItem}
        submitLabel="Guardar cambios"
        onClose={() => setEditingItem(null)}
        onAdd={(_product, options) => {
          updateCartItem(editingItem.key, {
            cantidad: options.cantidad,
            texto_personalizado: options.texto_personalizado,
            tecnica_personalizacion: options.tecnica_personalizacion,
            talla: options.talla,
            tamano: options.tamano,
            color_producto: options.color_producto,
            fuente_texto: options.fuente_texto,
            tamano_texto: options.tamano_texto,
            cara: options.cara,
            posicion_x: options.posicion_x,
            posicion_y: options.posicion_y,
            imagen_referencia_url: options.imagen_referencia_url,
            precio_personalizacion: options.precio_personalizacion,
            configuracion: options.configuracion,
          });
          setNotice({ message: 'Producto actualizado en el carrito.' });
        }}
      />
    </main>
  );
}
