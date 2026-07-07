export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// Con VITE_API_URL relativo (ej. "/api") el backend sirve el frontend: mismo origen.
export const API_ORIGIN = API_URL.startsWith('http')
  ? API_URL.replace(/\/api\/?$/, '')
  : '';
export const TOKEN_KEY = 'ohana_token';
export const CART_KEY = 'ohana_cart';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'No se pudo completar la solicitud.', response.status);
  }

  return data;
}

export function getStoredValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

export async function uploadFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'No se pudo subir el archivo.', response.status);
  }

  return data;
}

export async function uploadCustomerFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload/customer`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'No se pudo subir el archivo.', response.status);
  }

  return data;
}

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:') || /^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}
