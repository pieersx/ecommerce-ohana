export const paymentOptions = ['yape', 'transferencia', 'efectivo'];
export const orderStatuses = ['Pendiente', 'Pagado', 'Enviado', 'Entregado'];
export const techniques = ['Sublimado', 'Vinil', 'Bordado', 'Grabado laser'];
export const fontOptions = ['Georgia', 'Arial', 'Trebuchet MS', 'Courier New', 'Brush Script MT'];
export const sortOptions = [
  { value: 'recomendados', label: 'Recomendados' },
  { value: 'vendidos', label: 'Mas vendidos' },
  { value: 'precio_asc', label: 'Menor precio' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'nuevos', label: 'Novedades' },
];

export const emptyProduct = {
  id_categoria: '',
  nombre: '',
  descripcion: '',
  precio_base: '',
  precio_oferta: '',
  stock: '',
  imagen_url: '',
  destacado: false,
  etiqueta_badge: '',
  escalas_precios: '1:0',
  imagenes: '',
  opciones: '',
};

export const emptyUser = {
  nombre_completo: '',
  email: '',
  password: '',
  rol: 'admin',
  telefono: '',
  dni_ruc: '',
  pais_region: 'Perú',
  direccion_calle: '',
  poblacion: '',
  region_provincia: 'Lima',
  codigo_postal: '',
};
