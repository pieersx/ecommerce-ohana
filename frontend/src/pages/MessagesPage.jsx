import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../components/Icon';
import { useStore } from '../context/StoreContext';
import { apiRequest, resolveMediaUrl, uploadCustomerFile } from '../lib/api';
import { formatDate, money } from '../lib/format';

const WHATSAPP_NUMBER = '51913912694';

export function MessagesPage() {
  const navigate = useNavigate();
  const { token, user } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [messageForm, setMessageForm] = useState({ contenido: '', imagen_url: '' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const loadOrders = () => {
    if (!token) return;
    setLoading(true);
    apiRequest('/orders', { token })
      .then(async (orders) => {
        const details = await Promise.all(orders.map((order) => apiRequest(`/orders/${order.id_pedido}`, { token })));
        setOrders(details.sort((a, b) => new Date(b.fecha_ultima_actividad || b.fecha_pedido) - new Date(a.fecha_ultima_actividad || a.fecha_pedido)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [token]);

  const openOrderDetail = async (order) => {
    setSelectedOrder(order);
    try {
      const detail = await apiRequest(`/orders/${order.id_pedido}`, { token });
      setOrderDetail(detail);
      setMessageForm({ contenido: '', imagen_url: '' });
      setError('');
    } catch (_error) {
      setOrderDetail(null);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!orderDetail) return;
    setError('');
    try {
      await apiRequest(`/orders/${orderDetail.id_pedido}/messages`, {
        method: 'POST',
        token,
        body: {
          contenido: messageForm.contenido.trim() || undefined,
          imagen_url: messageForm.imagen_url || undefined,
        },
      });
      const detail = await apiRequest(`/orders/${orderDetail.id_pedido}`, { token });
      setOrderDetail(detail);
      setSelectedOrder(detail);
      setMessageForm({ contenido: '', imagen_url: '' });
      loadOrders();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await uploadCustomerFile(file, token);
      setMessageForm((current) => ({ ...current, imagen_url: data.url }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
    <main className="mx-auto max-w-5xl px-4 py-10">
      <span className="eyebrow">Mensajes</span>
      <h1 className="mb-6 text-4xl font-black">Mensajes de tus pedidos</h1>
      <section className="grid gap-4">
        {loading ? <p className="font-sans text-stone">Cargando mensajes...</p> : null}
        {!loading && !orders.length ? (
          <div className="rounded-lg border border-dashed border-ink/15 bg-panel p-7 text-center shadow-card">
            <Icon name="messages" className="mx-auto h-8 w-8 text-berry" />
            <h2 className="mt-3 text-2xl font-black">Aun no tienes mensajes.</h2>
            <p className="mt-2 font-sans text-stone">Cuando tu pedido sea pagado, enviado o entregado, lo veras aqui.</p>
          </div>
        ) : null}
        {orders.map((order) => {
          const lastMessage = [...(order.mensajes || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
          return (
          <article className="message-card" key={order.id_pedido}>
            <div>
              <span className={`status-pill status-${order.estado.toLowerCase()}`}>{order.estado}</span>
              <h2>Pedido #{order.id_pedido}</h2>
              <p>{lastMessage?.contenido || 'Sin mensajes todavia.'}</p>
              <button className="btn-ghost mt-2 text-sm" type="button" onClick={() => openOrderDetail(order)}>
                <Icon name="orders" /> Abrir conversación
              </button>
            </div>
            <time>{formatDate(lastMessage?.fecha || order.fecha_pedido)}</time>
          </article>
          );
        })}
      </section>

      <a className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-soft transition hover:scale-110 sm:bottom-5" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp">
        <Icon name="messages" />
      </a>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" role="presentation" onClick={() => { setSelectedOrder(null); setOrderDetail(null); }}>
          <article className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-auto rounded-lg bg-panel p-6 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <button className="btn-ghost float-right" type="button" onClick={() => { setSelectedOrder(null); setOrderDetail(null); }}>Cerrar</button>
            <span className="eyebrow">Pedido #{selectedOrder.id_pedido}</span>
            <h3 className="text-2xl font-black">{orderDetail?.estado || 'Cargando...'}</h3>
            <p className="mt-2 font-sans text-stone">{orderDetail?.direccion_envio} · {orderDetail?.distrito_nombre}</p>
            {orderDetail ? (
              <>
                <div className="my-4 grid gap-3">
                  {(orderDetail.detalles || []).map((line) => (
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
                  <span className="flex justify-between">Productos <strong>{money(orderDetail.total_productos)}</strong></span>
                  <span className="flex justify-between">Envio <strong>{money(orderDetail.costo_envio)}</strong></span>
                  <b className="flex justify-between text-lg">Total <strong>{money(orderDetail.monto_total)}</strong></b>
                </div>
                <div className="mt-4 grid gap-3 rounded-lg bg-mist/60 p-4 font-sans">
                  <strong>Conversación del pedido</strong>
                  {orderDetail.mensajes?.length ? (
                    orderDetail.mensajes.map((msg) => (
                      <article className="rounded-lg bg-panel p-3 text-sm shadow-sm" key={msg.id_mensaje}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <b>{msg.autor_nombre || msg.tipo}</b>
                          <time className="text-xs text-stone">{formatDate(msg.fecha)}</time>
                        </div>
                        {msg.contenido ? <p className="mt-1 text-stone">{msg.contenido}</p> : null}
                        {msg.imagen_url ? <img className="mt-2 max-h-48 rounded-lg border border-ink/10 object-cover" src={resolveMediaUrl(msg.imagen_url)} alt="Referencia del mensaje" /> : null}
                      </article>
                    ))
                  ) : <p className="text-sm text-stone">Aun no hay mensajes en este pedido.</p>}
                </div>
                <form className="mt-4 grid gap-3 rounded-lg border border-ink/10 bg-mist/40 p-4" onSubmit={sendMessage}>
                  <strong>Responder</strong>
                  <label className="field">Mensaje<textarea placeholder="Escribe tu respuesta o referencia" value={messageForm.contenido} onChange={(event) => setMessageForm((current) => ({ ...current, contenido: event.target.value }))} /></label>
                  {messageForm.imagen_url ? (
                    <div className="flex items-center gap-3">
                      <img className="h-20 w-20 rounded-lg border border-ink/10 object-cover" src={resolveMediaUrl(messageForm.imagen_url)} alt="Adjunto" />
                      <button className="btn-ghost text-danger" type="button" onClick={() => setMessageForm((current) => ({ ...current, imagen_url: '' }))}>Quitar foto</button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} accept="image/*" className="hidden" type="file" onChange={uploadImage} />
                    <button className="btn-ghost" disabled={uploading} type="button" onClick={() => fileRef.current?.click()}>{uploading ? 'Subiendo...' : 'Adjuntar foto'}</button>
                    <button className="btn-primary" disabled={!messageForm.contenido.trim() && !messageForm.imagen_url} type="submit">Enviar mensaje</button>
                    <a className="btn-ghost" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, tengo una consulta sobre el pedido #${orderDetail.id_pedido}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  </div>
                  {error ? <p className="form-error">{error}</p> : null}
                </form>
              </>
            ) : <p className="font-sans text-stone">Cargando detalle...</p>}
          </article>
        </div>
      ) : null}
    </main>
  );
}
