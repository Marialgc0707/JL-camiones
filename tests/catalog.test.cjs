const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../catalogo.js'), 'utf8');
for (const [name, fetch, expected] of [
  ['catálogo válido', async () => ({ok:true,json:async()=>[{id:42}]}), true],
  ['catálogo vacío válido', async () => ({ok:true,json:async()=>[]}), true],
  ['error HTTP', async () => ({ok:false,status:500}), false],
  ['sin conexión', async () => {throw Error('offline')}, false],
  ['JSON inválido', async () => ({ok:true,json:async()=>{throw Error('json')}}), false],
  ['respuesta inesperada', async () => ({ok:true,json:async()=>({error:'fallo'})}), false],
]) test(name, async () => {
  const context = vm.createContext({fetch, console:{error(){}}});
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('PRODUCTOS.length', context), 0);
  assert.equal(await vm.runInContext('cargarProductos()', context), expected);
  if (!expected) assert.equal(vm.runInContext('PRODUCTOS.length', context), 0);
  if (name === 'catálogo válido') assert.equal(vm.runInContext('PRODUCTOS[0].id', context), 42);
});

test('fallo visible: desactiva pedido y conserva carrito guardado', async () => {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden:true, disabled:false, value:'', addEventListener(){},
      querySelectorAll(){return []}, style:{},
    });
    return elements.get(selector);
  };
  const stored = JSON.stringify({t:Date.now(),items:[[42,2]]});
  let storage = stored;
  const context = vm.createContext({
    fetch:async()=>({ok:false,status:500}), console:{error(){}},
    document:{querySelector:element, querySelectorAll:()=>[], addEventListener(){}},
    localStorage:{getItem:()=>storage, setItem:(k,v)=>{storage=v}, removeItem:()=>{storage=null}},
  });
  vm.runInContext(source, context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'), context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(element('#catalog-error').hidden, false);
  assert.equal(element('#empty-message').hidden, true);
  assert.equal(element('#send-whatsapp').disabled, true);
  assert.equal(element('#search-input').disabled, true);
  assert.equal(storage, stored);
});
