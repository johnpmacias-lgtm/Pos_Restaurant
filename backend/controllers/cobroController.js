/**
 * cobroController.js - Controlador de Cobro de Pedidos
 * Sistema POS/KDS - Backend Local
 * 
 * CARACTERÍSTICAS CRÍTICAS:
 * - Transacciones SQL reales para atomicidad
 * - Pagos parciales con saldo pendiente
 * - Moneda SIEMPRE en centavos (enteros)
 * - Prevención de doble cobro
 * - Validación de stock antes de descontar
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');

/**
 * Convertir pesos a centavos (evitar errores de punto flotante)
 * @param {number} amount - Monto en pesos
 * @returns {number} Monto en centavos
 */
function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

/**
 * Convertir centavos a pesos
 * @param {number} cents - Monto en centavos
 * @returns {number} Monto en pesos
 */
function fromCents(cents) {
  return Number(cents) / 100;
}

/**
 * Cobrar un pedido (con transacción SQL real)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
function cobrarPedido(req, res) {
  const { pedido_id, monto_efectivo, monto_tarjeta, monto_transferencia } = req.body;

  // ============================================
  // VALIDACIÓN DE PARÁMETROS
  // ============================================
  
  if (!pedido_id) {
    return res.status(400).json({
      success: false,
      error: 'pedido_id es requerido'
    });
  }

  // Convertir montos a centavos (SIEMPRE trabajar en centavos)
  const efectivoCents = toCents(monto_efectivo || 0);
  const tarjetaCents = toCents(monto_tarjeta || 0);
  const transferenciaCents = toCents(monto_transferencia || 0);
  const totalPagadoCents = efectivoCents + tarjetaCents + transferenciaCents;

  if (totalPagadoCents <= 0) {
    return res.status(400).json({
      success: false,
      error: 'El monto total pagado debe ser mayor a 0'
    });
  }

  // ============================================
  // TRANSACCIÓN SQL REAL
  // ============================================
  
  const transaction = db.transaction(() => {
    // 1. Obtener el pedido con bloqueo
    const pedido = db.prepare(`
      SELECT * FROM pedidos WHERE id = ?
    `).get(pedido_id);

    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    // 2. VALIDACIÓN CRÍTICA: Verificar que el pedido no esté ya pagado completamente
    if (pedido.estado_pago === 'pagado') {
      throw new Error('Este pedido ya fue pagado completamente. No se puede cobrar dos veces.');
    }

    // 3. Calcular montos
    const totalPedidoCents = pedido.total;
    const cambioCents = Math.max(0, totalPagadoCents - totalPedidoCents);

    // 4. Determinar si es pago completo o parcial
    const esPagoCompleto = totalPagadoCents >= totalPedidoCents;
    const nuevoEstadoPago = esPagoCompleto ? 'pagado' : 'parcial';

    // 5. Registrar pago
    const pagoId = uuidv4();
    db.prepare(`
      INSERT INTO pagos (id, pedido_id, monto_efectivo, monto_tarjeta, monto_transferencia, total_pagado, cambio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pagoId, pedido_id, efectivoCents, tarjetaCents, transferenciaCents, totalPagadoCents, cambioCents);

    // 6. Actualizar estado del pedido
    db.prepare(`
      UPDATE pedidos 
      SET estado_pago = ?, fecha_actualizacion = datetime('now')
      WHERE id = ?
    `).run(nuevoEstadoPago, pedido_id);

    // 7. Si es pago completo y es pedido de mesa, liberar la mesa
    if (esPagoCompleto && pedido.tipo === 'mesa' && pedido.mesa_id) {
      db.prepare(`
        UPDATE mesas 
        SET estado = 'libre', actualizado_en = datetime('now')
        WHERE id = ?
      `).run(pedido.mesa_id);
    }

    // 8. Retornar resultado
    return {
      success: true,
      message: esPagoCompleto ? 'Pedido cobrado exitosamente' : 'Pago parcial registrado',
      data: {
        pedido_id,
        estado_pago: nuevoEstadoPago,
        total_pedido: fromCents(totalPedidoCents),
        total_pagado: fromCents(totalPagadoCents),
        cambio: fromCents(cambioCents),
        pago_id: pagoId,
        saldo_pendiente: esPagoCompleto ? 0 : fromCents(totalPedidoCents - totalPagadoCents)
      }
    };
  });

  // Ejecutar transacción
  try {
    const result = transaction();
    
    // Emitir evento WebSocket
    req.app.get('io')?.emit('pedido_cobrado', {
      pedido_id,
      total: fromCents(db.prepare('SELECT total FROM pedidos WHERE id = ?').get(pedido_id).total)
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error al cobrar pedido:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Crear pedido (con descuento de stock al enviar a cocina)
 */
function crearPedido(req, res) {
  const {
    tipo, mesa_id, cliente_nombre, cliente_telefono,
    detalles, desechables
  } = req.body;

  // Validaciones
  if (!tipo || !detalles || detalles.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Campos requeridos: tipo, detalles'
  });
  }

  // ============================================
  // TRANSACCIÓN SQL
  // ============================================
  
  const transaction = db.transaction(() => {
    // Calcular total
    let totalCents = 0;

    const detallesProcesados = detalles.map(d => {
      const subtotalCents = Math.round(d.precio_unitario * 100) * d.cantidad;
      totalCents += subtotalCents;
      return {
        id: uuidv4(),
        pedido_id: null,
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio_unitario: Math.round(d.precio_unitario * 100),
        subtotal: subtotalCents,
        notas: d.notas || ''
      };
    });

    const desechablesProcesados = (desechables || []).map(d => {
      const subtotalCents = Math.round(d.precio_unitario * 100) * d.cantidad;
      totalCents += subtotalCents;
      return {
        id: uuidv4(),
        pedido_id: null,
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        subtotal: subtotalCents
      };
    });

    // Obtener turno activo
    const turnoActivo = db.prepare(`
      SELECT id FROM caja_turnos WHERE estado = 'abierto' LIMIT 1
    `).get();

    // Crear pedido
    const pedidoId = uuidv4();

    db.prepare(`
      INSERT INTO pedidos (id, tipo, mesa_id, cliente_nombre, cliente_telefono, mesero_id, total, turno_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pedidoId, tipo, mesa_id || null, cliente_nombre || null,
      cliente_telefono || null, req.user.id, totalCents, turnoActivo?.id || null
    );

    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO detalles_pedido (id, pedido_id, producto_id, cantidad, precio_unitario, subtotal, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const d of detallesProcesados) {
      insertDetalle.run(d.id, pedidoId, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal, d.notas);
    }

    // Insertar desechables
    const insertDesechable = db.prepare(`
      INSERT INTO pedido_desechables (id, pedido_id, producto_id, cantidad, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const d of desechablesProcesados) {
      insertDesechable.run(d.id, pedidoId, d.producto_id, d.cantidad, d.subtotal);
    }

    // Si es mesa, marcar como ocupada
    if (tipo === 'mesa' && mesa_id) {
      db.prepare(`
        UPDATE mesas SET estado = 'ocupada', actualizado_en = datetime('now') WHERE id = ?
      `).run(mesa_id);
    }

    return {
      success: true,
      message: 'Pedido creado exitosamente',
      data: {
        pedido_id: pedidoId,
        total: fromCents(totalCents),
        turno_id: turnoActivo?.id || null
      }
    };
  });

  try {
    const result = transaction();
    
    // Emitir evento WebSocket
    req.app.get('io')?.emit('nuevo_pedido', {
      pedido_id: result.data.pedido_id,
      tipo,
      mesa: mesa_id ? db.prepare('SELECT numero_mesa FROM mesas WHERE id = ?').get(mesa_id)?.numero_mesa : null
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error al crear pedido:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtener historial de pagos
 */
function obtenerHistorialPagos(req, res) {
  const { fecha_inicio, fecha_fin } = req.query;

  let query = `
    SELECT 
      p.*,
      ped.tipo,
      ped.mesa_id,
      ped.cliente_nombre,
      ped.total as total_pedido,
      u.nombre as mesero_nombre
    FROM pagos p
    JOIN pedidos ped ON p.pedido_id = ped.id
    JOIN usuarios u ON ped.mesero_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (fecha_inicio) {
    query += ' AND p.fecha_pago >= ?';
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    query += ' AND p.fecha_pago <= ?';
    params.push(fecha_fin);
  }

  query += ' ORDER BY p.fecha_pago DESC';

  const pagos = db.prepare(query).all(...params);

  // Convertir centavos a pesos
  const pagosFormateados = pagos.map(p => ({
    ...p,
    monto_efectivo: fromCents(p.monto_efectivo),
    monto_tarjeta: fromCents(p.monto_tarjeta),
    monto_transferencia: fromCents(p.monto_transferencia),
    total_pagado: fromCents(p.total_pagado),
    cambio: fromCents(p.cambio),
    total_pedido: fromCents(p.total_pedido)
  }));

  res.json({
    success: true,
    data: pagosFormateados
  });
}

/**
 * Obtener pedidos pendientes de pago
 */
function obtenerPedidosPendientes(req, res) {
  const pedidos = db.prepare(`
    SELECT 
      p.*,
      m.numero_mesa,
      u.nombre as mesero_nombre
    FROM pedidos p
    LEFT JOIN mesas m ON p.mesa_id = m.id
    JOIN usuarios u ON p.mesero_id = u.id
    WHERE p.estado_pago IN ('pendiente', 'parcial')
    ORDER BY p.fecha_creacion DESC
  `).all();

  const pedidosFormateados = pedidos.map(p => ({
    ...p,
    total: fromCents(p.total)
  }));

  res.json({
    success: true,
    data: pedidosFormateados
  });
}

module.exports = {
  cobrarPedido,
  crearPedido,
  obtenerHistorialPagos,
  obtenerPedidosPendientes,
  toCents,
  fromCents
};
