<?php
// Datos de conexión (XAMPP por defecto: usuario root, sin contraseña)
const DB_HOST = 'localhost';
const DB_NAME = 'jlcamiones';
const DB_USER = 'root';
const DB_PASS = 'v9573884';

// Acceso al panel: CAMBIA ESTOS DOS VALORES
const ADMIN_EMAIL = 'luis@gmail.com';
const ADMIN_PASS  = 'Jluis2026Jl';

// modo desarrollador
const DEV_EMAIL = 'marialuisa@gmail.com';
const DEV_PASS  = 'Teo1211..';


function db(): PDO {
  static $pdo;
  if (!$pdo) {
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
  }
  return $pdo;
}
