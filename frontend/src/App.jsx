import { Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/RouteGuards';
import { StoreProvider } from './context/StoreContext';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { EmpresaPage } from './pages/EmpresaPage';
import { MessagesPage } from './pages/MessagesPage';
import { OrdersPage } from './pages/OrdersPage';

export default function App() {
  return (
    <StoreProvider>
      <ErrorBoundary>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<CatalogPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="carrito" element={<CartPage />} />
            <Route path="pedidos" element={<RequireAuth><OrdersPage /></RequireAuth>} />
            <Route path="mensajes" element={<RequireAuth><MessagesPage /></RequireAuth>} />
            <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route path="empresa" element={<EmpresaPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </StoreProvider>
  );
}
