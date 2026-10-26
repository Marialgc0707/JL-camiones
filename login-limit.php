<?php
// Estado compartido por sesiones, protegido con bloqueo de archivo.
// En varios servidores, sustituir por un almacén compartido.
function loginLimit(string $email, string $ip, callable $check, ?string $directory = null, ?int $now = null): array {
  $now = $now ?? time();
  $directory = $directory ?? (getenv('JL_LOGIN_STATE_DIR') ?: sys_get_temp_dir().'/jl-login-'.hash('sha256', __DIR__));
  if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
    throw new RuntimeException('No se pudo crear el almacenamiento de intentos');
  }
  $file = @fopen($directory.'/attempts.json', 'c+');
  if (!$file) throw new RuntimeException('No se pudo abrir el almacenamiento de intentos');
  try {
    if (!flock($file, LOCK_EX)) throw new RuntimeException('No se pudo bloquear el almacenamiento');
    $raw = stream_get_contents($file);
    $state = $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($state)) throw new RuntimeException('Estado de intentos inválido');
    foreach ($state as $key => $entry) {
      if ($entry['until'] <= $now) unset($state[$key]);
    }
    // No confiar en X-Forwarded-For enviado por el cliente.
    $keys = ['ip:'.hash('sha256', $ip), 'email:'.hash('sha256', strtolower(trim($email)))];
    $retry = 0;
    foreach ($keys as $key) {
      if (($state[$key]['count'] ?? 0) >= 5) $retry = max($retry, $state[$key]['until'] - $now);
    }
    if ($retry > 0) return ['role'=>null, 'retry'=>$retry];
    if (count($state) > 10000) throw new RuntimeException('Almacenamiento de intentos lleno');
    $role = $check();
    if ($role) {
      unset($state[$keys[1]]);
    } else {
      foreach ($keys as $key) {
        if (!isset($state[$key])) $state[$key] = ['count'=>0, 'until'=>$now + 900];
        $state[$key]['count']++;
      }
    }
    $data = json_encode($state, JSON_THROW_ON_ERROR);
    rewind($file);
    if (!ftruncate($file, 0) || fwrite($file, $data) !== strlen($data) || !fflush($file)) {
      throw new RuntimeException('No se pudieron guardar los intentos');
    }
    return ['role'=>$role, 'retry'=>0];
  } finally {
    flock($file, LOCK_UN);
    fclose($file);
  }
}
