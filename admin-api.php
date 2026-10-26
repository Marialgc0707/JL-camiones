<?php
// Backend del panel (requiere sesión iniciada)
require __DIR__.'/config.php';
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
  if (hash_equals(ADMIN_EMAIL, $em) && hash_equals(ADMIN_PASS, $pw)) $rol = 'cliente';
  elseif (defined('DEV_EMAIL') && defined('DEV_PASS') && hash_equals(DEV_EMAIL, $em) && hash_equals(DEV_PASS, $pw)) $rol = 'dev';
  if ($rol) { session_regenerate_id(true); $_SESSION['ok'] = true; $_SESSION['rol'] = $rol; $_SESSION['last'] = time(); out(['ok'=>true,'rol'=>$rol]); }
  sleep(1); fail('Datos incorrectos', 401);
}
if ($action === 'me') out(['ok'=>!empty($_SESSION['ok']),'rol'=>$_SESSION['rol'] ?? '']);
if (empty($_SESSION['ok'])) fail('Sesión vencida', 401);
if ($action === 'logout') { session_destroy(); out(['ok'=>true]); }

$pdo = db();
function borrarFoto($f){ // solo borra fotos subidas desde el panel
  if (preg_match('/^up-[a-f0-9]+\.webp$/', $f) && is_file(__DIR__.'/fotos/'.$f)) unlink(__DIR__.'/fotos/'.$f);
}

try {
  if ($action === 'list') {
    $r = $pdo->query("SELECT * FROM productos ORDER BY id DESC")->fetchAll();
    foreach ($r as &$p) { $p['id']=(int)$p['id']; $p['precio']=(float)$p['precio']; $p['precio_compra']=(float)$p['precio_compra']; $p['cantidad']=(int)$p['cantidad']; $p['agotado']=(bool)$p['agotado']; $p['visible']=(bool)$p['visible']; }
    out(['ok'=>true,'items'=>$r]);
  }
  if ($action === 'promo_get') {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ajustes (clave VARCHAR(50) PRIMARY KEY, valor TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $v = $pdo->query("SELECT valor FROM ajustes WHERE clave='promo'")->fetchColumn();
    out(['ok'=>true,'promo'=>$v ? json_decode($v, true) : null]);
  }
  if ($action === 'promo_save') { // promoción de la portada
    $pdo->exec("CREATE TABLE IF NOT EXISTS ajustes (clave VARCHAR(50) PRIMARY KEY, valor TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $cut = fn($k,$n) => mb_substr(trim((string)($in[$k] ?? '')), 0, $n);
    $p = ['activa'=>!empty($in['activa']) && $in['activa']!=='0' && $in['activa']!=='false',
          'etiqueta'=>$cut('etiqueta',40), 'titulo'=>$cut('titulo',90), 'texto'=>$cut('texto',200),
          'destacado'=>$cut('destacado',12), 'vigencia'=>$cut('vigencia',80), 'boton'=>$cut('boton',30)];
    if ($p['activa'] && $p['titulo'] === '') fail('Escribe el título de la promoción');
    $pdo->prepare("REPLACE INTO ajustes (clave,valor) VALUES ('promo',?)")->execute([json_encode($p, JSON_UNESCAPED_UNICODE)]);
    out(['ok'=>true]);
  }
  if ($action === 'stock') { // botón agotado / disponible (no toca la cantidad)
    $pdo->prepare("UPDATE productos SET agotado=? WHERE id=?")->execute([!empty($in['agotado'])?1:0,(int)$in['id']]); out(['ok'=>true]);
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
   } catch (Throwable $e) { fail('Error: '.$e->getMessage(), 500); }