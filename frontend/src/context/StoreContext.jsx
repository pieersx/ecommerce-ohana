import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest, CART_KEY, getStoredValue, TOKEN_KEY } from '../lib/api';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [cart, setCart] = useState(() => getStoredValue(CART_KEY, []));
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    apiRequest('/auth/me', { token })
      .then((data) => setUser(data.usuario))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  const login = (session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setUser(session.usuario);
    setNotice({ message: `Bienvenido, ${session.usuario.nombre_completo}.` });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const addToCart = (product, options = {}) => {
    const quantity = Number(options.cantidad || 1);
    const key = [
      product.id_producto,
      options.texto_personalizado || '',
      options.tecnica_personalizacion || '',
    ].join('-');

    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => (
          item.key === key
            ? { ...item, cantidad: Math.min(product.stock || 999, item.cantidad + quantity) }
            : item
        ));
      }

      return [
        ...current,
        {
          key,
          product,
          cantidad: Math.min(product.stock || 999, quantity),
          texto_personalizado: options.texto_personalizado || '',
          tecnica_personalizacion: options.tecnica_personalizacion || '',
        },
      ];
    });

    setNotice({ message: `${product.nombre} agregado al carrito.` });
  };

  const updateCartItem = (key, changes) => {
    setCart((current) => current.map((item) => (
      item.key === key ? { ...item, ...changes } : item
    )));
  };

  const removeCartItem = (key) => {
    setCart((current) => current.filter((item) => item.key !== key));
  };

  const value = useMemo(() => ({
    token,
    user,
    authLoading,
    cart,
    cartCount: cart.reduce((sum, item) => sum + item.cantidad, 0),
    notice,
    setNotice,
    login,
    logout,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart: () => setCart([]),
  }), [authLoading, cart, notice, token, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error('useStore debe usarse dentro de StoreProvider.');
  }

  return context;
}
