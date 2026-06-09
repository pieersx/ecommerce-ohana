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
    { to: '/admin', label: 'Admin', icon: 'admin', admin: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/90 px-4 py-3 backdrop-blur-xl lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <button className="flex items-center gap-3 text-left" type="button" onClick={() => navigate('/')}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-forest text-lg font-black text-ivory">O</span>
            <span>
              <strong className="block text-lg leading-none">Ohana Moments</strong>
              <small className="font-sans text-xs text-stone">Regalos personalizados en Lima</small>
            </span>
          </button>

          <nav className="grid grid-cols-2 gap-2 sm:flex sm:justify-center">
            {navItems.map((item) => {
              if (item.auth && !user) return null;
              if (item.admin && user?.rol !== 'admin') return null;

              return (
                <NavLink
                  className={({ isActive }) => [
                    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 font-sans text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-forest/10',
                    isActive ? 'bg-forest text-ivory' : 'text-ink',
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
              <button className="btn-primary min-h-10 px-4" type="button" onClick={() => navigate('/login')}>
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {authLoading ? (
        <div className="grid min-h-[60vh] place-items-center font-sans text-stone">Restaurando sesion...</div>
      ) : (
        <Outlet />
      )}
      <Notice />
    </div>
  );
}
