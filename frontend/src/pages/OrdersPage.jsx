import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { formatDate, money } from '../lib/format';

function OrderDetailModal({ adminMode = false, onChanged, onClose, order, token }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!order) return;
    setDetail(order);
    apiRequest(`/orders/${order.id_pedido}`, { token }).then(setDetail).catch((requestError) => setError(requestError.message));
  }, [order, token]);

  if (!order) return null;

  const removeOrder = async () => {
    setError('');
    try {
      await apiRequest(`/orders/${order.id_pedido}`, { method: 'DELETE', token });
      onClose();
      onChanged();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startPayment = async () => {
    setError('');
    setPaymentLoading(true);

    try {
      const checkout = await apiRequest('/payments/checkout', {
        method: 'POST',
        token,
        body: {
          id_pedido: order.id_pedido,
          success_url: `${window.location.origin}/pedidos?payment=success`,
          cancel_url: `${window.location.origin}/pedidos?payment=cancel`,
        },
      });
      window.location.assign(checkout.checkout_url);
    } catch (requestError) {
      setError(requestError.message);
      setPaymentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="presentation" onClick={onClose}>
      <article className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-auto rounded-lg bg-panel p-6 shadow-soft" onClick={(event) => event.stopPropagation()}>
        <button className="btn-ghost float-right" type="button" onClick={onClose}>Cerrar</button>
        <span className="eyebrow">Pedido #{order.id_pedido}</span>
        <h2 className="text-3xl font-black">{detail?.estado}</h2>
        <p className="mt-2 font-sans text-stone">{detail?.direccion_envio} · {detail?.distrito_nombre}</p>
        <div className="my-5 grid gap-3">
          {(detail?.detalles || []).map((line) => (
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-ink/10 pb-3 font-sans" key={line.id_detalle}>
              <span>{line.producto_nombre} x{line.cantidad}</span>
              <strong>{money(line.subtotal)}</strong>
              <small className="col-span-2 text-stone">{line.texto_personalizado || 'Sin texto'} · {line.tecnica_personalizacion || 'Sin tecnica'}</small>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t border-ink/10 pt-4 font-sans">
          <span className="flex justify-between">Productos <strong>{money(detail?.total_productos)}</strong></span>
          <span className="flex justify-between">Envio <strong>{money(detail?.costo_envio)}</strong></span>
          <b className="flex justify-between">Total <strong>{money(detail?.monto_total)}</strong></b>
        </div>
        {error ? <p className="form-error mt-4">{error}</p> : null}
        {!adminMode && detail?.estado === 'Pendiente' ? (
          <button className="btn-primary mt-4 min-h-11 w-full" type="button" onClick={startPayment} disabled={paymentLoading}>
            {paymentLoading ? 'Preparando checkout...' : 'Pagar con checkout externo'}
          </button>
        ) : null}
        {!adminMode && detail?.estado === 'Pendiente' ? (
          <button className="btn-ghost mt-4 min-h-11 w-full text-danger" type="button" onClick={removeOrder}>Eliminar pedido pendiente</button>
        ) : null}
      </article>
    </div>
  );
}

export function OrdersTable({ adminMode = false }) {
  const { token, user } = useStore();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    if (!token) return;
    setLoading(true);
    apiRequest('/orders', { token }).then(setOrders).finally(() => setLoading(false));
  };

  useEffect(loadOrders, [token]);

  return (
    <>
      <div className="rounded-lg border border-ink/10 bg-panel p-4 shadow-card">
        {loading ? <p className="font-sans text-stone">Cargando pedidos...</p> : orders.map((order) => (
          <button className="grid w-full gap-3 border-b border-ink/10 py-4 text-left font-sans hover:bg-forest/5 md:grid-cols-[80px_1fr_auto_auto_auto] md:items-center" type="button" key={order.id_pedido} onClick={() => setSelected(order)}>
            <span>#{order.id_pedido}</span>
            <strong>{order.cliente_nombre || user?.nombre_completo}</strong>
            <span>{formatDate(order.fecha_pedido)}</span>
            <span className={`status-pill status-${order.estado.toLowerCase()}`}>{order.estado}</span>
            <b>{money(order.monto_total)}</b>
          </button>
        ))}
      </div>
      <OrderDetailModal adminMode={adminMode} order={selected} token={token} onClose={() => setSelected(null)} onChanged={loadOrders} />
    </>
  );
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useStore();

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
          <h1 className="text-3xl font-black">Necesitas iniciar sesion</h1>
          <button className="btn-primary mt-5 min-h-11 px-4" type="button" onClick={() => navigate('/login')}>Entrar</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <span className="eyebrow">Pedidos</span>
      <h1 className="mb-6 text-4xl font-black">{user.rol === 'admin' ? 'Pedidos de la tienda' : 'Mis pedidos'}</h1>
      <OrdersTable adminMode={user.rol === 'admin'} />
    </main>
  );
}
