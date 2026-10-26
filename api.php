<?php
// Lo que lee la tienda: solo productos visibles
require __DIR__.'/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
const UMBRAL_POCAS = 3; // "Quedan pocas unidades" cuando hay de 1 a 3
// ?promo=1 -> devuelve la promoción guardada desde el panel (o null si no hay)
if (isset($_GET['promo'])) {
  try {
    $v = db()->query("SELECT valor FROM ajustes WHERE clave='promo'")->fetchColumn();
    echo $v ? $v : 'null';
  } catch (Throwable $e) { echo 'null'; }
  exit;
}
try {
  $rows = db()->query("SELECT * FROM productos WHERE visible=1 ORDER BY id DESC")->fetchAll();
  echo json_encode(array_map(fn($r)=>[
    'id'=>(int)$r['id'],'nombre'=>$r['nombre'],'marca'=>$r['marca'],'categoria'=>$r['categoria'],
    'modelo'=>$r['modelo'],'codigo'=>$r['codigo'],'desc'=>$r['descripcion'],'foto'=>$r['foto'],
    'precioDetal'=>(float)$r['precio'],'precioMayor'=>(float)$r['precio'],'agotado'=>(bool)$r['agotado'] || (int)$r['cantidad']<=0,
    'pocas'=>(!$r['agotado'] && (int)$r['cantidad']>=1 && (int)$r['cantidad']<=UMBRAL_POCAS)
  ], $rows), JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) { http_response_code(500); echo '[]'; }
