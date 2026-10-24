-- phpMyAdmin > pestaña SQL > pega todo y ejecuta
CREATE DATABASE IF NOT EXISTS jlcamiones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jlcamiones;

CREATE TABLE IF NOT EXISTS productos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  marca       VARCHAR(80)  NOT NULL DEFAULT '',
  categoria   VARCHAR(80)  NOT NULL DEFAULT '',
  modelo      VARCHAR(150) NOT NULL DEFAULT '',
  codigo      VARCHAR(80)  NOT NULL DEFAULT '',
  descripcion TEXT,
  foto        VARCHAR(255) NOT NULL DEFAULT '',
  precio      DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
  cantidad    INT NOT NULL DEFAULT 0,
  agotado     TINYINT(1) NOT NULL DEFAULT 0,
  visible     TINYINT(1) NOT NULL DEFAULT 1,
  creado      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO productos (nombre,marca,categoria,modelo,descripcion,foto,precio) VALUES
('Manilla interna roja','Mercedes-Benz','Manillas internas','1720 / 1634 / 2638','Manilla interna roja y negra. Verifica la compatibilidad con tu camión antes de comprar.','manilla-interna-mercedes.jpg',18),
('Buje de ballesta trasera','Freightliner','Suspensión','CL / M2','Buje de ballesta trasera. Confirma medidas y aplicación exacta del vehículo.','buje-ballesta-trasera.jpg',35),
('Tensor de correa','World Parts','Motor y correas','Cargo 815 / 1721','Tensor de correa. Confirma la referencia y el motor compatible.','tensor-correa.jpg',65),
('Manilla interna negra','Ford Cargo','Manillas internas','Cargo 815 / 1721 · derecha o izquierda','Manilla interior negra. Consulta el lado disponible antes de realizar el pedido.','manilla-interna-ford.jpg',15),
('Botón selector','Ford Cargo','Interruptores y controles','Cargo 1721 · mocha','Botón selector con cableado. Confirma la función y conexión antes de comprar.','boton-selector.jpg',22),
('Cartucho de turbo','Internacional','Turbo y motor','Motor 711','Cartucho de turbo. Confirma la referencia y compatibilidad del motor antes de comprar.','cartucho-turbo.jpg',180);

UPDATE productos SET cantidad = 1 WHERE agotado = 0;
