/**
 * database.js - Inicialización de SQLite con modo WAL
 * Sistema POS/KDS - Backend Local
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Ruta de la base de datos (en el mismo directorio del backend)
const DB_PATH = path.join(__dirname, 'pos_restaurante.db');

// Crear instancia de SQLite
const db = new Database(DB_PATH);

// ============================================
// CONFIGURACIÓN INICIAL
// ============================================

// Habilitar modo WAL (Write-Ahead Logging) para concurrencia
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -64000'); // 64MB cache

console.log('✅ SQLite inicializado con modo WAL');

// ============================================
// CREACIÓN DE TABLAS
// ============================================

db.exec(`
  -- Tabla de usuarios
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'mesero', 'cocina')),
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  -- Tabla de mesas
  CREATE TABLE IF NOT EXISTS mesas (
    id TEXT PRIMARY KEY,
    numero_mesa INTEGER UNIQUE NOT NULL,
    puestos INTEGER NOT NULL DEFAULT 4,
    zona TEXT NOT NULL DEFAULT 'Interior',
    estado TEXT NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada', 'reservada')),
    notas TEXT,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  -- Tabla de productos (menú)
  CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio_base INTEGER NOT NULL, -- Precio en centavos
    es_desechable INTEGER NOT NULL DEFAULT 0,
    disponible INTEGER NOT NULL DEFAULT 1,
    categoria TEXT NOT NULL CHECK (categoria IN ('Platos', 'Bebidas', 'Postres', 'Desechables')),
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  -- Tabla de inventario (insumos)
  CREATE TABLE IF NOT EXISTS inventario (
    id TEXT PRIMARY KEY,
    producto_id TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_inventario TEXT NOT NULL CHECK (categoria_inventario IN (
      'Carnes y aves',
      'Pescados y mariscos',
      'Frutas y verduras',
      'Lácteos y huevos',
      'Abarrotes y secos',
      'Aceites, salsas y condimentos',
      'Bebidas e insumos líquidos',
      'Congelados',
      'Descartables y suministros'
    )),
    unidad_medida TEXT NOT NULL CHECK (unidad_medida IN ('Unidades', 'Kg', 'Litros', 'Gramos', 'Porciones')),
    stock_actual REAL NOT NULL DEFAULT 0,
    stock_minimo REAL NOT NULL DEFAULT 0,
    precio_costo INTEGER NOT NULL DEFAULT 0, -- En centavos
    precio_venta INTEGER NOT NULL DEFAULT 0, -- En centavos
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
  );

  -- Tabla de pedidos
  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('mesa', 'llevar')),
    mesa_id TEXT,
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    mesero_id TEXT NOT NULL,
    estado_cocina TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_cocina IN ('pendiente', 'preparando', 'listo', 'entregado')),
    estado_pago TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial')),
    total INTEGER NOT NULL DEFAULT 0, -- Total en centavos
    turno_id TEXT,
    fecha_creacion TEXT DEFAULT (datetime('now')),
    fecha_actualizacion TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE SET NULL,
    FOREIGN KEY (mesero_id) REFERENCES usuarios(id),
    FOREIGN KEY (turno_id) REFERENCES caja_turnos(id)
  );

  -- Tabla de detalles de pedido
  CREATE TABLE IF NOT EXISTS detalles_pedido (
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario INTEGER NOT NULL, -- En centavos
    subtotal INTEGER NOT NULL, -- En centavos
    notas TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  );

  -- Tabla de desechables del pedido
  CREATE TABLE IF NOT EXISTS pedido_desechables (
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad REAL NOT NULL,
    subtotal INTEGER NOT NULL, -- En centavos
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  );

  -- Tabla de pagos
  CREATE TABLE IF NOT EXISTS pagos (
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL,
    monto_efectivo INTEGER NOT NULL DEFAULT 0, -- En centavos
    monto_tarjeta INTEGER NOT NULL DEFAULT 0, -- En centavos
    monto_transferencia INTEGER NOT NULL DEFAULT 0, -- En centavos
    total_pagado INTEGER NOT NULL DEFAULT 0, -- En centavos
    cambio INTEGER NOT NULL DEFAULT 0, -- En centavos
    fecha_pago TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
  );

  -- Tabla de caja_turnos (turnos de caja)
  CREATE TABLE IF NOT EXISTS caja_turnos (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    monto_apertura INTEGER NOT NULL DEFAULT 0, -- En centavos
    monto_cierre INTEGER, -- En centavos
    fecha_apertura TEXT DEFAULT (datetime('now')),
    fecha_cierre TEXT,
    estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    total_ventas INTEGER NOT NULL DEFAULT 0, -- En centavos
    total_efectivo INTEGER NOT NULL DEFAULT 0, -- En centavos
    total_tarjeta INTEGER NOT NULL DEFAULT 0, -- En centavos
    total_transferencia INTEGER NOT NULL DEFAULT 0, -- En centavos
    cuadre_diferencia INTEGER, -- En centavos (positivo = sobra, negativo = falta)
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  -- Tabla de reservas
  CREATE TABLE IF NOT EXISTS reservas (
    id TEXT PRIMARY KEY,
    mesa_id TEXT NOT NULL,
    cliente_nombre TEXT NOT NULL,
    fecha_hora TEXT NOT NULL,
    nota TEXT,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'liberada', 'cancelada')),
    creado_en TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE
  );

  -- Tabla de configuración global (Singleton - una sola fila)
  CREATE TABLE IF NOT EXISTS configuracion_global (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton: solo puede haber id=1
    nombre_negocio TEXT NOT NULL DEFAULT 'Mi Restaurante',
    ruc TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    iva_porcentaje REAL NOT NULL DEFAULT 15.0,
    propina_porcentaje REAL NOT NULL DEFAULT 10.0,
    mensaje_ticket TEXT DEFAULT '¡Gracias por su preferencia!',
    papel_impresora TEXT NOT NULL DEFAULT '80mm' CHECK (papel_impresora IN ('58mm', '80mm')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  -- ============================================
  -- ÍNDICES PARA OPTIMIZACIÓN
  -- ============================================
  
  CREATE INDEX IF NOT EXISTS idx_pedidos_estado_pago ON pedidos(estado_pago);
  CREATE INDEX IF NOT EXISTS idx_pedidos_estado_cocina ON pedidos(estado_cocina);
  CREATE INDEX IF NOT EXISTS idx_pedidos_turno_id ON pedidos(turno_id);
  CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_creacion ON pedidos(fecha_creacion);
  CREATE INDEX IF NOT EXISTS idx_pedidos_mesa_id ON pedidos(mesa_id);
  
  CREATE INDEX IF NOT EXISTS idx_pagos_pedido_id ON pagos(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_pagos_fecha_pago ON pagos(fecha_pago);
  
  CREATE INDEX IF NOT EXISTS idx_detalles_pedido_id ON detalles_pedido(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_desechables_pedido_id ON pedido_desechables(pedido_id);
  
  CREATE INDEX IF NOT EXISTS idx_inventario_categoria ON inventario(categoria_inventario);
  CREATE INDEX IF NOT EXISTS idx_inventario_stock ON inventario(stock_actual);
  
  CREATE INDEX IF NOT EXISTS idx_caja_turnos_estado ON caja_turnos(estado);
  CREATE INDEX IF NOT EXISTS idx_caja_turnos_fecha ON caja_turnos(fecha_apertura);
  
  CREATE INDEX IF NOT EXISTS idx_mesas_estado ON mesas(estado);
  CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
  CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
`);

console.log('✅ Tablas e índices creados correctamente');

// ============================================
// DATOS SEMILLA (solo si la base está vacía)
// ============================================

function seedDatabase() {
  const usuariosCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
  
  if (usuariosCount.count > 0) {
    console.log('ℹ️  Base de datos ya tiene datos, omitiendo seed');
    return;
  }

  console.log('🌱 Insertando datos semilla...');

  // Transacción para insertar datos semilla
  const seedTransaction = db.transaction(() => {
    // Usuarios
    const usuarios = [
      {
        id: uuidv4(),
        nombre: 'Administrador',
        usuario: 'admin',
        password_hash: bcrypt.hashSync('admin123', 10),
        rol: 'admin'
      },
      {
        id: uuidv4(),
        nombre: 'Carlos Mesero',
        usuario: 'carlos',
        password_hash: bcrypt.hashSync('1234', 10),
        rol: 'mesero'
      },
      {
        id: uuidv4(),
        nombre: 'María Mesera',
        usuario: 'maria',
        password_hash: bcrypt.hashSync('1234', 10),
        rol: 'mesero'
      },
      {
        id: uuidv4(),
        nombre: 'Cocina Principal',
        usuario: 'cocina',
        password_hash: bcrypt.hashSync('cocina123', 10),
        rol: 'cocina'
      }
    ];

    const insertUsuario = db.prepare(`
      INSERT INTO usuarios (id, nombre, usuario, password_hash, rol)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const u of usuarios) {
      insertUsuario.run(u.id, u.nombre, u.usuario, u.password_hash, u.rol);
    }

    // Mesas
    const mesas = [
      { numero: 1, puestos: 2, zona: 'Terraza' },
      { numero: 2, puestos: 4, zona: 'Terraza' },
      { numero: 3, puestos: 4, zona: 'Terraza' },
      { numero: 4, puestos: 6, zona: 'Interior' },
      { numero: 5, puestos: 2, zona: 'Interior' },
      { numero: 6, puestos: 8, zona: 'Interior' },
      { numero: 7, puestos: 4, zona: 'VIP' },
      { numero: 8, puestos: 6, zona: 'VIP' },
      { numero: 9, puestos: 2, zona: 'Barra' },
      { numero: 10, puestos: 4, zona: 'Barra' }
    ];

    const insertMesa = db.prepare(`
      INSERT INTO mesas (id, numero_mesa, puestos, zona)
      VALUES (?, ?, ?, ?)
    `);

    for (const m of mesas) {
      insertMesa.run(uuidv4(), m.numero, m.puestos, m.zona);
    }

    // Productos
    const productos = [
      { nombre: 'Hamburguesa Clásica', precio: 12000, categoria: 'Platos' },
      { nombre: 'Ensalada César', precio: 9500, categoria: 'Platos' },
      { nombre: 'Pizza Margarita', precio: 15000, categoria: 'Platos' },
      { nombre: 'Pasta Carbonara', precio: 13000, categoria: 'Platos' },
      { nombre: 'Filete de Res', precio: 22000, categoria: 'Platos' },
      { nombre: 'Agua Natural', precio: 2500, categoria: 'Bebidas' },
      { nombre: 'Refresco', precio: 3500, categoria: 'Bebidas' },
      { nombre: 'Cerveza Artesanal', precio: 6500, categoria: 'Bebidas' },
      { nombre: 'Limonada Natural', precio: 4000, categoria: 'Bebidas' },
      { nombre: 'Café Americano', precio: 3500, categoria: 'Bebidas' },
      { nombre: 'Flan Napolitano', precio: 5500, categoria: 'Postres' },
      { nombre: 'Pastel de Chocolate', precio: 7500, categoria: 'Postres' },
      { nombre: 'Tarrina Grande', precio: 800, categoria: 'Desechables', es_desechable: 1 },
      { nombre: 'Cubiertos Desechables', precio: 300, categoria: 'Desechables', es_desechable: 1 },
      { nombre: 'Bolsa Papel', precio: 200, categoria: 'Desechables', es_desechable: 1 }
    ];

    const insertProducto = db.prepare(`
      INSERT INTO productos (id, nombre, precio_base, es_desechable, categoria)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const p of productos) {
      insertProducto.run(
        uuidv4(),
        p.nombre,
        p.precio,
        p.es_desechable || 0,
        p.categoria
      );
    }

    // Configuración Global (Singleton)
    db.prepare(`
      INSERT INTO configuracion_global (
        id, nombre_negocio, ruc, direccion, telefono, 
        iva_porcentaje, propina_porcentaje, mensaje_ticket, papel_impresora
      ) VALUES (
        1, 'Mi Restaurante', '00000000', 'Dirección del negocio', '000-000-000',
        15.0, 10.0, '¡Gracias por su preferencia!', '80mm'
      )
    `).run();

    console.log('✅ Datos semilla insertados correctamente');
  });

  seedTransaction();
}

// Ejecutar seed si se pasa el flag --seed
if (process.argv.includes('--seed')) {
  seedDatabase();
} else {
  // Verificar si necesita seed inicial
  const count = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
  if (count.count === 0) {
    console.log('🌱 Base de datos vacía, ejecutando seed inicial...');
    seedDatabase();
  }
  
  // Verificar si la configuración global existe
  const configCount = db.prepare('SELECT COUNT(*) as count FROM configuracion_global').get();
  if (configCount.count === 0) {
    console.log('🌱 Creando configuración global por defecto...');
    db.prepare(`
      INSERT INTO configuracion_global (
        id, nombre_negocio, ruc, direccion, telefono, 
        iva_porcentaje, propina_porcentaje, mensaje_ticket, papel_impresora
      ) VALUES (
        1, 'Mi Restaurante', '00000000', 'Dirección del negocio', '000-000-000',
        15.0, 10.0, '¡Gracias por su preferencia!', '80mm'
      )
    `).run();
  }
}

// ============================================
// EXPORTAR INSTANCIA DE DB
// ============================================

module.exports = db;
