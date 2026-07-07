import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../components/Icon';
import { useStore } from '../context/StoreContext';
import { API_URL, apiRequest, resolveMediaUrl, uploadCustomerFile } from '../lib/api';
import { formatDate, money, stars } from '../lib/format';

const timeline = ['Pendiente', 'Pagado', 'Enviado', 'Entregado'];

function OrderDetailModal({ adminMode = false, onChanged, onClose, order, token }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comentario: '' });
  const [confirmAction, setConfirmAction] = useState(null);
  const [messageForm, setMessageForm] = useState({ contenido: '', imagen_url: '' });
  const [messageUploading, setMessageUploading] = useState(false);
  const messageFileRef = useRef(null);
  const { returnItemToCart, setNotice } = useStore();

  useEffect(() => {
    if (!order) return;
    setDetail(order);
    apiRequest(`/orders/${order.id_pedido}`, { token }).then(setDetail).catch((requestError) => setError(requestError.message));
  }, [order, token]);

  if (!order) return null;

  const removeOrder = async () => {
    setError('');
    try {
      const result = await apiRequest(`/orders/${order.id_pedido}`, { method: 'DELETE', token });
      if (result.returned_items) {
        for (const item of result.returned_items) {
          returnItemToCart(item);
        }
      }
      setNotice({ message: 'Pedido eliminado. Los productos fueron devueltos al carrito.' });
      onClose();
      onChanged();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeDetail = async (line) => {
    setError('');
    try {
      const result = await apiRequest(`/orders/${order.id_pedido}/details/${line.id_detalle}`, { method: 'DELETE', token });
      if (result.returned_item) {
        returnItemToCart(result.returned_item);
      }
      setNotice({ message: result.deleted_order ? 'Pedido eliminado y producto devuelto al carrito.' : 'Producto devuelto al carrito y pedido recalculado.' });
      if (result.deleted_order) {
        onClose();
      } else {
        setDetail(result.order);
      }
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

  const submitReview = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiRequest(`/products/${reviewing.id_producto}/reviews`, {
        method: 'POST',
        token,
        body: reviewForm,
      });
      setNotice({ message: 'Reseña publicada como compra verificada.' });
      setReviewing(null);
      setReviewForm({ rating: 5, comentario: '' });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const downloadReceipt = async () => {
    if (!detail) return;
    setError('');
    try {
      const response = await fetch(`${API_URL}/orders/${detail.id_pedido}/receipt.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'No se pudo descargar la boleta.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boleta-ohana-${detail.id_pedido}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!detail) return;
    setError('');
    try {
      await apiRequest(`/orders/${detail.id_pedido}/messages`, {
        method: 'POST',
        token,
        body: {
          contenido: messageForm.contenido.trim() || undefined,
          imagen_url: messageForm.imagen_url || undefined,
        },
      });
      const updated = await apiRequest(`/orders/${detail.id_pedido}`, { token });
      setDetail(updated);
      setMessageForm({ contenido: '', imagen_url: '' });
      onChanged();
      setNotice({ message: 'Mensaje enviado.' });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const uploadMessageImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessageUploading(true);
    setError('');
    try {
      const data = await uploadCustomerFile(file, token);
      setMessageForm((current) => ({ ...current, imagen_url: data.url }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMessageUploading(false);
      if (messageFileRef.current) messageFileRef.current.value = '';
    }
  };

  const currentStep = timeline.indexOf(detail?.estado);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="presentation" onClick={onClose}>
      <article className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-auto rounded-lg bg-panel p-6 shadow-soft" onClick={(event) => event.stopPropagation()}>
        <button className="btn-ghost float-right" type="button" onClick={onClose}>Cerrar</button>
        <span className="eyebrow">Pedido #{order.id_pedido}</span>
        <h2 className="text-3xl font-black">{detail?.estado}</h2>
        <p className="mt-2 font-sans text-stone">{detail?.direccion_envio} · {detail?.distrito_nombre}</p>
        <div className="order-timeline">
          {timeline.map((status, index) => (
            <span className={index <= currentStep ? 'active' : ''} key={status}>{status}</span>
          ))}
        </div>
        <div className="my-5 grid gap-3">
          {(detail?.detalles || []).map((line) => (
            <div className="order-line-detail" key={line.id_detalle}>
              <img src={line.producto_imagen_url || line.imagen_referencia_url} alt={line.producto_nombre} />
              <div>
                <strong>{line.producto_nombre} x{line.cantidad}</strong>
                <small>{line.texto_personalizado || 'Sin texto'} · {line.tecnica_personalizacion || 'Sin tecnica'}</small>
                <small>{[line.talla && `Talla ${line.talla}`, line.tamano && `Tamaño ${line.tamano}`, line.color_producto && `Color ${line.color_producto}`, line.configuracion?.figura && `Figura ${line.configuracion.figura}`, line.cara && `Cara ${line.cara}`].filter(Boolean).join(' · ')}</small>
                {line.configuracion?.indicaciones_adicionales ? <small>Indicaciones: {line.configuracion.indicaciones_adicionales}</small> : null}
              </div>
              <strong>{money(line.subtotal)}</strong>
              <div className="flex flex-wrap gap-2">
                {!adminMode && detail?.estado === 'Pendiente' ? (
                  <button
                    className="btn-ghost text-danger"
                    type="button"
                    onClick={() => setConfirmAction({
                      title: 'Devolver producto al carrito',
                      description: `Se quitara "${line.producto_nombre}" del pedido pendiente y volvera al carrito.`,
                      confirmLabel: 'Confirmar devolucion',
                      onConfirm: () => removeDetail(line),
                    })}
                  >
                    <Icon name="trash" /> Quitar
                  </button>
                ) : null}
                {!adminMode && ['Enviado', 'Entregado'].includes(detail?.estado) ? (
                  <button className="btn-ghost" type="button" onClick={() => setReviewing(line)}><Icon name="star" /> Reseñar</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {(detail?.mensajes || []).length ? (
          <div className="mb-5 grid gap-3 rounded-lg bg-mist/60 p-4 font-sans">
            <strong>Mensajes del pedido</strong>
            {detail.mensajes.map((message) => (
              <article className="rounded-lg bg-panel p-3 text-sm shadow-sm" key={message.id_mensaje}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{message.autor_nombre || message.tipo}</b>
                  <time className="text-xs text-stone">{formatDate(message.fecha)}</time>
                </div>
                {message.contenido ? <p className="mt-1 text-stone">{message.contenido}</p> : null}
                {message.imagen_url ? <img className="mt-2 max-h-48 rounded-lg border border-ink/10 object-cover" src={resolveMediaUrl(message.imagen_url)} alt="Referencia del mensaje" /> : null}
              </article>
            ))}
          </div>
        ) : null}
        <form className="mb-5 grid gap-3 rounded-lg border border-ink/10 bg-mist/40 p-4" onSubmit={sendMessage}>
          <strong>Responder mensaje</strong>
          <label className="field">Mensaje<textarea placeholder="Escribe una respuesta o indicación para este pedido" value={messageForm.contenido} onChange={(event) => setMessageForm((current) => ({ ...current, contenido: event.target.value }))} /></label>
          {messageForm.imagen_url ? (
            <div className="flex items-center gap-3">
              <img className="h-20 w-20 rounded-lg border border-ink/10 object-cover" src={resolveMediaUrl(messageForm.imagen_url)} alt="Adjunto" />
              <button className="btn-ghost text-danger" type="button" onClick={() => setMessageForm((current) => ({ ...current, imagen_url: '' }))}>Quitar foto</button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <input ref={messageFileRef} accept="image/*" className="hidden" type="file" onChange={uploadMessageImage} />
            <button className="btn-ghost" disabled={messageUploading} type="button" onClick={() => messageFileRef.current?.click()}>{messageUploading ? 'Subiendo...' : 'Adjuntar foto'}</button>
            <button className="btn-primary" disabled={!messageForm.contenido.trim() && !messageForm.imagen_url} type="submit">Enviar mensaje</button>
          </div>
        </form>
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
        {detail && ['Pagado', 'Enviado', 'Entregado'].includes(detail.estado) ? (
          <button className="btn-ghost mt-4 min-h-11 w-full" type="button" onClick={downloadReceipt}>
            <Icon name="orders" /> Descargar boleta PDF
          </button>
        ) : null}
        {!adminMode && detail?.estado === 'Pendiente' ? (
          <button
            className="btn-ghost mt-4 min-h-11 w-full text-danger"
            type="button"
            onClick={() => setConfirmAction({
              title: 'Eliminar pedido pendiente',
              description: 'Los productos de este pedido volveran al carrito para que puedas seguir comprando.',
              confirmLabel: 'Eliminar y devolver',
              onConfirm: removeOrder,
            })}
          >
            Eliminar pedido pendiente
          </button>
        ) : null}
        {reviewing ? (
          <form className="mt-5 grid gap-3 rounded-lg border border-ink/10 bg-mist/50 p-4" onSubmit={submitReview}>
            <strong>Reseñar {reviewing.producto_nombre}</strong>
            <label className="field">Rating<select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{stars(rating)} ({rating})</option>)}</select></label>
            <label className="field">Comentario<textarea required minLength="3" value={reviewForm.comentario} onChange={(event) => setReviewForm((current) => ({ ...current, comentario: event.target.value }))} /></label>
            <button className="btn-primary min-h-11" type="submit">Publicar reseña verificada</button>
          </form>
        ) : null}
        {confirmAction ? (
          <div className="confirm-modal" role="presentation" onClick={() => setConfirmAction(null)}>
            <article role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}>
              <span className="eyebrow">Confirmacion</span>
              <h3 id="confirm-title">{confirmAction.title}</h3>
              <p>{confirmAction.description}</p>
              <div className="confirm-actions">
                <button className="btn-ghost" type="button" onClick={() => setConfirmAction(null)}>Cancelar</button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={async () => {
                    const action = confirmAction.onConfirm;
                    setConfirmAction(null);
                    await action();
                  }}
                >
                  {confirmAction.confirmLabel}
                </button>
              </div>
            </article>
          </div>
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('actividad');

  const loadOrders = () => {
    if (!token) return;
    setLoading(true);
    apiRequest('/orders', { token }).then(setOrders).finally(() => setLoading(false));
  };

  useEffect(loadOrders, [token]);

  const visibleOrders = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        if (!adminMode) return true;
        const matchesStatus = !statusFilter || order.estado === statusFilter;
        const matchesQuery = !cleanQuery
          || String(order.id_pedido).includes(cleanQuery.replace(/^#/, ''))
          || String(order.cliente_nombre || '').toLowerCase().includes(cleanQuery);
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'creacion') return new Date(b.fecha_pedido) - new Date(a.fecha_pedido);
        if (sortBy === 'monto') return Number(b.monto_total || 0) - Number(a.monto_total || 0);
        if (sortBy === 'estado') return String(a.estado).localeCompare(String(b.estado));
        return new Date(b.fecha_ultima_actividad || b.fecha_pedido) - new Date(a.fecha_ultima_actividad || a.fecha_pedido);
      });
  }, [adminMode, orders, query, sortBy, statusFilter]);

  return (
    <>
      <div className="rounded-lg border border-ink/10 bg-panel p-4 shadow-card">
        {adminMode ? (
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_220px]">
            <label className="field">Buscar pedido o cliente<input placeholder="Ej. #12 o Ana" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="field">Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              {timeline.map((status) => <option key={status} value={status}>{status}</option>)}
            </select></label>
            <label className="field">Ordenar por<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="actividad">Última actividad</option>
              <option value="creacion">Fecha de creación</option>
              <option value="monto">Monto</option>
              <option value="estado">Estado</option>
            </select></label>
          </div>
        ) : null}
        {loading ? <p className="font-sans text-stone">Cargando pedidos...</p> : null}
        {!loading && !orders.length ? <p className="p-4 font-sans text-stone">Todavia no tienes pedidos. Vuelve al catalogo para crear el primero.</p> : null}
        {!loading && orders.length > 0 && !visibleOrders.length ? <p className="p-4 font-sans text-stone">No hay pedidos con esos filtros.</p> : null}
        {visibleOrders.map((order) => (
          <button className="grid w-full gap-3 border-b border-ink/10 py-4 text-left font-sans hover:bg-forest/5 md:grid-cols-[80px_1fr_160px_160px_auto_auto] md:items-center" type="button" key={order.id_pedido} onClick={() => setSelected(order)}>
            <span>#{order.id_pedido}</span>
            <strong>{order.cliente_nombre || user?.nombre_completo}</strong>
            <span><small className="block text-stone">Creado</small>{formatDate(order.fecha_pedido)}</span>
            <span><small className="block text-stone">Última actividad</small>{formatDate(order.fecha_ultima_actividad || order.fecha_pedido)}</span>
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
