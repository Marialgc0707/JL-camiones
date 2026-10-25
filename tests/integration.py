"""Pruebas HTTP aisladas: PHP real y SQLite temporal, sin tocar datos del negocio."""
import json, os, pathlib, shutil, socket, sqlite3, subprocess, tempfile, time
import urllib.request, urllib.error, http.cookiejar
ROOT = pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='jl-http-test-') as tmp:
    d = pathlib.Path(tmp)
    for name in ['admin-api.php', 'api.php', 'login-limit.php']:
        shutil.copy(ROOT / name, d / name)
    (d / 'config.php').write_text("""<?php
const ADMIN_EMAIL='admin@example.test'; const ADMIN_PASS='test-only-password';
function db(): PDO { $pdo=new PDO('sqlite:'.__DIR__.'/test.db');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); return $pdo; }
""")
    db = sqlite3.connect(d / 'test.db')
    db.execute('CREATE TABLE productos (id INTEGER PRIMARY KEY, nombre TEXT, marca TEXT, categoria TEXT, modelo TEXT, codigo TEXT, descripcion TEXT, foto TEXT, precio REAL, precio_compra REAL, cantidad INTEGER, agotado INTEGER, visible INTEGER)')
    db.executemany('INSERT INTO productos VALUES (?,"Test","","","","","","",10,5,?,0,1)', [(1,0),(2,3)])
    db.commit()
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    env = dict(os.environ, JL_LOGIN_STATE_DIR=str(d / 'limits'))
    proc = subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',tmp], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base=f'http://127.0.0.1:{port}/'
    client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(action, body=None, opener=client):
        req=urllib.request.Request(base+'admin-api.php?action='+action, data=json.dumps(body or {}).encode(), headers={'Content-Type':'application/json','X-Requested-With':'fetch'})
        try: r=opener.open(req)
        except urllib.error.HTTPError as e: r=e
        return r.status, json.load(r), r.headers
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(base+'api.php').close(); break
            except OSError: time.sleep(.05)
        else: raise AssertionError('PHP no inició')
        assert request('stock',{'id':1,'agotado':False})[0]==401
        assert request('login',{'email':'admin@example.test','pass':'test-only-password'})[0]==200
        assert request('stock',{'id':1,'agotado':False})[0]==409
        assert db.execute('SELECT agotado FROM productos WHERE id=1').fetchone()[0]==1
        assert request('stock',{'id':2,'agotado':True})[0]==200
        assert request('stock',{'id':2,'agotado':False})[0]==200
        assert request('stock',{'id':999,'agotado':False})[0]==404
        # Datos heredados inconsistentes también se publican como agotados.
        db.execute('UPDATE productos SET agotado=0 WHERE id=1'); db.commit()
        products=json.load(urllib.request.urlopen(base+'api.php'))
        assert next(p for p in products if p['id']==1)['agotado'] is True
        assert next(p for p in products if p['id']==2)['agotado'] is False
        request('logout')
        for _ in range(5):
            assert request('login',{'email':'admin@example.test','pass':'wrong'},urllib.request.build_opener())[0]==401
        status, body, headers=request('login',{'email':'admin@example.test','pass':'test-only-password'},urllib.request.build_opener())
        assert status==429 and 0<int(headers['Retry-After'])<=900
        assert request('me')[1]['ok'] is False
        print('OK: autenticación HTTP, stock cero/positivo/inexistente, API pública y bloqueo sin cookies')
    finally:
        proc.terminate(); proc.wait(); db.close()
