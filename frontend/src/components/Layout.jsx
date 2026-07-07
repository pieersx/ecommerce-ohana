import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useStore } from '../context/StoreContext';
import { Icon } from './Icon';

function Notice() {
  const { notice, setNotice } = useStore();

  if (!notice) return null;

  return (
    <button
      className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg bg-forest px-4 py-3 font-sans text-sm font-semibold text-ivory shadow-soft animate-pop"
      type="button"
      onClick={() => setNotice(null)}
    >
      {notice.message}
    </button>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const { authLoading, cartCount, logout, user } = useStore();
  const navItems = [
    { to: '/', label: 'Catalogo', icon: 'shop' },
    { to: '/carrito', label: 'Carrito', icon: 'cart', badge: cartCount },
    { to: '/pedidos', label: 'Pedidos', icon: 'orders', auth: true },
    { to: '/mensajes', label: 'Mensajes', icon: 'messages', auth: true },
    { to: '/admin', label: 'Admin', icon: 'admin', admin: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-shell bg-ivory text-ink">
      <header className="site-header">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <button className="flex items-center gap-3 text-left" type="button" onClick={() => navigate('/')}>
            <img className="brand-logo" src="/brand/ohana-reference-logo.png" alt="Ohana Moments" />
          </button>

          <div className="grid gap-2">
            <nav className="hidden gap-2 sm:flex sm:justify-center">
            {navItems.map((item) => {
              if (item.auth && !user) return null;
              if (item.admin && user?.rol !== 'admin') return null;

              return (
                <NavLink
                  className={({ isActive }) => [
                    'nav-link',
                    isActive ? 'nav-link-active' : '',
                  ].join(' ')}
                  key={item.to}
                  to={item.to}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <b className="grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-xs text-ivory">{item.badge}</b>
                  ) : null}
                </NavLink>
              );
            })}
            </nav>
          </div>

          <div className="flex items-center justify-start gap-2 font-sans text-sm text-stone lg:justify-end">
            {user ? (
              <>
                <span className="max-w-48 truncate">{user.nombre_completo}</span>
                <button className="btn-ghost" type="button" onClick={handleLogout}>
                  <Icon name="logout" />
                  Salir
                </button>
              </>
            ) : (
              <button className="btn-primary header-login min-h-10 px-4" type="button" onClick={() => navigate('/login')}>
                Entrar
                <Icon name="user" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="app-main">
        {authLoading ? (
          <div className="grid min-h-[60vh] place-items-center font-sans text-stone">Restaurando sesion...</div>
        ) : (
          <Outlet />
        )}
      </div>
      <footer className="site-footer">
        <div>
          <img className="footer-logo" src="/brand/ohana-reference-logo.png" alt="Ohana Moments" />
          <p>Regalos personalizados hechos en Lima con entrega por distrito y atención cercana.</p>
          <a className="mt-2 inline-block text-sm font-semibold text-forest underline" href="/empresa">Conoce mas sobre nosotros</a>
        </div>
        <div>
          <strong>Compra segura</strong>
          <span>Yape, transferencia y efectivo</span>
          <span>Checkout externo configurable</span>
        </div>
        <div>
          <strong>Soporte</strong>
          <span><a className="text-forest underline" href="https://wa.me/51913912694" target="_blank" rel="noopener noreferrer">WhatsApp: +51 913 912 694</a></span>
          <span>hola@ohanamoments.pe</span>
        </div>
        <div>
          <strong>Delivery</strong>
          <span>Lima Metropolitana</span>
          <span>Envios a provincia aun no habilitados</span>
        </div>
      </footer>
      <nav className="mobile-tabbar">
        {navItems.filter((item) => {
          if (item.auth && !user) return false;
          if (item.admin && user?.rol !== 'admin') return false;
          return true;
        }).slice(0, 5).map((item) => (
          <NavLink className="mobile-tab" key={item.to} to={item.to}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.badge ? <b>{item.badge}</b> : null}
          </NavLink>
        ))}
      </nav>
      <Notice />
    </div>
  );
}
