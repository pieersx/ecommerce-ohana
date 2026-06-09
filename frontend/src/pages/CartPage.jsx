import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { paymentOptions } from '../data/options';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { getUnitPrice, money } from '../lib/format';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, clearCart, removeCartItem, setNotice, token, updateCartItem, user } = useStore();
  const [districts, setDistricts] = useState([]);
  const [checkout, setCheckout] = useState({ id_distrito: '', direccion_envio: '', metodo_pago: paymentOptions[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/catalog/districts').then((data) => {
      setDistricts(data);
      if (data[0]) setCheckout((current) => ({ ...current, id_distrito: data[0].id_distrito }));
    });
  }, []);

  const selectedDistrict = districts.find((district) => String(district.id_distrito) === String(checkout.id_distrito));
  const productTotal = cart.reduce((sum, item) => sum + getUnitPrice(item.product, item.cantidad) * item.cantidad, 0);
  const total = productTotal + Number(selectedDistrict?.costo_delivery || 0);

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/login');
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
          detalles: cart.map((item) => ({
            id_producto: item.product.id_producto,
            cantidad: item.cantidad,
            texto_personalizado: item.texto_personalizado || null,
            tecnica_personalizacion: item.tecnica_personalizacion || null,
          })),
        },
      });
      clearCart();
      setNotice({ message: 'Pedido creado correctamente.' });
      navigate('/pedidos');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Carrito</span>
            <h1 className="text-4xl font-black">Tu pedido personalizado</h1>
          </div>
          {cart.length ? <button className="btn-ghost" type="button" onClick={clearCart}>Vaciar</button> : null}
        </div>

        {cart.length ? cart.map((item) => (
          <article className="grid gap-3 border-b border-ink/10 bg-panel/70 p-4 font-sans md:grid-cols-[1fr_96px_auto_auto] md:items-center" key={item.key}>
            <div>
              <strong>{item.product.nombre}</strong>
              <span className="block text-sm text-stone">{item.texto_personalizado || 'Sin texto personalizado'} · {item.tecnica_personalizacion || 'Tecnica por definir'}</span>
            </div>
            <input min="1" type="number" value={item.cantidad} onChange={(event) => updateCartItem(item.key, { cantidad: Math.max(1, Number(event.target.value)) })} />
            <strong>{money(getUnitPrice(item.product, item.cantidad) * item.cantidad)}</strong>
            <button className="btn-ghost text-danger" type="button" onClick={() => removeCartItem(item.key)}>Quitar</button>
          </article>
        )) : (
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
        <form className="mt-5 grid gap-4" onSubmit={submitOrder}>
          <label className="field">
            Distrito
            <select required value={checkout.id_distrito} onChange={(event) => setCheckout((current) => ({ ...current, id_distrito: event.target.value }))}>
              {districts.map((district) => <option key={district.id_distrito} value={district.id_distrito}>{district.nombre} - {money(district.costo_delivery)}</option>)}
            </select>
          </label>
          <label className="field">
            Direccion
            <textarea required value={checkout.direccion_envio} onChange={(event) => setCheckout((current) => ({ ...current, direccion_envio: event.target.value }))} placeholder="Av. Arequipa 1234, Lima" />
          </label>
          <label className="field">
            Metodo de pago
            <select value={checkout.metodo_pago} onChange={(event) => setCheckout((current) => ({ ...current, metodo_pago: event.target.value }))}>
              {paymentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="grid gap-2 border-t border-ink/10 pt-4 font-sans">
            <span className="flex justify-between">Productos <strong>{money(productTotal)}</strong></span>
            <span className="flex justify-between">Envio <strong>{money(selectedDistrict?.costo_delivery)}</strong></span>
            <b className="flex justify-between text-lg">Total <strong>{money(total)}</strong></b>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn-primary min-h-12 w-full" type="submit" disabled={!cart.length || loading}>{user ? loading ? 'Creando pedido...' : 'Crear pedido' : 'Inicia sesion para comprar'}</button>
        </form>
      </aside>
    </main>
  );
}
