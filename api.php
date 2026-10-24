<?php
// Lo que lee la tienda: solo productos visibles
require __DIR__.'/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
try {
  $rows = db()->query("SELECT * FROM productos WHERE visible=1 ORDER BY id DESC")->fetchAll();
  echo json_encode(array_map(fn($r)=>[
    'id'=>(int)$r['id'],'nombre'=>$r['nombre'],'marca'=>$r['marca'],'categoria'=>$r['categoria'],
    'modelo'=>$r['modelo'],'codigo'=>$r['codigo'],'desc'=>$r['descripcion'],'foto'=>$r['foto'],
    'precioDetal'=>(float)$r['precio'],'precioMayor'=>(float)$r['precio'],'agotado'=>(bool)$r['agotado']
  ], $rows), JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) { http_response_code(500); echo '[]'; }
