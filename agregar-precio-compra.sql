-- Ejecutar UNA SOLA VEZ en phpMyAdmin > pestaña SQL
USE jlcamiones;
ALTER TABLE productos ADD COLUMN precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER precio;
