<?php
require __DIR__.'/../login-limit.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$dir = sys_get_temp_dir().'/jl-limit-test-'.bin2hex(random_bytes(6));
try {
  for ($i=0;$i<5;$i++) {
    $r=loginLimit('person@example.test','192.0.2.1',fn()=>null,$dir,1000);
    check($r['retry']===0,'Cinco intentos iniciales');
  }
  $deny=function(){throw new RuntimeException('No debe verificar credenciales bloqueadas');};
  check(loginLimit('person@example.test','192.0.2.2',$deny,$dir,1001)['retry']===899,'Bloqueo por cuenta entre IP distintas');
  check(loginLimit('another@example.test','192.0.2.1',$deny,$dir,1001)['retry']===899,'Bloqueo por IP entre cuentas distintas');
  check(loginLimit(' PERSON@example.test ','192.0.2.3',$deny,$dir,1001)['retry']===899,'Normalización de cuenta');
  check(loginLimit('another@example.test','192.0.2.4',fn()=>'cliente',$dir,1001)['role']==='cliente','Otro visitante puede entrar');
  check(loginLimit('person@example.test','192.0.2.1',fn()=>'cliente',$dir,1900)['role']==='cliente','Desbloqueo al vencer');
  file_put_contents($dir.'/attempts.json','corrupto');
  $failed=false;
  try { loginLimit('x','y',fn()=>'cliente',$dir,2000); } catch (Throwable $e) {$failed=true;}
  check($failed,'Estado corrupto debe fallar cerrado');
  echo "OK: límites por cuenta/IP, normalización, vencimiento y estado corrupto\n";
} finally {
  @unlink($dir.'/attempts.json'); @rmdir($dir);
}
