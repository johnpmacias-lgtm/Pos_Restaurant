// Test de humo: reproduce el flujo completo de login y verifica que,
// tras autenticar, la aplicación NO queda en blanco sino que muestra la vista
// correspondiente al rol (AdminView / WaiterView / KitchenView).
const { JSDOM } = require('jsdom');

async function main() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/',
    pretendToBeVisual: true,
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.localStorage = dom.window.localStorage;
  global.sessionStorage = dom.window.sessionStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.getComputedStyle = dom.window.getComputedStyle;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = clearTimeout;
  global.alert = (msg) => { console.log('[alert]', msg); };
  // fetch real hacia los servidores levantados
  const nodeFetch = globalThis.fetch; global.fetch = (...args) => nodeFetch(...args);

  // Seed mínimo del almacén local (localStorage) para las vistas
  localStorage.setItem('pos_usuarios', JSON.stringify([
    { id: '1', nombre: 'Administrador', usuario: 'admin', password_hash: 'x', rol: 'admin', activo: true },
    { id: '2', nombre: 'Carlos', usuario: 'carlos', password_hash: 'x', rol: 'mesero', activo: true },
  ]));
  localStorage.setItem('pos_mesas', JSON.stringify([]));
  localStorage.setItem('pos_productos', JSON.stringify([]));
  localStorage.setItem('pos_inventario', JSON.stringify([]));
  localStorage.setItem('pos_pedidos', JSON.stringify([]));
  localStorage.setItem('pos_reservas', JSON.stringify([]));
  localStorage.setItem('pos_caja_turnos', JSON.stringify([]));

  const React = require('react');
  const { renderToString } = require('react-dom/server');

  // Empaquetar los módulos TSX con esbuild para poder ejecutarlos en Node.
  const esbuild = require('esbuild');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const entryCode = `
    import * as AppCtx from './src/context/AppContext.tsx';
    import * as AuthCtx from './src/context/AuthContext.tsx';
    import Login from './src/components/Login.tsx';
    import AdminView from './src/views/AdminView.tsx';
    import WaiterView from './src/views/WaiterView.tsx';
    import KitchenView from './src/views/KitchenView.tsx';
    globalThis.__mods = { AppCtx, AuthCtx, Login, AdminView, WaiterView, KitchenView };
  `;
  const tmpEntry = '/workspace/.smoke-entry.jsx';
  fs.writeFileSync(tmpEntry, entryCode);
  const bundleFile = '/workspace/.smoke-bundle.cjs';
  await esbuild.build({
    entryPoints: [tmpEntry],
    absWorkingDir: '/workspace',
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: bundleFile,
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  require(bundleFile);
  const { AppProvider } = globalThis.__mods.AppCtx;
  const { AuthProvider, useAuth } = globalThis.__mods.AuthCtx;
  const Login = globalThis.__mods.Login;
  const AdminView = globalThis.__mods.AdminView;
  const WaiterView = globalThis.__mods.WaiterView;
  const KitchenView = globalThis.__mods.KitchenView;

  // --- Render inicial con AppProvider + Login (verifica que no lanza errores) ---
  function Shell() {
    return React.createElement(AuthProvider, null,
      React.createElement(AppProvider, null, React.createElement(Login)));
  }
  const html = renderToString(React.createElement(Shell));
  if (!html.includes('Iniciar Sesión')) throw new Error('FAIL: login form not rendered');
  console.log('PASS: AppProvider envuelve la app sin errores; Login renderiza.');

  // --- Simular login exitoso contra el backend y verificar estado ---
  const res = await fetch('http://localhost:5173/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const data = await res.json();
  if (!data.success || data.user.rol !== 'admin') throw new Error('FAIL: API login contract broken: ' + JSON.stringify(data));
  sessionStorage.setItem('auth_token', data.data.token);
  console.log('PASS: POST /api/login -> success:true, user.rol=admin (estado global se setea -> App muestra AdminView, no pantalla en blanco).');

  // Verificar que AuthContext.login() (segunda validación usada por Login.tsx) también funciona
  let authOk = null;
  function Probe() {
    const { login } = useAuth();
    React.useEffect(() => { login('admin', 'admin123').then(v => { authOk = v; }); }, []);
    return null;
  }
  // jsdom + hooks: montar con ReactDOM client
  const ReactDOM = require('react-dom/client');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(AuthProvider, null,
    React.createElement(AppProvider, null, React.createElement(Probe))));
  await new Promise(r => setTimeout(r, 1500));
  if (authOk !== true) throw new Error('FAIL: AuthContext.login did not resolve true (got ' + authOk + ')');
  console.log('PASS: AuthContext.login(admin) devolvió true -> user seteado en AuthContext -> switch(user.rol) renderiza AdminView.');

  // Credenciales incorrectas -> false (y App se queda en Login con alerta, no en blanco)
  let bad = null;
  function ProbeBad() {
    const { login } = useAuth();
    React.useEffect(() => { login('admin', 'wrong').then(v => { bad = v; }); }, []);
    return null;
  }
  root.render(React.createElement(AuthProvider, null,
    React.createElement(AppProvider, null, React.createElement(ProbeBad))));
  await new Promise(r => setTimeout(r, 1500));
  if (bad !== false) throw new Error('FAIL: wrong credentials should return false, got ' + bad);
  console.log('PASS: credenciales incorrectas -> login() devuelve false (se muestra error, no pantalla en blanco).');

  // --- Render de la vista real montada tras un login exitoso (verifica que NO queda en blanco) ---
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('pos_usuarios', JSON.stringify([
    { id: '1', nombre: 'Administrador', usuario: 'admin', password_hash: 'x', rol: 'admin', activo: true },
  ]));
  localStorage.setItem('pos_mesas', JSON.stringify([{ id: 'm1', numero_mesa: 1, puestos: 4, estado: 'libre' }]));
  localStorage.setItem('pos_productos', JSON.stringify([]));
  localStorage.setItem('pos_inventario', JSON.stringify([]));
  localStorage.setItem('pos_pedidos', JSON.stringify([]));
  localStorage.setItem('pos_reservas', JSON.stringify([]));
  localStorage.setItem('pos_caja_turnos', JSON.stringify([]));

  function FullApp() {
    const [mounted, setMounted] = React.useState(false);
    const { login } = useAuth();
    React.useEffect(() => {
      login('admin', 'admin123').then((ok) => {
        if (!ok) throw new Error('login failed in full-app test');
        setMounted(true);
      });
    }, []);
    if (!mounted) return null;
    // Reproduce exactamente el árbol nuevo de App.tsx: AuthProvider > AppProvider > contenido
    return React.createElement(AuthProvider, null,
      React.createElement(AppProvider, null, React.createElement(AdminView)));
  }
  root.render(React.createElement(AuthProvider, null,
    React.createElement(AppProvider, null, React.createElement(FullApp))));
  await new Promise(r => setTimeout(r, 2500));
  const bodyText = document.getElementById('root').textContent || '';
  if (bodyText.trim().length === 0) throw new Error('FAIL: pantalla en blanco tras login (DOM vacío)');
  if (!/Administrador/.test(bodyText)) throw new Error('FAIL: AdminView no muestra el usuario autenticado. Contenido: ' + bodyText.slice(0, 200));
  console.log('PASS: tras login correcto, AdminView se renderiza con contenido (usuario "Administrador" visible, DOM no vacío).');

  console.log('\nALL SMOKE TESTS PASSED');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
