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

  const updateUser = (nextUser) => setUser(nextUser);

  const addToCart = (product, options = {}) => {
    const quantity = Number(options.cantidad || 1);
    const key = [
      product.id_producto,
      options.texto_personalizado || '',
      options.tecnica_personalizacion || '',
      options.talla || '',
      options.tamano || '',
      options.color_producto || '',
      options.cara || '',
      options.configuracion?.figura || '',
      options.fuente_texto || '',
      options.tamano_texto || '',
      options.configuracion?.color_texto || '',
      options.configuracion?.imagen_personalizada_url || '',
      options.configuracion?.indicaciones_adicionales || '',
      options.posicion_x ?? '',
      options.posicion_y ?? '',
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
          talla: options.talla || '',
          tamano: options.tamano || '',
          color_producto: options.color_producto || '',
          fuente_texto: options.fuente_texto || '',
          tamano_texto: options.tamano_texto || 28,
          cara: options.cara || '',
          posicion_x: options.posicion_x ?? 50,
          posicion_y: options.posicion_y ?? 50,
          imagen_referencia_url: options.imagen_referencia_url || product.imagen_url || '',
          precio_personalizacion: Number(options.precio_personalizacion || 0),
          configuracion: options.configuracion || null,
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

  const returnItemToCart = (returnedItem) => {
    if (!returnedItem?.product) return;
    addToCart(returnedItem.product, returnedItem);
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
    updateUser,
    addToCart,
    updateCartItem,
    returnItemToCart,
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
