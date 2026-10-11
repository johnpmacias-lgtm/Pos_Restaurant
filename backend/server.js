/**
 * server.js - Servidor Principal del Backend POS/KDS
 * Sistema POS/KDS - Backend Local (On-Premise)
 * 
 * TECNOLOGÍAS:
 * - Express.js (API REST)
 * - Socket.io (WebSockets para tiempo real)
 * - SQLite (base de datos local)
 * 
 * PUERTO: 3001 (configurable via env PORT)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Importar controladores
const authController = require('./controllers/authController');
const cobroController = require('./controllers/cobroController');
const cajaController = require('./controllers/cajaController');
const configuracionController = require('./controllers/configuracionController');
const reportesController = require('./controllers/reportesController');

// Importar middleware de autenticación
const { verificarToken } = require('./middleware/authMiddleware');

// ============================================
// CONFIGURACIÓN INICIAL
// ============================================

const app = express();
const server = http.createServer(app);

// Configuración de CORS segura (solo frontend local)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// CORS seguro - solo permite el frontend local
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsear JSON
app.use(express.json());

// Parsear URL-encoded
app.use(express.urlencoded({ extended: true }));

// Logger de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Hacer io accesible en los controladores
app.set('io', io);

// ============================================
// RUTAS DE LA API
// ============================================

// Health check (público)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'POS/KDS Backend',
    version: '2.0.0'
  });
});

// --------------------------------------------
// RUTAS DE AUTENTICACIÓN (públicas)
// --------------------------------------------

/**
 * POST /api/login
 * Login de usuario (público) - contrato estándar:
 *   Body:  { username, password }
 *   Resp:  { success: true, user: { id, username, rol } }
 *          { success: false, message: 'Credenciales incorrectas' }
 */
app.post('/api/login', (req, res) => {
  authController.login(req, res);
});

/**
 * POST /api/auth/login
 * Alias compatible con versiones anteriores del frontend.
 */
app.post('/api/auth/login', (req, res) => {
  authController.login(req, res);
});

// --------------------------------------------
// RUTAS PROTEGIDAS (requieren autenticación)
// --------------------------------------------

// Aplicar middleware de autenticación a todas las rutas siguientes
app.use('/api', verificarToken);

/**
 * GET /api/auth/perfil
 * Obtener perfil del usuario autenticado
 */
app.get('/api/auth/perfil', (req, res) => {
  authController.obtenerPerfil(req, res);
});

/**
 * PUT /api/auth/cambiar-password
 * Cambiar contraseña
 */
app.put('/api/auth/cambiar-password', (req, res) => {
  authController.cambiarPassword(req, res);
});

// --------------------------------------------
// RUTAS DE COBRO
// --------------------------------------------

/**
 * POST /api/cobro/cobrar
 * Cobrar un pedido
 */
app.post('/api/cobro/cobrar', (req, res) => {
  cobroController.cobrarPedido(req, res);
});

/**
 * GET /api/cobro/historial
 * Obtener historial de pagos
 */
app.get('/api/cobro/historial', (req, res) => {
  cobroController.obtenerHistorialPagos(req, res);
});

/**
 * GET /api/cobro/pendientes
 * Obtener pedidos pendientes de pago
 */
app.get('/api/cobro/pendientes', (req, res) => {
  cobroController.obtenerPedidosPendientes(req, res);
});

// --------------------------------------------
// RUTAS DE CAJA
// --------------------------------------------

/**
 * POST /api/caja/abrir
 * Abrir caja (crear turno)
 */
app.post('/api/caja/abrir', (req, res) => {
  cajaController.abrirCaja(req, res);
});

/**
 * POST /api/caja/cerrar
 * Cerrar caja (calcular cuadre)
 */
app.post('/api/caja/cerrar', (req, res) => {
  cajaController.cerrarCaja(req, res);
});

/**
 * GET /api/caja/turno-activo
 * Obtener turno activo
 */
app.get('/api/caja/turno-activo', (req, res) => {
  cajaController.obtenerTurnoActivo(req, res);
});

/**
 * GET /api/caja/historial
 * Obtener historial de turnos
 */
app.get('/api/caja/historial', (req, res) => {
  cajaController.obtenerHistorialTurnos(req, res);
});

// --------------------------------------------
// RUTAS DE CONFIGURACIÓN
// --------------------------------------------

/**
 * GET /api/configuracion
 * Obtener configuración global
 */
app.get('/api/configuracion', (req, res) => {
  configuracionController.obtenerConfiguracion(req, res);
});

/**
 * PUT /api/configuracion
 * Actualizar configuración global
 */
app.put('/api/configuracion', (req, res) => {
  configuracionController.actualizarConfiguracion(req, res);
});

/**
 * GET /api/backup
 * Descargar backup de la base de datos
 */
app.get('/api/backup', (req, res) => {
  configuracionController.descargarBackup(req, res);
});

// --------------------------------------------
// RUTAS DE REPORTES
// --------------------------------------------

/**
 * GET /api/reportes/diario
 * Reporte Diario (Reporte Z)
 */
app.get('/api/reportes/diario', (req, res) => {
  reportesController.reporteDiario(req, res);
});

/**
 * GET /api/reportes/rango
 * Reporte de un rango de fechas
 */
app.get('/api/reportes/rango', (req, res) => {
  reportesController.reporteRango(req, res);
});

// --------------------------------------------
// RUTAS DE PEDIDOS (CRUD básico)
// --------------------------------------------

const db = require('./database');

/**
 * GET /api/pedidos
 * Obtener todos los pedidos
 */
app.get('/api/pedidos', (req, res) => {
  const { estado_pago, estado_cocina, tipo, fecha } = req.query;

  let query = `
    SELECT 
      p.*,
      m.numero_mesa,
      u.nombre as mesero_nombre
    FROM pedidos p
    LEFT JOIN mesas m ON p.mesa_id = m.id
    JOIN usuarios u ON p.mesero_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (estado_pago) {
    query += ' AND p.estado_pago = ?';
    params.push(estado_pago);
  }

  if (estado_cocina) {
    query += ' AND p.estado_cocina = ?';
    params.push(estado_cocina);
  }

  if (tipo) {
    query += ' AND p.tipo = ?';
    params.push(tipo);
  }

  if (fecha) {
    query += ' AND DATE(p.fecha_creacion) = ?';
    params.push(fecha);
  }

  query += ' ORDER BY p.fecha_creacion DESC';

  const pedidos = db.prepare(query).all(...params);

  const pedidosFormateados = pedidos.map(p => ({
    ...p,
    total: cobroController.fromCents(p.total)
  }));

  res.json({
    success: true,
    data: pedidosFormateados
  });
});

/**
 * GET /api/pedidos/:id
 * Obtener un pedido específico
 */
app.get('/api/pedidos/:id', (req, res) => {
  const { id } = req.params;

  const pedido = db.prepare(`
    SELECT 
      p.*,
      m.numero_mesa,
      u.nombre as mesero_nombre
    FROM pedidos p
    LEFT JOIN mesas m ON p.mesa_id = m.id
    JOIN usuarios u ON p.mesero_id = u.id
    WHERE p.id = ?
  `).get(id);

  if (!pedido) {
    return res.status(404).json({
      success: false,
      error: 'Pedido no encontrado'
    });
  }

  // Obtener detalles
  const detalles = db.prepare(`
    SELECT dp.*, p.nombre as producto_nombre
    FROM detalles_pedido dp
    JOIN productos p ON dp.producto_id = p.id
    WHERE dp.pedido_id = ?
  `).all(id);

  // Obtener desechables
  const desechables = db.prepare(`
    SELECT pd.*, p.nombre as producto_nombre
    FROM pedido_desechables pd
    JOIN productos p ON pd.producto_id = p.id
    WHERE pd.pedido_id = ?
  `).all(id);

  // Obtener pagos
  const pagos = db.prepare(`
    SELECT * FROM pagos WHERE pedido_id = ?
  `).all(id);

  res.json({
    success: true,
    data: {
      ...pedido,
      total: cobroController.fromCents(pedido.total),
      detalles: detalles.map(d => ({
        ...d,
        precio_unitario: cobroController.fromCents(d.precio_unitario),
        subtotal: cobroController.fromCents(d.subtotal)
      })),
      desechables: desechables.map(d => ({
        ...d,
        subtotal: cobroController.fromCents(d.subtotal)
      })),
      pagos: pagos.map(p => ({
        ...p,
        monto_efectivo: cobroController.fromCents(p.monto_efectivo),
        monto_tarjeta: cobroController.fromCents(p.monto_tarjeta),
        monto_transferencia: cobroController.fromCents(p.monto_transferencia),
        total_pagado: cobroController.fromCents(p.total_pagado),
        cambio: cobroController.fromCents(p.cambio)
      }))
    }
  });
});

/**
 * POST /api/pedidos
 * Crear un nuevo pedido
 */
app.post('/api/pedidos', (req, res) => {
  cobroController.crearPedido(req, res);
});

/**
 * PUT /api/pedidos/:id/estado-cocina
 * Actualizar estado de cocina
 */
app.put('/api/pedidos/:id/estado-cocina', (req, res) => {
  const { id } = req.params;
  const { estado_cocina } = req.body;

  const estadosValidos = ['pendiente', 'preparando', 'listo', 'entregado'];
  if (!estadosValidos.includes(estado_cocina)) {
    return res.status(400).json({
      success: false,
      error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
    });
  }

  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  if (!pedido) {
    return res.status(404).json({
      success: false,
      error: 'Pedido no encontrado'
    });
  }

  db.prepare(`
    UPDATE pedidos 
    SET estado_cocina = ?, fecha_actualizacion = datetime('now')
    WHERE id = ?
  `).run(estado_cocina, id);

  // Emitir evento WebSocket
  io.emit('estado_cocina_actualizado', {
    pedido_id: id,
    estado: estado_cocina
  });

  res.json({
    success: true,
    message: 'Estado de cocina actualizado',
    data: { pedido_id: id, estado_cocina }
  });
});

// --------------------------------------------
// RUTAS DE MESAS
// --------------------------------------------

/**
 * GET /api/mesas
 * Obtener todas las mesas
 */
app.get('/api/mesas', (req, res) => {
  const mesas = db.prepare(`
    SELECT 
      m.*,
      p.id as pedido_activo_id,
      p.total as pedido_total,
      p.estado_pago as pedido_estado_pago
    FROM mesas m
    LEFT JOIN pedidos p ON m.id = p.mesa_id AND p.estado_pago != 'pagado'
    ORDER BY m.numero_mesa
  `).all();

  const mesasFormateadas = mesas.map(m => ({
    ...m,
    pedido_total: m.pedido_total ? cobroController.fromCents(m.pedido_total) : null
  }));

  res.json({
    success: true,
    data: mesasFormateadas
  });
});

/**
 * PUT /api/mesas/:id
 * Actualizar mesa
 */
app.put('/api/mesas/:id', (req, res) => {
  const { id } = req.params;
  const { puestos, zona, notas } = req.body;

  const mesa = db.prepare('SELECT * FROM mesas WHERE id = ?').get(id);
  if (!mesa) {
    return res.status(404).json({
      success: false,
      error: 'Mesa no encontrada'
    });
  }

  db.prepare(`
    UPDATE mesas 
    SET 
      puestos = COALESCE(?, puestos),
      zona = COALESCE(?, zona),
      notas = COALESCE(?, notas),
      actualizado_en = datetime('now')
    WHERE id = ?
  `).run(puestos, zona, notas, id);

  res.json({
    success: true,
    message: 'Mesa actualizada'
  });
});

// --------------------------------------------
// RUTAS DE PRODUCTOS E INVENTARIO
// --------------------------------------------

/**
 * GET /api/productos
 * Obtener todos los productos
 */
app.get('/api/productos', (req, res) => {
  const productos = db.prepare(`
    SELECT * FROM productos WHERE disponible = 1 ORDER BY categoria, nombre
  `).all();

  const productosFormateados = productos.map(p => ({
    ...p,
    precio_base: cobroController.fromCents(p.precio_base)
  }));

  res.json({
    success: true,
    data: productosFormateados
  });
});

/**
 * GET /api/inventario
 * Obtener inventario
 */
app.get('/api/inventario', (req, res) => {
  const { categoria, search } = req.query;

  let query = `
    SELECT i.*, p.nombre as producto_nombre
    FROM inventario i
    LEFT JOIN productos p ON i.producto_id = p.id
    WHERE 1=1
  `;

  const params = [];

  if (categoria) {
    query += ' AND i.categoria_inventario = ?';
    params.push(categoria);
  }

  if (search) {
    query += ' AND (i.nombre LIKE ? OR i.descripcion LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY i.categoria_inventario, i.nombre';

  const inventario = db.prepare(query).all(...params);

  const inventarioFormateado = inventario.map(i => ({
    ...i,
    precio_costo: cobroController.fromCents(i.precio_costo),
    precio_venta: cobroController.fromCents(i.precio_venta)
  }));

  res.json({
    success: true,
    data: inventarioFormateado
  });
});

// ============================================
// SOCKET.IO - EVENTOS EN TIEMPO REAL
// ============================================

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Unirse a salas según el rol
  socket.on('unirse_sala', (sala) => {
    socket.join(sala);
    console.log(`📡 Socket ${socket.id} se unió a la sala: ${sala}`);
  });

  // Evento: Cocina actualiza estado
  socket.on('estado_cocina_actualizado', (data) => {
    io.emit('estado_cocina_actualizado', data);
  });

  // Evento: Mesa liberada
  socket.on('mesa_liberada', (data) => {
    io.emit('mesa_liberada', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// Middleware de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   POS/KDS Backend - Sistema de Restaurante    ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║   🚀 Servidor corriendo en puerto: ${PORT}          ║`);
  console.log(`║   🌐 API: http://localhost:${PORT}/api            ║`);
  console.log(`║   🔌 WebSocket: Socket.io activo                ║`);
  console.log('║   💾 SQLite: Modo WAL habilitado               ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = { app, server, io };
