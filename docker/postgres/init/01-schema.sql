CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
    telefono VARCHAR(20),
    dni_ruc VARCHAR(20),
    pais_region VARCHAR(80) DEFAULT 'Perú',
    direccion_calle TEXT,
    poblacion VARCHAR(120),
    region_provincia VARCHAR(120) DEFAULT 'Lima',
    codigo_postal VARCHAR(20),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS productos (
    id_producto SERIAL PRIMARY KEY,
    id_categoria INT REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_base NUMERIC(10,2) NOT NULL CHECK (precio_base >= 0),
    precio_oferta NUMERIC(10,2) CHECK (precio_oferta IS NULL OR precio_oferta >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen_url VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    etiqueta_badge VARCHAR(40),
    ventas_totales INT NOT NULL DEFAULT 0 CHECK (ventas_totales >= 0),
    rating_promedio NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating_promedio >= 0 AND rating_promedio <= 5),
    total_resenas INT NOT NULL DEFAULT 0 CHECK (total_resenas >= 0)
);

CREATE TABLE IF NOT EXISTS escalas_precios (
    id_escala SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad_min INT NOT NULL CHECK (cantidad_min > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    CONSTRAINT uq_escala_producto UNIQUE (id_producto, cantidad_min)
);

CREATE TABLE IF NOT EXISTS producto_imagenes (
    id_imagen SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    alt VARCHAR(180),
    vista VARCHAR(40) NOT NULL DEFAULT 'Principal',
    orden INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS producto_opciones (
    id_opcion SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    recargo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (recargo >= 0),
    requerido BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS distritos (
    id_distrito SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    costo_delivery NUMERIC(10,2) NOT NULL CHECK (costo_delivery >= 0)
);

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
    id_distrito INT NOT NULL REFERENCES distritos(id_distrito),
    direccion_envio TEXT NOT NULL,
    fecha_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado', 'Enviado', 'Entregado')),
    metodo_pago VARCHAR(50),
    pais_region VARCHAR(80) DEFAULT 'Perú',
    direccion_calle TEXT,
    poblacion VARCHAR(120),
    region_provincia VARCHAR(120) DEFAULT 'Lima',
    codigo_postal VARCHAR(20),
    telefono_contacto VARCHAR(20),
    total_productos NUMERIC(12,2) NOT NULL DEFAULT 0,
    costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES productos(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario_fijado NUMERIC(10,2) NOT NULL CHECK (precio_unitario_fijado >= 0),
    precio_personalizacion NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_personalizacion >= 0),
    texto_personalizado TEXT,
    tecnica_personalizacion VARCHAR(50),
    talla VARCHAR(30),
    tamano VARCHAR(50),
    color_producto VARCHAR(50),
    fuente_texto VARCHAR(80),
    tamano_texto INT,
    cara VARCHAR(40),
    posicion_x NUMERIC(5,2),
    posicion_y NUMERIC(5,2),
    imagen_referencia_url VARCHAR(500),
    configuracion JSONB,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS mensajes_pedidos (
    id_mensaje SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    tipo VARCHAR(40) NOT NULL,
    contenido TEXT NOT NULL,
    imagen_url VARCHAR(500),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visible_cliente BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS resenas_productos (
    id_resena SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_pedido INT REFERENCES pedidos(id_pedido) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comentario TEXT NOT NULL,
    compra_verificada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resena_producto_usuario UNIQUE (id_producto, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo_destacado ON productos(activo, destacado);
CREATE INDEX IF NOT EXISTS idx_escalas_producto ON escalas_precios(id_producto);
CREATE INDEX IF NOT EXISTS idx_imagenes_producto ON producto_imagenes(id_producto);
CREATE INDEX IF NOT EXISTS idx_opciones_producto ON producto_opciones(id_producto);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pedidos_distrito ON pedidos(id_distrito);
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_pedido ON detalle_pedidos(id_pedido);
CREATE INDEX IF NOT EXISTS idx_mensajes_pedido ON mensajes_pedidos(id_pedido);
CREATE INDEX IF NOT EXISTS idx_resenas_producto ON resenas_productos(id_producto);

INSERT INTO usuarios (nombre_completo, email, password_hash, rol, telefono, dni_ruc, direccion_calle, poblacion, codigo_postal)
VALUES
    ('Administrador Ohana', 'admin@ohana.com', '$2b$10$rG06K3z.xCRdgYF9b5wW8.saReRVR3sgE8Rp5nW7W4pkCtJ1P9cCi', 'admin', '999111222', NULL, NULL, NULL, NULL),
    ('Juan Cliente', 'cliente@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '987654321', '70234567', 'Av. Arequipa 1234', 'Lima', '15046'),
    ('Valeria Ramos', 'valeria@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '955444333', '73451290', 'Jr. Las Flores 482', 'Miraflores', '15074'),
    ('Marco Salazar', 'marco@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '944222111', '71888999', 'Av. Primavera 1880', 'Santiago de Surco', '15039')
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (nombre_completo, email, password_hash, rol, telefono, dni_ruc, direccion_calle, poblacion, codigo_postal)
VALUES
    ('Ana Torres', 'ana@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '955100100', '70110011', 'Calle Los Jazmines 144', 'Jesus Maria', '15072'),
    ('Diego Paredes', 'diego@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '955200200', '70220022', 'Av. La Marina 850', 'San Miguel', '15086'),
    ('Camila Nuñez', 'camila@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '955300300', '70330033', 'Jr. Union 325', 'Cercado', '15001'),
    ('Sofia Medina', 'sofia@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '955400400', '70440044', 'Av. Benavides 3300', 'Santiago de Surco', '15039'),
    ('Renato Silva', 'renato@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente', '955500500', '70550055', 'Av. Larco 620', 'Miraflores', '15074')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categorias (nombre)
VALUES
    ('Regalos Personalizados'),
    ('Ropa Personalizada'),
    ('Papeleria Creativa'),
    ('Boxes de Regalo'),
    ('Souvenirs Lima'),
    ('Eventos Corporativos')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO distritos (nombre, costo_delivery)
VALUES
    ('Cercado', 10.00),
    ('Miraflores', 14.00),
    ('San Isidro', 16.00),
    ('Santiago de Surco', 18.00),
    ('Barranco', 15.00),
    ('San Miguel', 13.00),
    ('La Molina', 20.00),
    ('Jesus Maria', 12.00),
    ('Lince', 12.00),
    ('Magdalena del Mar', 13.00),
    ('Pueblo Libre', 12.00),
    ('San Borja', 14.00),
    ('San Luis', 13.00),
    ('San Martin de Porres', 15.00),
    ('Comas', 16.00),
    ('Los Olivos', 14.00),
    ('Rimac', 12.00),
    ('Breña', 11.00),
    ('La Victoria', 11.00),
    ('El Agustino', 12.00),
    ('Santa Anita', 13.00),
    ('Ate', 16.00),
    ('Santa Maria del Mar', 18.00),
    ('Villa El Salvador', 18.00),
    ('Villa Maria del Triunfo', 17.00),
    ('San Juan de Lurigancho', 16.00),
    ('San Juan de Miraflores', 17.00),
    ('Carabayllo', 18.00),
    ('Chaclacayo', 20.00),
    ('Cieneguilla', 22.00),
    ('Lurigancho', 18.00),
    ('Lurin', 20.00),
    ('Pachacamac', 22.00),
    ('Punta Hermosa', 25.00),
    ('Punta Negra', 25.00),
    ('San Bartolo', 28.00),
    ('Surco', 18.00)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (id_categoria, nombre, descripcion, precio_base, precio_oferta, stock, imagen_url, destacado, etiqueta_badge, ventas_totales)
SELECT c.id_categoria, v.nombre, v.descripcion, v.precio_base, v.precio_oferta, v.stock, v.imagen_url, v.destacado, v.etiqueta_badge, v.ventas_totales
FROM (
    VALUES
        ('Regalos Personalizados', 'Taza 11oz', 'Taza sublimada con texto, foto o frase. Ideal para regalos rapidos.', 29.00::NUMERIC(10,2), 24.90::NUMERIC(10,2), 50, '/products/taza-11oz-ai.png', TRUE, 'Oferta', 130),
        ('Ropa Personalizada', 'Polo bordado premium', 'Polo de algodon con bordado frontal o posterior a pedido.', 49.90::NUMERIC(10,2), 44.90::NUMERIC(10,2), 24, '/products/polo-bordado-ai.png', TRUE, 'Mas vendido', 92),
        ('Regalos Personalizados', 'Arreglo floral con maceta', 'Arreglo floral con maceta personalizable por color y texto.', 52.00::NUMERIC(10,2), 47.00::NUMERIC(10,2), 80, '/products/arreglo-floral-macetas.png', FALSE, 'Nuevo', 61),
        ('Boxes de Regalo', 'Box regalo', 'Caja curada con tarjeta, cinta y detalle artesanal.', 69.00::NUMERIC(10,2), 62.00::NUMERIC(10,2), 12, '/products/box-regalo-cerrada.png', TRUE, 'Gift box', 74),
        ('Regalos Personalizados', 'Bolsa tote ilustrada', 'Tote bag de lona con ilustracion, nombre o frase especial.', 32.00::NUMERIC(10,2), NULL, 18, '/products/tote-blanca.png', FALSE, 'Personalizable', 54),
        ('Souvenirs Lima', 'Mini set Costa Verde', 'Set de pines e imanes inspirados en Miraflores, Barranco y la Costa Verde.', 24.90::NUMERIC(10,2), 21.90::NUMERIC(10,2), 45, '/products/pines.png', FALSE, 'Lima', 43),
        ('Souvenirs Lima', 'Taza Lima skyline', 'Taza sublimada con ilustracion de Lima, ideal para recuerdos y turismo local.', 29.00::NUMERIC(10,2), NULL, 35, '/products/tazalima.png', FALSE, 'Nuevo', 37),
        ('Eventos Corporativos', 'Pack bienvenida corporativa', 'Kit con tote, libreta, sticker y taza personalizada para equipos en Lima.', 119.00::NUMERIC(10,2), 109.00::NUMERIC(10,2), 5, '/products/packcorporativo.png', TRUE, 'Corporativo', 28),
        ('Papeleria Creativa', 'Tarjetas kraft personalizadas', 'Tarjetas para mensajes, marcas pequenas y emprendimientos con acabado artesanal.', 22.00::NUMERIC(10,2), NULL, 65, '/products/tarjetas.png', FALSE, 'Eco', 49),
        ('Ropa Personalizada', 'Hoodie iniciales bordadas', 'Polera suave con iniciales, fecha especial o logo pequeno.', 89.00::NUMERIC(10,2), 79.00::NUMERIC(10,2), 5, '/products/hoodie-blanco-adelante.png', TRUE, 'Invierno', 22),
        ('Regalos Personalizados', 'Termo grabado acero', 'Termo de acero con grabado laser para nombre, logo o frase.', 59.00::NUMERIC(10,2), 54.00::NUMERIC(10,2), 4, '/products/termo-ai.png', TRUE, 'Bajo stock', 31),
        ('Boxes de Regalo', 'Mini box cumpleaños', 'Box pequeno con tarjeta, taza mini y snack decorativo.', 45.00::NUMERIC(10,2), NULL, 20, '/products/box-cumple-taza.png', FALSE, 'Rapido', 47),
        ('Regalos Personalizados', 'Mini arreglo floral', 'Mini arreglo floral con flores rosa, blanco o rojo para recuerdos y detalles.', 39.90::NUMERIC(10,2), 34.90::NUMERIC(10,2), 55, '/products/mini-arreglo-rosa.png', FALSE, 'Nuevo', 26),
        ('Eventos Corporativos', 'Mousepad corporativo personalizado', 'Mousepad con logo, nombres de equipo o frase de onboarding.', 35.00::NUMERIC(10,2), NULL, 30, '/products/mousepad-negro.png', FALSE, 'Oficina', 19),
        ('Papeleria Creativa', 'Cuaderno personalizado tapa dura', 'Cuaderno con portada personalizada y tarjeta dedicatoria.', 38.00::NUMERIC(10,2), 34.00::NUMERIC(10,2), 40, '/products/cuadernoscolores.png', TRUE, 'Regalo rapido', 33),
        ('Regalos Personalizados', 'Arreglo floral premium', 'Arreglo floral premium con caja personalizable; el arreglo mantiene el modelo elegido.', 58.00::NUMERIC(10,2), 52.00::NUMERIC(10,2), 60, '/products/arreglo-premium-negro.png', TRUE, 'Nuevo', 15),
        ('Regalos Personalizados', 'Pack con Flores', 'Pack de flores decorativas con etiqueta o letra personalizada.', 35.00::NUMERIC(10,2), NULL, 25, '/products/pack-flores-caja.png', FALSE, 'Temporada', 10)
) AS v(categoria, nombre, descripcion, precio_base, precio_oferta, stock, imagen_url, destacado, etiqueta_badge, ventas_totales)
JOIN categorias c ON c.nombre = v.categoria
ON CONFLICT DO NOTHING;

INSERT INTO producto_imagenes (id_producto, url, alt, vista, orden)
SELECT p.id_producto, v.url, v.alt, v.vista, v.orden
FROM productos p
JOIN (
    VALUES
        ('Taza 11oz', '/products/taza-11oz-ai.png', 'Taza personalizada vista frontal', 'Frontal', 1),
        ('Taza 11oz', '/products/taza-blanco-mockup.png', 'Taza blanca color blanco', 'Blanco', 2),
        ('Taza 11oz', '/products/taza-crema-mockup.png', 'Taza crema color crema', 'Crema', 3),
        ('Taza 11oz', '/products/taza-rosa-mockup.png', 'Taza rosa coral color rosa coral', 'Rosa coral', 4),
        ('Polo bordado premium', '/products/polo-blanco-adelante.png', 'Polo blanco vista adelante', 'Blanco Adelante', 1),
        ('Polo bordado premium', '/products/polo-blanco-atras.png', 'Polo blanco vista atrás', 'Blanco Atrás', 2),
        ('Polo bordado premium', '/products/polo-negro-adelante.png', 'Polo negro vista adelante', 'Negro Adelante', 3),
        ('Polo bordado premium', '/products/polo-negro-atras.png', 'Polo negro vista atrás', 'Negro Atrás', 4),
        ('Polo bordado premium', '/products/polo-verde-bosque-adelante.png', 'Polo verde bosque vista adelante', 'Verde bosque Adelante', 5),
        ('Polo bordado premium', '/products/polo-verde-bosque-atras.png', 'Polo verde bosque vista atrás', 'Verde bosque Atrás', 6),
        ('Polo bordado premium', '/products/polo-medidas.png', 'Tabla de medidas S M L XL para polo', 'Medidas', 7),
        ('Bolsa tote ilustrada', '/products/tote-blanca.png', 'Tote blanca', 'Blanco', 1),
        ('Bolsa tote ilustrada', '/products/tote-negra.png', 'Tote negra', 'Negro', 2),
        ('Box regalo', '/products/box-regalo-abierta.png', 'Box regalo caja abierta', 'Caja abierta', 1),
        ('Box regalo', '/products/box-regalo-cerrada.png', 'Box regalo caja cerrada', 'Caja cerrada', 2),
        ('Arreglo floral con maceta', '/products/arreglo-floral-macetas.png', 'Arreglo floral con macetas por color', 'Principal', 1),
        ('Arreglo floral con maceta', '/products/arreglo-maceta-blanca.png', 'Maceta blanca para arreglo floral', 'Blanco', 2),
        ('Arreglo floral con maceta', '/products/arreglo-maceta-terracota.png', 'Maceta terracota para arreglo floral', 'Terracota', 3),
        ('Arreglo floral con maceta', '/products/arreglo-maceta-rosa.png', 'Maceta rosa coral para arreglo floral', 'Rosa coral', 4),
        ('Arreglo floral con maceta', '/products/arreglo-flores-detalle.png', 'Detalle de flores del arreglo', 'Detalle', 5),
        ('Tarjetas kraft personalizadas', '/products/tarjetas.png', 'Tarjetas kraft personalizadas', 'Vista plana', 1),
        ('Mini set Costa Verde', '/products/pines.png', 'Set Costa Verde', 'Principal', 1),
        ('Taza Lima skyline', '/products/tazalima.png', 'Taza con ilustracion Lima skyline', 'Principal', 1),
        ('Pack bienvenida corporativa', '/products/packcorporativo.png', 'Pack corporativo sobre escritorio', 'Principal', 1),
        ('Termo grabado acero', '/products/termo-ai.png', 'Termo acero personalizado', 'Frontal', 1),
        ('Termo grabado acero', '/products/termo-acero-color.png', 'Termo color acero', 'Acero', 2),
        ('Termo grabado acero', '/products/termo-negro-mate-color.png', 'Termo color negro mate', 'Negro mate', 3),
        ('Termo grabado acero', '/products/termo-rosa-color.png', 'Termo color rosa', 'Rosa', 4),
        ('Hoodie iniciales bordadas', '/products/hoodie-blanco-adelante.png', 'Hoodie blanco vista adelante', 'Blanco Adelante', 1),
        ('Hoodie iniciales bordadas', '/products/hoodie-blanco-atras.png', 'Hoodie blanco vista atrás', 'Blanco Atrás', 2),
        ('Hoodie iniciales bordadas', '/products/hoodie-crema-adelante.png', 'Hoodie crema vista adelante', 'Crema Adelante', 3),
        ('Hoodie iniciales bordadas', '/products/hoodie-crema-atras.png', 'Hoodie crema vista atrás', 'Crema Atrás', 4),
        ('Hoodie iniciales bordadas', '/products/hoodie-negro-adelante.png', 'Hoodie negro vista adelante', 'Negro Adelante', 5),
        ('Hoodie iniciales bordadas', '/products/hoodie-negro-atras.png', 'Hoodie negro vista atrás', 'Negro Atrás', 6),
        ('Hoodie iniciales bordadas', '/products/hoodie-verde-bosque-adelante.png', 'Hoodie verde bosque vista adelante', 'Verde bosque Adelante', 7),
        ('Hoodie iniciales bordadas', '/products/hoodie-verde-bosque-atras.png', 'Hoodie verde bosque vista atrás', 'Verde bosque Atrás', 8),
        ('Hoodie iniciales bordadas', '/products/hoodie-medidas.png', 'Tabla de medidas S M L XL para hoodie', 'Medidas', 9),
        ('Mini box cumpleaños', '/products/box-cumple-taza.png', 'Mini box con taza', 'Box con taza', 1),
        ('Mini box cumpleaños', '/products/box-cumple-peluche.png', 'Mini box con peluche', 'Box con peluche', 2),
        ('Mini arreglo floral', '/products/mini-arreglo-rosa.png', 'Mini arreglo floral rosa', 'Rosa', 1),
        ('Mini arreglo floral', '/products/mini-arreglo-rosa-caja.png', 'Mini arreglo floral rosa en caja', 'Rosa caja', 2),
        ('Mini arreglo floral', '/products/mini-arreglo-blanco.png', 'Mini arreglo floral blanco', 'Blanco', 3),
        ('Mini arreglo floral', '/products/mini-arreglo-blanco-caja.png', 'Mini arreglo floral blanco en caja', 'Blanco caja', 4),
        ('Mini arreglo floral', '/products/mini-arreglo-rojo.png', 'Mini arreglo floral rojo', 'Rojo', 5),
        ('Mini arreglo floral', '/products/mini-arreglo-rojo-caja.png', 'Mini arreglo floral rojo en caja', 'Rojo caja', 6),
        ('Mousepad corporativo personalizado', '/products/mousepad-negro.png', 'Mousepad corporativo negro', 'Negro', 1),
        ('Mousepad corporativo personalizado', '/products/mousepad-negro-detalle.png', 'Mousepad corporativo negro detalle', 'Negro detalle', 2),
        ('Mousepad corporativo personalizado', '/products/mousepad-azul.png', 'Mousepad corporativo azul', 'Azul noche', 3),
        ('Mousepad corporativo personalizado', '/products/mousepad-azul-detalle.png', 'Mousepad corporativo azul detalle', 'Azul noche detalle', 4),
        ('Cuaderno personalizado tapa dura', '/products/cuadernoscolores.png', 'Cuaderno personalizado tapa dura', 'Principal', 1),
        ('Arreglo floral premium', '/products/arreglo-premium-negro.png', 'Arreglo floral premium modelo negro', 'Negro', 1),
        ('Arreglo floral premium', '/products/arreglo-premium-blanco.png', 'Arreglo floral premium modelo blanco', 'Blanco', 2),
        ('Arreglo floral premium', '/products/arreglo-premium-rojo.png', 'Arreglo floral premium modelo rojo', 'Rojo', 3),
        ('Arreglo floral premium', '/products/arreglo-premium-caja-cerrada.png', 'Caja premium cerrada personalizable', 'Caja cerrada', 4),
        ('Arreglo floral premium', '/products/arreglo-premium-caja-abierta.png', 'Caja premium abierta con arreglo floral', 'Caja abierta', 5),
        ('Arreglo floral premium', '/products/arreglo-premium-detalle.png', 'Detalle del arreglo floral premium', 'Detalle', 6),
        ('Pack con Flores', '/products/pack-flores-caja.png', 'Pack con flores en caja cerrada', 'Caja', 1),
        ('Pack con Flores', '/products/pack-flores-abierto.png', 'Pack con flores abierto', 'Abierto', 2),
        ('Pack con Flores', '/products/pack-flores-ramo.png', 'Ramo del pack con flores', 'Ramo', 3)
) AS v(nombre, url, alt, vista, orden) ON p.nombre = v.nombre
WHERE NOT EXISTS (
    SELECT 1 FROM producto_imagenes i WHERE i.id_producto = p.id_producto AND i.url = v.url
);

INSERT INTO producto_opciones (id_producto, tipo, nombre, recargo, requerido, orden)
SELECT p.id_producto, v.tipo, v.nombre_opcion, v.recargo, v.requerido, v.orden
FROM productos p
JOIN (
    VALUES
        ('Polo bordado premium', 'talla', 'S', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Polo bordado premium', 'talla', 'M', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Polo bordado premium', 'talla', 'L', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Polo bordado premium', 'talla', 'XL', 4.00::NUMERIC(10,2), TRUE, 4),
        ('Polo bordado premium', 'cara', 'Ninguno', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Polo bordado premium', 'cara', 'Adelante', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Polo bordado premium', 'cara', 'Atrás', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Polo bordado premium', 'cara', 'Ambos', 8.00::NUMERIC(10,2), TRUE, 4),
        ('Hoodie iniciales bordadas', 'talla', 'S', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Hoodie iniciales bordadas', 'talla', 'M', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Hoodie iniciales bordadas', 'talla', 'L', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Hoodie iniciales bordadas', 'talla', 'XL', 6.00::NUMERIC(10,2), TRUE, 4),
        ('Taza 11oz', 'tamano', '11 oz', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Taza 11oz', 'tamano', '15 oz', 7.00::NUMERIC(10,2), TRUE, 2),
        ('Taza 11oz', 'cara', 'Frontal', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Bolsa tote ilustrada', 'tamano', 'Mediana', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Bolsa tote ilustrada', 'tamano', 'Grande', 8.00::NUMERIC(10,2), TRUE, 2),
        ('Termo grabado acero', 'tamano', '500 ml', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Termo grabado acero', 'tamano', '750 ml', 10.00::NUMERIC(10,2), TRUE, 2),
        ('Taza 11oz', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Taza 11oz', 'color', 'Crema', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Taza 11oz', 'color', 'Rosa coral', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Polo bordado premium', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Polo bordado premium', 'color', 'Negro', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Polo bordado premium', 'color', 'Verde bosque', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Hoodie iniciales bordadas', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Hoodie iniciales bordadas', 'color', 'Crema', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Hoodie iniciales bordadas', 'color', 'Negro', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Hoodie iniciales bordadas', 'color', 'Verde bosque', 0.00::NUMERIC(10,2), TRUE, 4),
        ('Bolsa tote ilustrada', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Bolsa tote ilustrada', 'color', 'Negro', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Termo grabado acero', 'color', 'Acero', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Termo grabado acero', 'color', 'Negro mate', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Termo grabado acero', 'color', 'Rosa', 0.00::NUMERIC(10,2), TRUE, 3),
        ('Arreglo floral con maceta', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Arreglo floral con maceta', 'color', 'Terracota', 3.00::NUMERIC(10,2), TRUE, 2),
        ('Arreglo floral con maceta', 'color', 'Rosa coral', 3.00::NUMERIC(10,2), TRUE, 3),
        ('Mini arreglo floral', 'color', 'Rosa', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Mini arreglo floral', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Mini arreglo floral', 'color', 'Rojo', 2.00::NUMERIC(10,2), TRUE, 3),
        ('Mousepad corporativo personalizado', 'color', 'Negro', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Mousepad corporativo personalizado', 'color', 'Azul noche', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Cuaderno personalizado tapa dura', 'color', 'Crema', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Cuaderno personalizado tapa dura', 'color', 'Coral', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Arreglo floral premium', 'color', 'Negro', 0.00::NUMERIC(10,2), TRUE, 1),
        ('Arreglo floral premium', 'color', 'Blanco', 0.00::NUMERIC(10,2), TRUE, 2),
        ('Arreglo floral premium', 'color', 'Rojo', 0.00::NUMERIC(10,2), TRUE, 3)
) AS v(nombre, tipo, nombre_opcion, recargo, requerido, orden) ON p.nombre = v.nombre
WHERE NOT EXISTS (
    SELECT 1 FROM producto_opciones o
    WHERE o.id_producto = p.id_producto AND o.tipo = v.tipo AND o.nombre = v.nombre_opcion
);

INSERT INTO escalas_precios (id_producto, cantidad_min, precio_unitario)
SELECT p.id_producto, v.cantidad_min, v.precio_unitario
FROM productos p
JOIN (
    VALUES
        ('Taza 11oz', 1, 24.90::NUMERIC(10,2)), ('Taza 11oz', 12, 22.00::NUMERIC(10,2)), ('Taza 11oz', 30, 19.90::NUMERIC(10,2)),
        ('Polo bordado premium', 1, 44.90::NUMERIC(10,2)), ('Polo bordado premium', 8, 40.00::NUMERIC(10,2)),
        ('Arreglo floral con maceta', 1, 47.00::NUMERIC(10,2)), ('Arreglo floral con maceta', 5, 43.00::NUMERIC(10,2)),
        ('Box regalo', 1, 62.00::NUMERIC(10,2)), ('Box regalo', 6, 58.00::NUMERIC(10,2)),
        ('Taza Lima skyline', 1, 29.00::NUMERIC(10,2)), ('Taza Lima skyline', 12, 25.00::NUMERIC(10,2)),
        ('Bolsa tote ilustrada', 1, 32.00::NUMERIC(10,2)), ('Bolsa tote ilustrada', 10, 28.00::NUMERIC(10,2)),
        ('Mini set Costa Verde', 1, 21.90::NUMERIC(10,2)), ('Mini set Costa Verde', 15, 20.00::NUMERIC(10,2)),
        ('Pack bienvenida corporativa', 1, 109.00::NUMERIC(10,2)), ('Pack bienvenida corporativa', 5, 99.00::NUMERIC(10,2)),
        ('Tarjetas kraft personalizadas', 1, 22.00::NUMERIC(10,2)), ('Tarjetas kraft personalizadas', 30, 18.00::NUMERIC(10,2)),
        ('Hoodie iniciales bordadas', 1, 79.00::NUMERIC(10,2)), ('Hoodie iniciales bordadas', 5, 74.00::NUMERIC(10,2)),
        ('Termo grabado acero', 1, 54.00::NUMERIC(10,2)), ('Termo grabado acero', 10, 49.00::NUMERIC(10,2)),
        ('Mini box cumpleaños', 1, 45.00::NUMERIC(10,2)), ('Mini box cumpleaños', 8, 41.00::NUMERIC(10,2)),
        ('Mini arreglo floral', 1, 34.90::NUMERIC(10,2)), ('Mini arreglo floral', 10, 31.00::NUMERIC(10,2)),
        ('Mousepad corporativo personalizado', 1, 35.00::NUMERIC(10,2)), ('Mousepad corporativo personalizado', 12, 31.00::NUMERIC(10,2)),
        ('Cuaderno personalizado tapa dura', 1, 34.00::NUMERIC(10,2)), ('Cuaderno personalizado tapa dura', 10, 30.00::NUMERIC(10,2)),
        ('Arreglo floral premium', 1, 52.00::NUMERIC(10,2)), ('Arreglo floral premium', 6, 48.00::NUMERIC(10,2)),
        ('Pack con Flores', 1, 35.00::NUMERIC(10,2)), ('Pack con Flores', 5, 30.00::NUMERIC(10,2))
) AS v(nombre, cantidad_min, precio_unitario) ON p.nombre = v.nombre
ON CONFLICT ON CONSTRAINT uq_escala_producto DO NOTHING;

INSERT INTO pedidos (id_usuario, id_distrito, direccion_envio, estado, metodo_pago, pais_region, direccion_calle, poblacion, region_provincia, codigo_postal, telefono_contacto, total_productos, costo_envio, monto_total)
SELECT u.id_usuario, d.id_distrito, 'Av. Arequipa 1234, Lima', 'Enviado', 'yape', 'Perú', 'Av. Arequipa 1234', 'Lima', 'Lima', '15046', '987654321', 73.80, d.costo_delivery, 73.80 + d.costo_delivery
FROM usuarios u
JOIN distritos d ON d.nombre = 'Miraflores'
WHERE u.email = 'cliente@correo.com'
  AND NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.id_usuario = u.id_usuario AND p.direccion_envio = 'Av. Arequipa 1234, Lima');

INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario_fijado, precio_personalizacion, texto_personalizado, tecnica_personalizacion, talla, tamano, color_producto, fuente_texto, tamano_texto, cara, posicion_x, posicion_y, imagen_referencia_url, configuracion, subtotal)
SELECT pe.id_pedido, pr.id_producto, 2, 24.90, 3.00, 'Para mamá', 'Sublimado', NULL, '11 oz', 'Blanco', 'Georgia', 30, 'Frontal', 50, 44, pr.imagen_url, '{"preview":"seed","color_producto":"Blanco","fuente_texto":"Georgia","tamano_texto":30}'::JSONB, 55.80
FROM pedidos pe
JOIN usuarios u ON u.id_usuario = pe.id_usuario
JOIN productos pr ON pr.nombre = 'Taza 11oz'
WHERE u.email = 'cliente@correo.com'
  AND NOT EXISTS (SELECT 1 FROM detalle_pedidos dp WHERE dp.id_pedido = pe.id_pedido AND dp.id_producto = pr.id_producto);

INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario_fijado, precio_personalizacion, texto_personalizado, tecnica_personalizacion, talla, tamano, color_producto, fuente_texto, tamano_texto, cara, posicion_x, posicion_y, imagen_referencia_url, configuracion, subtotal)
SELECT pe.id_pedido, pr.id_producto, 1, 18.50, 0.00, 'Ohana', 'Vinil', NULL, NULL, NULL, 'Arial', 24, 'Principal', 50, 50, pr.imagen_url, '{"preview":"seed","fuente_texto":"Arial","tamano_texto":24}'::JSONB, 18.00
FROM pedidos pe
JOIN usuarios u ON u.id_usuario = pe.id_usuario
JOIN productos pr ON pr.nombre = 'Arreglo floral con maceta'
WHERE u.email = 'cliente@correo.com'
  AND NOT EXISTS (SELECT 1 FROM detalle_pedidos dp WHERE dp.id_pedido = pe.id_pedido AND dp.id_producto = pr.id_producto);

INSERT INTO mensajes_pedidos (id_pedido, id_usuario, tipo, contenido, fecha, visible_cliente)
SELECT p.id_pedido, p.id_usuario, v.tipo, v.contenido, CURRENT_TIMESTAMP - (v.horas || ' hours')::INTERVAL, TRUE
FROM pedidos p
JOIN usuarios u ON u.id_usuario = p.id_usuario
CROSS JOIN (
    VALUES
        ('Pagado', 'Pago recibido. Tu pedido entro a produccion.', 72),
        ('Enviado', 'Tu pedido salio a reparto en Lima.', 12)
) AS v(tipo, contenido, horas)
WHERE u.email = 'cliente@correo.com'
  AND NOT EXISTS (SELECT 1 FROM mensajes_pedidos m WHERE m.id_pedido = p.id_pedido AND m.tipo = v.tipo);

INSERT INTO resenas_productos (id_producto, id_usuario, id_pedido, rating, comentario, compra_verificada, fecha)
SELECT pr.id_producto, u.id_usuario, pe.id_pedido, 5, 'La taza quedo nitida y llego bien empacada. Me gusto poder personalizar el texto.', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM productos pr
JOIN usuarios u ON u.email = 'cliente@correo.com'
LEFT JOIN pedidos pe ON pe.id_usuario = u.id_usuario
WHERE pr.nombre = 'Taza 11oz'
ON CONFLICT ON CONSTRAINT uq_resena_producto_usuario DO NOTHING;

INSERT INTO resenas_productos (id_producto, id_usuario, id_pedido, rating, comentario, compra_verificada, fecha)
SELECT pr.id_producto, u.id_usuario, NULL, 4, 'El bordado se ve premium y las tallas estan bien. Volveria a pedir para mi equipo.', TRUE, CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM productos pr
JOIN usuarios u ON u.email = 'valeria@correo.com'
WHERE pr.nombre = 'Polo bordado premium'
ON CONFLICT ON CONSTRAINT uq_resena_producto_usuario DO NOTHING;

INSERT INTO pedidos (id_usuario, id_distrito, direccion_envio, fecha_pedido, estado, metodo_pago, pais_region, direccion_calle, poblacion, region_provincia, codigo_postal, telefono_contacto, total_productos, costo_envio, monto_total)
SELECT u.id_usuario, d.id_distrito, v.direccion, CURRENT_TIMESTAMP - (v.horas || ' hours')::INTERVAL, v.estado, v.metodo_pago, 'Perú', v.direccion, v.poblacion, 'Lima', v.zip, v.telefono, v.total_productos, d.costo_delivery, v.total_productos + d.costo_delivery
FROM (
    VALUES
        ('valeria@correo.com', 'San Isidro', 'Av. Camino Real 455', 'San Isidro', '15073', '955444333', 'Pendiente', 'yape', 67.90::NUMERIC(12,2), 8),
        ('marco@correo.com', 'Santiago de Surco', 'Av. Primavera 1880', 'Santiago de Surco', '15039', '944222111', 'Pagado', 'transferencia', 121.90::NUMERIC(12,2), 18),
        ('ana@correo.com', 'Jesus Maria', 'Calle Los Jazmines 144', 'Jesus Maria', '15072', '955100100', 'Pagado', 'yape', 52.00::NUMERIC(12,2), 28),
        ('diego@correo.com', 'San Miguel', 'Av. La Marina 850', 'San Miguel', '15086', '955200200', 'Enviado', 'efectivo', 91.00::NUMERIC(12,2), 42),
        ('camila@correo.com', 'Cercado', 'Jr. Union 325', 'Cercado', '15001', '955300300', 'Enviado', 'yape', 40.90::NUMERIC(12,2), 62),
        ('sofia@correo.com', 'Santiago de Surco', 'Av. Benavides 3300', 'Santiago de Surco', '15039', '955400400', 'Entregado', 'transferencia', 142.00::NUMERIC(12,2), 90),
        ('renato@correo.com', 'Miraflores', 'Av. Larco 620', 'Miraflores', '15074', '955500500', 'Pendiente', 'transferencia', 49.80::NUMERIC(12,2), 4),
        ('cliente@correo.com', 'Lince', 'Av. Petit Thouars 2100', 'Lince', '15046', '987654321', 'Pagado', 'yape', 85.90::NUMERIC(12,2), 12),
        ('valeria@correo.com', 'Barranco', 'Jr. San Martin 240', 'Barranco', '15063', '955444333', 'Pagado', 'efectivo', 104.00::NUMERIC(12,2), 36),
        ('marco@correo.com', 'La Molina', 'Av. Javier Prado Este 6100', 'La Molina', '15024', '944222111', 'Enviado', 'transferencia', 168.00::NUMERIC(12,2), 54),
        ('ana@correo.com', 'Magdalena del Mar', 'Jr. Bolognesi 900', 'Magdalena del Mar', '15076', '955100100', 'Entregado', 'yape', 64.00::NUMERIC(12,2), 78),
        ('diego@correo.com', 'Miraflores', 'Calle Alcanfores 720', 'Miraflores', '15074', '955200200', 'Entregado', 'transferencia', 216.00::NUMERIC(12,2), 110),
        ('camila@correo.com', 'San Isidro', 'Av. Dos de Mayo 1250', 'San Isidro', '15073', '955300300', 'Pendiente', 'efectivo', 35.00::NUMERIC(12,2), 2),
        ('sofia@correo.com', 'Cercado', 'Jr. Ica 455', 'Cercado', '15001', '955400400', 'Pagado', 'yape', 78.90::NUMERIC(12,2), 16)
) AS v(email, distrito, direccion, poblacion, zip, telefono, estado, metodo_pago, total_productos, horas)
JOIN usuarios u ON u.email = v.email
JOIN distritos d ON d.nombre = v.distrito
WHERE NOT EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id_usuario = u.id_usuario AND p.direccion_envio = v.direccion
);

INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario_fijado, precio_personalizacion, texto_personalizado, tecnica_personalizacion, talla, tamano, color_producto, fuente_texto, tamano_texto, cara, posicion_x, posicion_y, imagen_referencia_url, configuracion, subtotal)
SELECT pe.id_pedido, pr.id_producto, v.cantidad, v.precio, v.personalizacion, v.texto, v.tecnica, v.talla, v.tamano, v.color, v.fuente, v.tamano_texto, v.cara, v.x, v.y, pr.imagen_url,
       jsonb_build_object('seed', TRUE, 'color_producto', v.color, 'fuente_texto', v.fuente, 'tamano_texto', v.tamano_texto),
       (v.precio + v.personalizacion) * v.cantidad
FROM (
    VALUES
        ('Av. Camino Real 455', 'Box regalo', 1, 62.00::NUMERIC(10,2), 5.90::NUMERIC(10,2), 'Feliz dia', 'Vinil', NULL, NULL, NULL, 'Georgia', 28, 'Caja abierta', 48, 42),
        ('Av. Primavera 1880', 'Pack bienvenida corporativa', 1, 109.00::NUMERIC(10,2), 12.90::NUMERIC(10,2), 'Equipo Norte', 'Sublimado', NULL, NULL, NULL, 'Arial', 26, 'Principal', 50, 50),
        ('Calle Los Jazmines 144', 'Bolsa tote ilustrada', 1, 32.00::NUMERIC(10,2), 20.00::NUMERIC(10,2), 'Ana', 'Vinil', NULL, 'Mediana', 'Blanco', 'Trebuchet MS', 32, 'Blanco', 45, 55),
        ('Av. La Marina 850', 'Hoodie iniciales bordadas', 1, 79.00::NUMERIC(10,2), 12.00::NUMERIC(10,2), 'DP', 'Bordado', 'L', NULL, 'Negro', 'Georgia', 26, 'Adelante', 52, 36),
        ('Jr. Union 325', 'Mini set Costa Verde', 1, 21.90::NUMERIC(10,2), 0.00::NUMERIC(10,2), NULL, 'Sublimado', NULL, NULL, NULL, NULL, NULL, 'Principal', 50, 50),
        ('Av. Benavides 3300', 'Polo bordado premium', 2, 44.90::NUMERIC(10,2), 26.10::NUMERIC(10,2), 'SM', 'Bordado', 'M', NULL, 'Blanco', 'Georgia', 26, 'Adelante', 52, 38),
        ('Av. Larco 620', 'Taza Lima skyline', 1, 29.00::NUMERIC(10,2), 0.00::NUMERIC(10,2), NULL, 'Sublimado', NULL, '11 oz', NULL, NULL, NULL, 'Principal', 50, 44),
        ('Av. Petit Thouars 2100', 'Termo grabado acero', 1, 54.00::NUMERIC(10,2), 31.90::NUMERIC(10,2), 'Juan', 'Grabado laser', NULL, '500 ml', 'Acero', 'Arial', 22, 'Frontal', 50, 48),
        ('Jr. San Martin 240', 'Cuaderno personalizado tapa dura', 2, 34.00::NUMERIC(10,2), 18.00::NUMERIC(10,2), 'Valeria', 'Vinil', NULL, NULL, 'Crema', 'Trebuchet MS', 28, 'Principal', 48, 48),
        ('Av. Javier Prado Este 6100', 'Polo bordado premium', 3, 40.00::NUMERIC(10,2), 16.00::NUMERIC(10,2), 'MS', 'Bordado', 'L', NULL, 'Verde bosque', 'Georgia', 24, 'Atrás', 50, 40),
        ('Jr. Bolognesi 900', 'Bolsa tote ilustrada', 2, 28.00::NUMERIC(10,2), 8.00::NUMERIC(10,2), 'AT', 'Vinil', NULL, 'Grande', 'Negro', 'Arial', 26, 'Negro', 52, 52),
        ('Calle Alcanfores 720', 'Pack bienvenida corporativa', 2, 99.00::NUMERIC(10,2), 18.00::NUMERIC(10,2), 'Diego Team', 'Sublimado', NULL, NULL, NULL, 'Arial', 25, 'Principal', 50, 50),
        ('Av. Dos de Mayo 1250', 'Mousepad corporativo personalizado', 1, 35.00::NUMERIC(10,2), 0.00::NUMERIC(10,2), 'Camila', 'Sublimado', NULL, NULL, 'Negro', 'Trebuchet MS', 24, 'Principal', 50, 50),
        ('Jr. Ica 455', 'Mini arreglo floral', 2, 34.90::NUMERIC(10,2), 9.30::NUMERIC(10,2), 'Sofia', 'Vinil', NULL, NULL, 'Rosa', 'Brush Script MT', 22, 'Rosa', 50, 50)
) AS v(direccion, producto, cantidad, precio, personalizacion, texto, tecnica, talla, tamano, color, fuente, tamano_texto, cara, x, y)
JOIN pedidos pe ON pe.direccion_envio = v.direccion
JOIN productos pr ON pr.nombre = v.producto
WHERE NOT EXISTS (
    SELECT 1 FROM detalle_pedidos dp WHERE dp.id_pedido = pe.id_pedido AND dp.id_producto = pr.id_producto
);

INSERT INTO mensajes_pedidos (id_pedido, id_usuario, tipo, contenido, fecha, visible_cliente)
SELECT pe.id_pedido, pe.id_usuario, msg.tipo, msg.contenido, pe.fecha_pedido + msg.delta, TRUE
FROM pedidos pe
CROSS JOIN LATERAL (
    VALUES
        ('Pendiente', 'Pedido creado. Falta completar el pago por ' || COALESCE(pe.metodo_pago, 'metodo elegido') || '.', INTERVAL '10 minutes'),
        ('Pagado', 'Pago registrado por ' || COALESCE(pe.metodo_pago, 'checkout') || '. Tu pedido ingreso a produccion.', INTERVAL '2 hours'),
        ('Enviado', 'Pedido enviado en Lima. Puedes seguirlo desde Mis pedidos.', INTERVAL '2 days'),
        ('Entregado', 'Pedido entregado correctamente.', INTERVAL '3 days')
) AS msg(tipo, contenido, delta)
WHERE (
    msg.tipo = 'Pendiente'
    OR (msg.tipo = 'Pagado' AND pe.estado IN ('Pagado', 'Enviado', 'Entregado'))
    OR (msg.tipo = 'Enviado' AND pe.estado IN ('Enviado', 'Entregado'))
    OR (msg.tipo = 'Entregado' AND pe.estado = 'Entregado')
)
AND NOT EXISTS (
    SELECT 1 FROM mensajes_pedidos mp WHERE mp.id_pedido = pe.id_pedido AND mp.tipo = msg.tipo
);

INSERT INTO resenas_productos (id_producto, id_usuario, id_pedido, rating, comentario, compra_verificada, fecha)
SELECT pr.id_producto, u.id_usuario, pe.id_pedido, v.rating, v.comentario, TRUE, CURRENT_TIMESTAMP - (v.dias || ' days')::INTERVAL
FROM (
    VALUES
        ('Arreglo floral con maceta', 'marco@correo.com', 5, 'La maceta quedo bonita y el arreglo llego bien presentado.', 4),
        ('Box regalo', 'valeria@correo.com', 5, 'El box llego ordenado y se sintio como regalo premium.', 3),
        ('Bolsa tote ilustrada', 'ana@correo.com', 4, 'La tote tiene buena tela y el texto quedo donde lo movi.', 6),
        ('Mini set Costa Verde', 'camila@correo.com', 5, 'Perfecto para recuerdo de Lima, se ve mas bonito que en foto.', 7),
        ('Taza Lima skyline', 'renato@correo.com', 4, 'Buen acabado y el color mostaza combina bien.', 8),
        ('Pack bienvenida corporativa', 'diego@correo.com', 5, 'Lo usamos para onboarding y todo llego empaquetado.', 9),
        ('Tarjetas kraft personalizadas', 'sofia@correo.com', 4, 'Las tarjetas tienen textura bonita para mi emprendimiento.', 10),
        ('Hoodie iniciales bordadas', 'diego@correo.com', 5, 'El bordado del hoodie se siente firme y no se deforma.', 11),
        ('Termo grabado acero', 'cliente@correo.com', 5, 'El grabado se lee claro y mantiene bien la temperatura.', 12),
        ('Mini box cumpleaños', 'ana@correo.com', 4, 'Buen detalle para cumpleaños de ultimo minuto.', 13),
        ('Mini arreglo floral', 'sofia@correo.com', 5, 'La maceta rosa se ve delicada y el texto quedo centrado.', 14),
        ('Mousepad corporativo personalizado', 'camila@correo.com', 4, 'Buen material para escritorio, el logo no se ve pixelado.', 15),
        ('Cuaderno personalizado tapa dura', 'valeria@correo.com', 5, 'La tapa se siente resistente y la portada quedo fina.', 16),
        ('Taza 11oz', 'ana@correo.com', 5, 'Me gusto poder mover el texto y elegir la fuente.', 17),
        ('Polo bordado premium', 'sofia@correo.com', 4, 'La talla fue correcta y el bordado quedo centrado.', 18)
) AS v(producto, email, rating, comentario, dias)
JOIN productos pr ON pr.nombre = v.producto
JOIN usuarios u ON u.email = v.email
LEFT JOIN pedidos pe ON pe.id_usuario = u.id_usuario
ON CONFLICT ON CONSTRAINT uq_resena_producto_usuario DO NOTHING;

UPDATE productos p
SET rating_promedio = COALESCE(r.promedio, 0),
    total_resenas = COALESCE(r.total, 0)
FROM (
    SELECT id_producto, ROUND(AVG(rating)::NUMERIC, 2) AS promedio, COUNT(*)::INT AS total
    FROM resenas_productos
    GROUP BY id_producto
) r
WHERE p.id_producto = r.id_producto;
