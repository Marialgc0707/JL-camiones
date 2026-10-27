<?php
// Backend del panel (requiere sesión iniciada)
require __DIR__.'/config.php';
require __DIR__.'/login-limit.php';
const SESION_MAX = 900; // 15 minutos sin actividad
ini_set('session.gc_maxlifetime', (string)SESION_MAX);
session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict']);
session_start();
// Si pasaron más de 15 minutos sin usar el panel, se cierra la sesión
if (!empty($_SESSION['ok']) && time() - ($_SESSION['last'] ?? 0) > SESION_MAX) {
  $_SESSION = []; session_destroy(); session_start();
}
if (!empty($_SESSION['ok'])) $_SESSION['last'] = time(); // cada uso reinicia el reloj
header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch' || $_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(400); exit('{"ok":false}'); }

function out($d){ echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function fail($m,$c=400){ http_response_code($c); out(['ok'=>false,'error'=>$m]); }

$action = $_GET['action'] ?? '';
$in = json_decode(file_get_contents('php://input'), true) ?: $_POST;

if ($action === 'login') {
  $em = (string)($in['email'] ?? ''); $pw = (string)($in['pass'] ?? ''); $rol = null;
  try {
    $attempt = loginLimit($em, $_SERVER['REMOTE_ADDR'] ?? 'unknown', function () use ($em, $pw) {
      if (hash_equals(ADMIN_EMAIL, $em) && hash_equals(ADMIN_PASS, $pw)) return 'cliente';
      if (defined('DEV_EMAIL') && defined('DEV_PASS') && hash_equals(DEV_EMAIL, $em) && hash_equals(DEV_PASS, $pw)) return 'dev';
      return null;
    });
  } catch (Throwable $e) { fail('Acceso temporalmente no disponible. Intenta más tarde.', 503); }
  if ($attempt['retry'] > 0) {
    header('Retry-After: '.$attempt['retry']);
    fail('Demasiados intentos. Intenta de nuevo en '.(int)ceil($attempt['retry']/60).' minutos.', 429);
  }
  $rol = $attempt['role'];
  if ($rol) { session_regenerate_id(true); $_SESSION['ok'] = true; $_SESSION['rol'] = $rol; $_SESSION['last'] = time(); out(['ok'=>true,'rol'=>$rol]); }
  fail('Datos incorrectos', 401);
}
if ($action === 'me') out(['ok'=>!empty($_SESSION['ok']),'rol'=>$_SESSION['rol'] ?? '']);
if (empty($_SESSION['ok'])) fail('Sesión vencida', 401);
if ($action === 'logout') { session_destroy(); out(['ok'=>true]); }

$pdo = db();
function borrarFoto($f){ // solo borra fotos subidas desde el panel
  if (preg_match('/^up-[a-f0-9]+\.webp$/', $f) && is_file(__DIR__.'/fotos/'.$f)) unlink(__DIR__.'/fotos/'.$f);
}

function asegurarAjustes($pdo){ // crea la tabla si falta; si el usuario de MySQL no puede crearla, sigue (puede existir ya)
  try { $pdo->exec("CREATE TABLE IF NOT EXISTS ajustes (clave VARCHAR(50) PRIMARY KEY, valor TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); }
  catch (Throwable $e) { /* si no existe, el guardado devolverá un error claro */ }
}

try {
  if ($action === 'list') {
    $r = $pdo->query("SELECT * FROM productos ORDER BY id DESC")->fetchAll();
    foreach ($r as &$p) { $p['id']=(int)$p['id']; $p['precio']=(float)$p['precio']; $p['precio_compra']=(float)$p['precio_compra']; $p['cantidad']=(int)$p['cantidad']; $p['agotado']=(bool)$p['agotado']; $p['visible']=(bool)$p['visible']; }
    out(['ok'=>true,'items'=>$r]);
  }
  if ($action === 'promo_get') { // promociones: solo el desarrollador
    if (($_SESSION['rol'] ?? '') !== 'dev') fail('Solo el desarrollador puede gestionar promociones', 403);
    asegurarAjustes($pdo);
    $v = $pdo->query("SELECT valor FROM ajustes WHERE clave='promo'")->fetchColumn();
    out(['ok'=>true,'promo'=>$v ? json_decode($v, true) : null]);
  }
  if ($action === 'promo_save') { // promoción de la portada: solo el desarrollador
    if (($_SESSION['rol'] ?? '') !== 'dev') fail('Solo el desarrollador puede gestionar promociones', 403);
    asegurarAjustes($pdo);
    $cut = function ($k, $n) use ($in) {
      $v = trim((string)($in[$k] ?? ''));
      return function_exists('mb_substr') ? mb_substr($v, 0, $n, 'UTF-8') : (preg_match_all('/./us', $v, $m) ? implode('', array_slice($m[0], 0, $n)) : substr($v, 0, $n));
    };
    $act = $in['activa'] ?? false;
    $p = ['activa'=>!empty($act) && $act!=='0' && $act!=='false',
          'etiqueta'=>$cut('etiqueta',40), 'titulo'=>$cut('titulo',90), 'texto'=>$cut('texto',200),
          'destacado'=>$cut('destacado',12), 'vigencia'=>$cut('vigencia',80), 'boton'=>$cut('boton',30)];
    if ($p['activa'] && $p['titulo'] === '') fail('Escribe el título de la promoción');
    // Sin JSON_UNESCAPED_UNICODE: emojis y tildes se guardan como \uXXXX (ASCII), así no depende del charset de la conexión
    $json = json_encode($p);
    if ($json === false) fail('El texto de la promoción tiene caracteres no válidos');
    $pdo->prepare("REPLACE INTO ajustes (clave,valor) VALUES ('promo',?)")->execute([$json]);
    out(['ok'=>true]);
  }
  if ($action === 'stock') { // botón agotado / disponible (no toca la cantidad)
    $agotado = !empty($in['agotado']) ? 1 : 0;
    $pdo->prepare("UPDATE productos SET agotado=CASE WHEN cantidad<=0 THEN 1 ELSE ? END WHERE id=?")->execute([$agotado,(int)$in['id']]);
    $s = $pdo->prepare("SELECT cantidad FROM productos WHERE id=?"); $s->execute([(int)$in['id']]);
    $cantidad = $s->fetchColumn();
    if ($cantidad === false) fail('Repuesto no encontrado', 404);
    if (!$agotado && (int)$cantidad <= 0) fail('Agrega existencias antes de marcar el repuesto disponible', 409);
    out(['ok'=>true]);
  }
  if ($action === 'delete') {
    $id=(int)$in['id']; $f=$pdo->prepare("SELECT foto FROM productos WHERE id=?"); $f->execute([$id]);
    borrarFoto((string)$f->fetchColumn());
    $pdo->prepare("DELETE FROM productos WHERE id=?")->execute([$id]); out(['ok'=>true]);
  }
  if ($action === 'save') { // fotos: solo el desarrollador
    $id = (int)($in['id'] ?? 0);
    $nombre = trim((string)($in['nombre'] ?? '')); if ($nombre === '') fail('Falta el nombre');
    $precio = (float)($in['precio'] ?? 0); if ($precio < 0) fail('Precio de venta inválido');
    $pc = (float)($in['precio_compra'] ?? 0); if ($pc < 0) fail('Precio de compra inválido');
    if (!isset($in['cantidad']) || $in['cantidad'] === '' || (int)$in['cantidad'] < 0) fail('Indica la cantidad en inventario');
    $cant = (int)$in['cantidad'];
    // Agotado: cantidad 0 => agotado; si estaba en 0 y ahora hay unidades => disponible; si no, se respeta el botón
    $o = $pdo->prepare("SELECT cantidad, agotado FROM productos WHERE id=?"); $o->execute([$id]); $prev = $o->fetch();
    $agot = $cant <= 0 ? 1 : ($prev ? ((int)$prev['cantidad'] <= 0 ? 0 : (int)$prev['agotado']) : 0);
    $d = [$nombre, trim($in['marca']??''), trim($in['categoria']??''), trim($in['modelo']??''), trim($in['codigo']??''),
          trim($in['descripcion']??''), $precio, $pc, $cant, $agot, (!empty($in['visible'])&&$in['visible']!=='0')?1:0];
    // Fotos: solo si la sesión es del desarrollador
    $foto = null;
    if (!empty($_FILES['foto']['tmp_name']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
      if (($_SESSION['rol'] ?? '') !== 'dev') fail('No autorizado para subir fotos', 403);
      $t = $_FILES['foto']['tmp_name'];
      if ($_FILES['foto']['size'] > 3*1024*1024) fail('La foto pesa más de 3 MB');
      if (!in_array((new finfo(FILEINFO_MIME_TYPE))->file($t), ['image/webp','image/jpeg','image/png'], true) || !getimagesize($t)) fail('Archivo de imagen no válido');
      $foto = 'up-'.bin2hex(random_bytes(8)).'.webp';
      if (!move_uploaded_file($t, __DIR__.'/fotos/'.$foto)) fail('No se pudo guardar la foto (revisa permisos de la carpeta fotos)', 500);
    }
    if ($id) {
      if ($foto) { $o=$pdo->prepare("SELECT foto FROM productos WHERE id=?"); $o->execute([$id]); borrarFoto((string)$o->fetchColumn()); }
      $pdo->prepare("UPDATE productos SET nombre=?,marca=?,categoria=?,modelo=?,codigo=?,descripcion=?,precio=?,precio_compra=?,cantidad=?,agotado=?,visible=?".($foto?",foto=?":"")." WHERE id=?")->execute(array_merge($d,$foto?[$foto]:[],[$id]));
    } else {
      $pdo->prepare("INSERT INTO productos (nombre,marca,categoria,modelo,codigo,descripcion,precio,precio_compra,cantidad,agotado,visible,foto) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")->execute(array_merge($d,[$foto ?? '']));
    }
    out(['ok'=>true]);
  }
  fail('Acción desconocida');
   } catch (Throwable $e) {
  if (strpos($e->getMessage(), 'ajustes') !== false) fail('Falta la tabla "ajustes" en la base de datos. Ejecuta agregar-promociones.sql en phpMyAdmin.', 500);
  fail('Error: '.$e->getMessage(), 500);
}