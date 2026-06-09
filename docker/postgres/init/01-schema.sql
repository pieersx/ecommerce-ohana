CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
    telefono VARCHAR(20),
    dni_ruc VARCHAR(20),
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
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS escalas_precios (
    id_escala SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad_min INT NOT NULL CHECK (cantidad_min > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    CONSTRAINT uq_escala_producto UNIQUE (id_producto, cantidad_min)
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
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Enviado', 'Entregado')),
    metodo_pago VARCHAR(50),
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
    texto_personalizado TEXT,
    tecnica_personalizacion VARCHAR(50),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_escalas_producto ON escalas_precios(id_producto);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pedidos_distrito ON pedidos(id_distrito);
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_pedido ON detalle_pedidos(id_pedido);

INSERT INTO usuarios (nombre_completo, email, password_hash, rol)
SELECT 'Administrador Ohana', 'admin@ohana.com', '$2b$10$rG06K3z.xCRdgYF9b5wW8.saReRVR3sgE8Rp5nW7W4pkCtJ1P9cCi', 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE email = 'admin@ohana.com'
);

INSERT INTO usuarios (nombre_completo, email, password_hash, rol)
SELECT 'Juan Cliente', 'cliente@correo.com', '$2b$10$Ero2BrJEwd04mmKGah9IA.P51g1ke21QPxzWVn94ylmUARyQnCgj.', 'cliente'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE email = 'cliente@correo.com'
);

INSERT INTO categorias (nombre)
SELECT 'Regalos Personalizados'
WHERE NOT EXISTS (
    SELECT 1 FROM categorias WHERE nombre = 'Regalos Personalizados'
);

INSERT INTO categorias (nombre)
SELECT v.nombre
FROM (
    VALUES
        ('Ropa Personalizada'),
        ('Papeleria Creativa'),
        ('Boxes de Regalo'),
        ('Souvenirs Lima'),
        ('Eventos Corporativos')
) AS v(nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM categorias c WHERE c.nombre = v.nombre
);

INSERT INTO distritos (nombre, costo_delivery)
SELECT 'Cercado', 10.00
WHERE NOT EXISTS (
    SELECT 1 FROM distritos WHERE nombre = 'Cercado'
);

INSERT INTO distritos (nombre, costo_delivery)
SELECT v.nombre, v.costo_delivery
FROM (
    VALUES
        ('Miraflores', 14.00::NUMERIC(10,2)),
        ('San Isidro', 16.00::NUMERIC(10,2)),
        ('Santiago de Surco', 18.00::NUMERIC(10,2)),
        ('Barranco', 15.00::NUMERIC(10,2)),
        ('San Miguel', 13.00::NUMERIC(10,2)),
        ('La Molina', 20.00::NUMERIC(10,2)),
        ('Jesus Maria', 12.00::NUMERIC(10,2)),
        ('Lince', 12.00::NUMERIC(10,2)),
        ('Magdalena del Mar', 13.00::NUMERIC(10,2))
) AS v(nombre, costo_delivery)
WHERE NOT EXISTS (
    SELECT 1 FROM distritos d WHERE d.nombre = v.nombre
);

INSERT INTO productos (id_categoria, nombre, descripcion, precio_base, stock, imagen_url)
SELECT c.id_categoria, 'Taza personalizada', 'Taza sublimada con texto o imagen personalizada.', 25.00, 50, 'https://example.com/taza-personalizada.jpg'
FROM categorias c
WHERE c.nombre = 'Regalos Personalizados'
  AND NOT EXISTS (
      SELECT 1 FROM productos WHERE nombre = 'Taza personalizada'
  );

UPDATE productos
SET imagen_url = 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?auto=format&fit=crop&w=900&q=80'
WHERE nombre = 'Taza personalizada'
  AND imagen_url = 'https://example.com/taza-personalizada.jpg';

INSERT INTO productos (id_categoria, nombre, descripcion, precio_base, stock, imagen_url)
SELECT c.id_categoria, v.nombre, v.descripcion, v.precio_base, v.stock, v.imagen_url
FROM (
    VALUES
        ('Ropa Personalizada', 'Polo bordado Ohana', 'Polo de algodon con iniciales o frase bordada a pedido.', 39.90::NUMERIC(10,2), 24, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'),
        ('Papeleria Creativa', 'Sticker pack premium', 'Set de stickers personalizados para packaging, cuadernos o regalos.', 18.50::NUMERIC(10,2), 80, 'https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?auto=format&fit=crop&w=900&q=80'),
        ('Boxes de Regalo', 'Box regalo personalizado', 'Caja curada con tarjeta, cinta, detalle artesanal y producto personalizado.', 69.00::NUMERIC(10,2), 12, 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80'),
        ('Regalos Personalizados', 'Bolsa tote ilustrada', 'Tote bag de lona con ilustracion, nombre o frase especial.', 32.00::NUMERIC(10,2), 18, 'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=900&q=80'),
        ('Souvenirs Lima', 'Mini set Costa Verde', 'Pack de imanes y postales inspirados en Miraflores, Barranco y la Costa Verde.', 24.90::NUMERIC(10,2), 45, 'https://images.unsplash.com/photo-1516546453174-5e1098a4b4af?auto=format&fit=crop&w=900&q=80'),
        ('Souvenirs Lima', 'Taza Lima skyline', 'Taza sublimada con ilustracion de Lima, ideal para recuerdos y turismo local.', 29.00::NUMERIC(10,2), 35, 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=900&q=80'),
        ('Eventos Corporativos', 'Pack bienvenida corporativa', 'Kit con tote, libreta, sticker y taza personalizada para equipos en Lima.', 119.00::NUMERIC(10,2), 8, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'),
        ('Papeleria Creativa', 'Tarjetas kraft personalizadas', 'Tarjetas para mensajes, marcas pequenas y emprendimientos con acabado artesanal.', 22.00::NUMERIC(10,2), 65, 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80')
) AS v(categoria, nombre, descripcion, precio_base, stock, imagen_url)
JOIN categorias c ON c.nombre = v.categoria
WHERE NOT EXISTS (
    SELECT 1 FROM productos p WHERE p.nombre = v.nombre
);

INSERT INTO escalas_precios (id_producto, cantidad_min, precio_unitario)
SELECT p.id_producto, v.cantidad_min, v.precio_unitario
FROM productos p
CROSS JOIN (
    VALUES
        (1, 25.00::NUMERIC(10,2)),
        (10, 22.50::NUMERIC(10,2)),
        (25, 20.00::NUMERIC(10,2))
) AS v(cantidad_min, precio_unitario)
WHERE p.nombre = 'Taza personalizada'
  AND NOT EXISTS (
      SELECT 1 FROM escalas_precios ep
      WHERE ep.id_producto = p.id_producto AND ep.cantidad_min = v.cantidad_min
  );

INSERT INTO escalas_precios (id_producto, cantidad_min, precio_unitario)
SELECT p.id_producto, v.cantidad_min, v.precio_unitario
FROM productos p
JOIN (
    VALUES
        ('Polo bordado Ohana', 1, 39.90::NUMERIC(10,2)),
        ('Polo bordado Ohana', 8, 36.00::NUMERIC(10,2)),
        ('Sticker pack premium', 1, 18.50::NUMERIC(10,2)),
        ('Sticker pack premium', 20, 15.00::NUMERIC(10,2)),
        ('Box regalo personalizado', 1, 69.00::NUMERIC(10,2)),
        ('Box regalo personalizado', 6, 64.00::NUMERIC(10,2)),
        ('Bolsa tote ilustrada', 1, 32.00::NUMERIC(10,2)),
        ('Bolsa tote ilustrada', 10, 28.00::NUMERIC(10,2)),
        ('Mini set Costa Verde', 1, 24.90::NUMERIC(10,2)),
        ('Mini set Costa Verde', 15, 21.50::NUMERIC(10,2)),
        ('Taza Lima skyline', 1, 29.00::NUMERIC(10,2)),
        ('Taza Lima skyline', 12, 25.00::NUMERIC(10,2)),
        ('Pack bienvenida corporativa', 1, 119.00::NUMERIC(10,2)),
        ('Pack bienvenida corporativa', 5, 109.00::NUMERIC(10,2)),
        ('Tarjetas kraft personalizadas', 1, 22.00::NUMERIC(10,2)),
        ('Tarjetas kraft personalizadas', 30, 18.00::NUMERIC(10,2))
) AS v(nombre, cantidad_min, precio_unitario) ON p.nombre = v.nombre
WHERE NOT EXISTS (
    SELECT 1 FROM escalas_precios ep
    WHERE ep.id_producto = p.id_producto AND ep.cantidad_min = v.cantidad_min
);
