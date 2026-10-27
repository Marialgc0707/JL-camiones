-- Ejecutar UNA SOLA VEZ en phpMyAdmin > pestaña SQL (si la promoción da error al guardar)
USE jlcamiones;
CREATE TABLE IF NOT EXISTS ajustes (
  clave VARCHAR(50) PRIMARY KEY,
  valor TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
