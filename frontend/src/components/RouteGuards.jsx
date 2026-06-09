import { Navigate, useLocation } from 'react-router-dom';

import { useStore } from '../context/StoreContext';

function GuardMessage({ title, message }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16">
      <section className="rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
        <span className="eyebrow">Acceso</span>
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-3 font-sans text-stone">{message}</p>
      </section>
    </main>
  );
}

export function RequireAuth({ children }) {
  const location = useLocation();
  const { authLoading, user } = useStore();

  if (authLoading) {
    return <GuardMessage title="Restaurando sesion" message="Estamos validando tus credenciales." />;
  }

  if (!user) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  return children;
}

export function RequireAdmin({ children }) {
  const { authLoading, user } = useStore();

  if (authLoading) {
    return <GuardMessage title="Restaurando sesion" message="Estamos validando tus credenciales." />;
  }

  if (!user) {
    return <Navigate replace to="/login" state={{ from: '/admin' }} />;
  }

  if (user.rol !== 'admin') {
    return <GuardMessage title="Panel solo para administradores" message="Tu cuenta no tiene permisos para gestionar la tienda." />;
  }

  return children;
}
