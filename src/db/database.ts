import { v4 as uuidv4 } from 'uuid';
import {
  Usuario, Mesa, Producto, Inventario, Pedido, Reserva,
  DetallePedido, PedidoDesechable, Pago, CajaApertura,
  EstadoCocina, EstadoPago, EstadoMesa
} from '../types';

const DB_KEYS = {
  usuarios: 'pos_usuarios',
  mesas: 'pos_mesas',
  productos: 'pos_productos',
  inventario: 'pos_inventario',
  pedidos: 'pos_pedidos',
  reservas: 'pos_reservas',
  caja: 'pos_caja',
  session: 'pos_session',
};

function getCollection<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Simple hash for demo (in production use bcrypt)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

export function verifyPassword(password: string, hash: string): boolean {
  return simpleHash(password) === hash;
}

// ============ INITIALIZATION ============
export function initializeDatabase(): void {
  if (localStorage.getItem('pos_initialized')) return;

  // Usuarios
  const usuarios: Usuario[] = [
    { id: uuidv4(), nombre: 'Administrador', usuario: 'admin', password_hash: simpleHash('admin123'), rol: 'admin', activo: true },
    { id: uuidv4(), nombre: 'Carlos Mesero', usuario: 'carlos', password_hash: simpleHash('1234'), rol: 'mesero', activo: true },
    { id: uuidv4(), nombre: 'María Mesera', usuario: 'maria', password_hash: simpleHash('1234'), rol: 'mesero', activo: true },
    { id: uuidv4(), nombre: 'Cocina Principal', usuario: 'cocina', password_hash: simpleHash('cocina123'), rol: 'cocina', activo: true },
  ];
  setCollection(DB_KEYS.usuarios, usuarios);

  // Mesas
  const mesas: Mesa[] = [
    { id: uuidv4(), numero_mesa: 1, puestos: 2, zona: 'Terraza', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 2, puestos: 4, zona: 'Terraza', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 3, puestos: 4, zona: 'Terraza', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 4, puestos: 6, zona: 'Interior', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 5, puestos: 2, zona: 'Interior', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 6, puestos: 8, zona: 'Interior', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 7, puestos: 4, zona: 'VIP', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 8, puestos: 6, zona: 'VIP', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 9, puestos: 2, zona: 'Barra', estado: 'libre' },
    { id: uuidv4(), numero_mesa: 10, puestos: 4, zona: 'Barra', estado: 'libre' },
  ];
  setCollection(DB_KEYS.mesas, mesas);

  // Productos
  const productos: Producto[] = [
    // Platos principales
    { id: uuidv4(), nombre: 'Hamburguesa Clásica', precio_base: 120, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Ensalada César', precio_base: 95, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Pizza Margarita', precio_base: 150, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Pasta Carbonara', precio_base: 130, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Filete de Res', precio_base: 220, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Tacos al Pastor (3)', precio_base: 85, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Sopa del Día', precio_base: 60, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    { id: uuidv4(), nombre: 'Pollo a la Plancha', precio_base: 140, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Platos' },
    // Bebidas
    { id: uuidv4(), nombre: 'Agua Natural', precio_base: 25, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Bebidas' },
    { id: uuidv4(), nombre: 'Refresco', precio_base: 35, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Bebidas' },
    { id: uuidv4(), nombre: 'Cerveza Artesanal', precio_base: 65, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Bebidas' },
    { id: uuidv4(), nombre: 'Limonada Natural', precio_base: 40, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Bebidas' },
    { id: uuidv4(), nombre: 'Café Americano', precio_base: 35, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Bebidas' },
    // Postres
    { id: uuidv4(), nombre: 'Flan Napolitano', precio_base: 55, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Postres' },
    { id: uuidv4(), nombre: 'Pastel de Chocolate', precio_base: 75, es_desechable: false, disponible: true, envase_predeterminado_id: null, categoria: 'Postres' },
    // Desechables
    { id: uuidv4(), nombre: 'Tarrina Grande', precio_base: 8, es_desechable: true, disponible: true, envase_predeterminado_id: null, categoria: 'Desechables' },
    { id: uuidv4(), nombre: 'Tarrina Mediana', precio_base: 5, es_desechable: true, disponible: true, envase_predeterminado_id: null, categoria: 'Desechables' },
    { id: uuidv4(), nombre: 'Cubiertos Desechables', precio_base: 3, es_desechable: true, disponible: true, envase_predeterminado_id: null, categoria: 'Desechables' },
    { id: uuidv4(), nombre: 'Bolsa Papel', precio_base: 2, es_desechable: true, disponible: true, envase_predeterminado_id: null, categoria: 'Desechables' },
    { id: uuidv4(), nombre: 'Servilletas', precio_base: 1, es_desechable: true, disponible: true, envase_predeterminado_id: null, categoria: 'Desechables' },
  ];
  setCollection(DB_KEYS.productos, productos);

  // Inventario
  const inventario: Inventario[] = productos.map(p => ({
    id: uuidv4(),
    producto_id: p.id,
    stock_actual: p.es_desechable ? 200 : 50,
    stock_minimo: p.es_desechable ? 50 : 10,
    precio_costo: Math.round(p.precio_base * 0.4),
    precio_venta: p.precio_base,
  }));
  setCollection(DB_KEYS.inventario, inventario);

  // Pedidos y reservas vacíos
  setCollection(DB_KEYS.pedidos, []);
  setCollection(DB_KEYS.reservas, []);
  setCollection(DB_KEYS.caja, []);

  localStorage.setItem('pos_initialized', 'true');
}

// ============ AUTH ============
export function login(usuario: string, password: string): Usuario | null {
  const usuarios = getCollection<Usuario>(DB_KEYS.usuarios);
  const user = usuarios.find(u => u.usuario === usuario && u.activo && verifyPassword(password, u.password_hash));
  if (user) {
    localStorage.setItem(DB_KEYS.session, JSON.stringify({ usuario_id: user.id, token: 'jwt_' + uuidv4() }));
  }
  return user || null;
}

export function logout(): void {
  localStorage.removeItem(DB_KEYS.session);
}

export function getCurrentUser(): Usuario | null {
  const session = localStorage.getItem(DB_KEYS.session);
  if (!session) return null;
  const { usuario_id } = JSON.parse(session);
  const usuarios = getCollection<Usuario>(DB_KEYS.usuarios);
  return usuarios.find(u => u.id === usuario_id) || null;
}

// ============ MESAS ============
export function getMesas(): Mesa[] {
  return getCollection<Mesa>(DB_KEYS.mesas);
}

export function updateMesaEstado(mesaId: string, estado: EstadoMesa): void {
  const mesas = getMesas();
  const idx = mesas.findIndex(m => m.id === mesaId);
  if (idx >= 0) {
    mesas[idx].estado = estado;
    setCollection(DB_KEYS.mesas, mesas);
  }
}

// ============ PRODUCTOS ============
export function getProductos(): Producto[] {
  return getCollection<Producto>(DB_KEYS.productos);
}

export function updateProducto(producto: Producto): void {
  const productos = getProductos();
  const idx = productos.findIndex(p => p.id === producto.id);
  if (idx >= 0) {
    productos[idx] = producto;
    setCollection(DB_KEYS.productos, productos);
  }
}

export function addProducto(producto: Producto): void {
  const productos = getProductos();
  productos.push(producto);
  setCollection(DB_KEYS.productos, productos);
}

// ============ INVENTARIO ============
export function getInventario(): Inventario[] {
  return getCollection<Inventario>(DB_KEYS.inventario);
}

export function updateInventario(inventario: Inventario): void {
  const items = getInventario();
  const idx = items.findIndex(i => i.id === inventario.id);
  if (idx >= 0) {
    items[idx] = inventario;
    setCollection(DB_KEYS.inventario, items);
  }
}

// ============ PEDIDOS (with transactions) ============
export function getPedidos(): Pedido[] {
  return getCollection<Pedido>(DB_KEYS.pedidos);
}

export function getPedidoById(id: string): Pedido | null {
  const pedidos = getPedidos();
  return pedidos.find(p => p.id === id) || null;
}

export function getPedidosByCocina(): Pedido[] {
  return getPedidos().filter(p => p.estado_cocina !== 'entregado');
}

export function crearPedido(pedido: Omit<Pedido, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Pedido {
  const pedidos = getPedidos();
  const newPedido: Pedido = {
    ...pedido,
    id: uuidv4(),
    fecha_creacion: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  };
  pedidos.push(newPedido);
  setCollection(DB_KEYS.pedidos, pedidos);
  return newPedido;
}

export function updateEstadoCocina(pedidoId: string, estado: EstadoCocina): Pedido | null {
  const pedidos = getPedidos();
  const idx = pedidos.findIndex(p => p.id === pedidoId);
  if (idx >= 0) {
    pedidos[idx].estado_cocina = estado;
    pedidos[idx].fecha_actualizacion = new Date().toISOString();
    setCollection(DB_KEYS.pedidos, pedidos);
    return pedidos[idx];
  }
  return null;
}

// TRANSACTION: Cobrar pedido + descontar inventario (atómico)
export function cobrarPedido(
  pedidoId: string,
  montoEfectivo: number,
  montoTarjeta: number,
  montoTransferencia: number
): { success: boolean; error?: string; pedido?: Pedido } {
  try {
    // BEGIN TRANSACTION (simulated)
    const pedidos = getPedidos();
    const pedidoIdx = pedidos.findIndex(p => p.id === pedidoId);
    if (pedidoIdx < 0) throw new Error('Pedido no encontrado');

    const pedido = pedidos[pedidoIdx];
    const totalPagado = montoEfectivo + montoTarjeta + montoTransferencia;

    if (totalPagado < pedido.total) {
      throw new Error(`El monto pagado ($${totalPagado}) es menor al total ($${pedido.total})`);
    }

    // Verificar inventario
    const inventario = getInventario();
    const productos = getProductos();

    // Verificar stock de productos del pedido
    for (const detalle of pedido.detalles) {
      const inv = inventario.find(i => i.producto_id === detalle.producto_id);
      if (!inv) throw new Error(`Inventario no encontrado para producto ${detalle.producto_id}`);
      if (inv.stock_actual < detalle.cantidad) {
        const prod = productos.find(p => p.id === detalle.producto_id);
        throw new Error(`Stock insuficiente de ${prod?.nombre || detalle.producto_id}`);
      }
    }

    // Verificar stock de desechables
    for (const desechable of pedido.desechables) {
      const inv = inventario.find(i => i.producto_id === desechable.producto_id);
      if (!inv) throw new Error(`Inventario no encontrado para desechable ${desechable.producto_id}`);
      if (inv.stock_actual < desechable.cantidad) {
        const prod = productos.find(p => p.id === desechable.producto_id);
        throw new Error(`Stock insuficiente de ${prod?.nombre || desechable.producto_id}`);
      }
    }

    // Descontar inventario (productos)
    for (const detalle of pedido.detalles) {
      const invIdx = inventario.findIndex(i => i.producto_id === detalle.producto_id);
      if (invIdx >= 0) {
        inventario[invIdx].stock_actual -= detalle.cantidad;
      }
    }

    // Descontar inventario (desechables)
    for (const desechable of pedido.desechables) {
      const invIdx = inventario.findIndex(i => i.producto_id === desechable.producto_id);
      if (invIdx >= 0) {
        inventario[invIdx].stock_actual -= desechable.cantidad;
      }
    }

    // Actualizar pedido
    const pago: Pago = {
      id: uuidv4(),
      pedido_id: pedidoId,
      monto_efectivo: montoEfectivo,
      monto_tarjeta: montoTarjeta,
      monto_transferencia: montoTransferencia,
      total_pagado: totalPagado,
    };

    pedidos[pedidoIdx].pagos = [...pedido.pagos, pago];
    pedidos[pedidoIdx].estado_pago = totalPagado >= pedido.total ? 'pagado' : 'parcial';
    pedidos[pedidoIdx].fecha_actualizacion = new Date().toISOString();

    // Si es pedido de mesa y está pagado, liberar mesa
    if (pedido.tipo === 'mesa' && pedidos[pedidoIdx].estado_pago === 'pagado' && pedido.mesa_id) {
      const mesas = getMesas();
      const mesaIdx = mesas.findIndex(m => m.id === pedido.mesa_id);
      if (mesaIdx >= 0) {
        mesas[mesaIdx].estado = 'libre';
        setCollection(DB_KEYS.mesas, mesas);
      }
    }

    // COMMIT
    setCollection(DB_KEYS.pedidos, pedidos);
    setCollection(DB_KEYS.inventario, inventario);

    return { success: true, pedido: pedidos[pedidoIdx] };
  } catch (error: any) {
    // ROLLBACK
    return { success: false, error: error.message };
  }
}

// ============ RESERVAS ============
export function getReservas(): Reserva[] {
  return getCollection<Reserva>(DB_KEYS.reservas);
}

export function crearReserva(reserva: Omit<Reserva, 'id'>): Reserva {
  const reservas = getReservas();
  const newReserva: Reserva = { ...reserva, id: uuidv4() };
  reservas.push(newReserva);
  setCollection(DB_KEYS.reservas, reservas);

  // Marcar mesa como reservada
  updateMesaEstado(reserva.mesa_id, 'reservada');
  return newReserva;
}

export function liberarReserva(reservaId: string): void {
  const reservas = getReservas();
  const idx = reservas.findIndex(r => r.id === reservaId);
  if (idx >= 0) {
    reservas[idx].estado = 'liberada';
    updateMesaEstado(reservas[idx].mesa_id, 'libre');
    setCollection(DB_KEYS.reservas, reservas);
  }
}

// ============ CAJA ============
export function getCaja(): CajaApertura[] {
  return getCollection<CajaApertura>(DB_KEYS.caja);
}

export function abrirCaja(usuarioId: string, montoInicial: number): CajaApertura {
  const cajas = getCaja();
  const nueva: CajaApertura = {
    id: uuidv4(),
    usuario_id: usuarioId,
    monto_inicial: montoInicial,
    fecha_apertura: new Date().toISOString(),
    fecha_cierre: null,
    monto_final: null,
  };
  cajas.push(nueva);
  setCollection(DB_KEYS.caja, cajas);
  return nueva;
}

export function cerrarCaja(cajaId: string, montoFinal: number): void {
  const cajas = getCaja();
  const idx = cajas.findIndex(c => c.id === cajaId);
  if (idx >= 0) {
    cajas[idx].fecha_cierre = new Date().toISOString();
    cajas[idx].monto_final = montoFinal;
    setCollection(DB_KEYS.caja, cajas);
  }
}

// ============ BROADCAST CHANNEL (Simula WebSockets) ============
const channel = new BroadcastChannel('pos_system');

export function emitEvent(type: string, payload: any): void {
  channel.postMessage({ type, payload, timestamp: new Date().toISOString() });
}

export function onEvent(callback: (event: { type: string; payload: any; timestamp: string }) => void): () => void {
  const handler = (event: MessageEvent) => callback(event.data);
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

// ============ USUARIOS CRUD ============
export function getUsuarios(): Usuario[] {
  return getCollection<Usuario>(DB_KEYS.usuarios);
}

export function addUsuario(usuario: Omit<Usuario, 'id' | 'password_hash'> & { password: string }): Usuario {
  const usuarios = getUsuarios();
  const newUser: Usuario = {
    id: uuidv4(),
    nombre: usuario.nombre,
    usuario: usuario.usuario,
    password_hash: simpleHash(usuario.password),
    rol: usuario.rol,
    activo: usuario.activo,
  };
  usuarios.push(newUser);
  setCollection(DB_KEYS.usuarios, usuarios);
  return newUser;
}

export function toggleUsuarioActivo(userId: string): void {
  const usuarios = getUsuarios();
  const idx = usuarios.findIndex(u => u.id === userId);
  if (idx >= 0) {
    usuarios[idx].activo = !usuarios[idx].activo;
    setCollection(DB_KEYS.usuarios, usuarios);
  }
}
