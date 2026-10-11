// Test de humo: crearPedido envía al backend central (flujo celular->PC)
const fs = require('fs');
global.localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]} };
global.sessionStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]} };
global.window = { location: { hostname: '192.168.1.50' } }; // simula acceso desde LAN

let capturedUrl = null; let capturedBody = null;
global.fetch = async (url, opts={}) => {
  capturedUrl = url; capturedBody = opts.body;
  return { ok:true, status:200, json: async()=>({success:true}) };
};
// token de sesión activa
sessionStorage.setItem('auth_token','tok-test');

(async () => {
  const esbuild = require('esbuild');
  const out = await esbuild.build({
    entryPoints:['src/db/database.ts'], bundle:true, format:'cjs', write:false, platform:'neutral',
    define: {'import.meta.env.VITE_API_URL':'"http://localhost:3001"'},
  });
  fs.writeFileSync('/tmp/db-bundle.cjs', out.outputFiles[0].text);
  const dbMod = require('/tmp/db-bundle.cjs');

  const pedido = dbMod.crearPedido({
    tipo:'llevar', mesa_id:null, cliente_nombre:'Ana Laptop', cliente_telefono:'',
    mesero_id:'u-carlos', estado_cocina:'pendiente', estado_pago:'pendiente', total:50,
    detalles:[{producto_id:'p1', cantidad:2, precio_unitario:25}], desechables:[], pagos:[],
  });
  console.log('pedido local id:', pedido.id ? 'OK' : 'FAIL');
  console.log('URL capturada:', capturedUrl);
  const body = JSON.parse(capturedBody);
  console.log('payload enviado:', body.tipo, '|', body.cliente_nombre, '|', body.detalles.length, 'detalle(s)');

  const checks = [
    ['apiClient apunta al host dinámico (celular en LAN)', capturedUrl === 'http://192.168.1.50:3001/api/pedidos'],
    ['POST con ruta correcta /api/pedidos (sin /api/api)', !capturedUrl.includes('/api/api')],
    ['payload contiene detalles y totales', body.detalles[0].producto_id==='p1' && body.total===50],
    ['guardado local para respuesta rápida', dbMod.getPedidos().some(p=>p.id===pedido.id)],
  ];
  // updateEstadoCocina también sincroniza
  capturedUrl=null;
  dbMod.updateEstadoCocina(pedido.id,'preparando');
  checks.push(['estado-cocina se sincroniza con el servidor', capturedUrl==='http://192.168.1.50:3001/api/pedidos/'+pedido.id+'/estado-cocina']);

  let pass=true;
  for (const [name,ok] of checks){ console.log(ok?'PASS':'FAIL','-',name); if(!ok)pass=false; }
  process.exit(pass?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
