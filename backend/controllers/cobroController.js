/**
 * cobroController.js - Controlador de Cobro de Pedidos
 * Sistema POS/KDS - Backend Local
 * 
 * CARACTERÍSTICAS CRÍTICAS:
 * - Usa transacciones SQL para atomicidad
 * - Valida doble cobro (evita descontar inventario dos veces)
 * - Maneja montos en INTEGER (centavos) para precisión
 * - Permite pagos parciales
 * - Calcula cambio/vuelto automáticamente
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
 * Cobrar un pedido (con transacción SQL)
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

  // Convertir montos a centavos
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
  // TRANSACCIÓN SQL
  // ============================================
  
  const transaction = db.transaction(() => {
    // 1. Obtener el pedido con bloqueo (SELECT FOR UPDATE simulado con transacción)
    const pedido = db.prepare(`
      SELECT * FROM pedidos WHERE id = ?
    `).get(pedido_id);

    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    // 2. VALIDACIÓN CRÍTICA: Verificar que el pedido no esté ya pagado
    if (pedido.estado_pago === 'pagado') {
      throw new Error('Este pedido ya fue pagado. No se puede cobrar dos veces.');
    }

    // 3. Calcular montos
    const totalPedidoCents = pedido.total;
    const cambioCents = Math.max(0, totalPagadoCents - totalPedidoCents);

    // 4. Validar que el monto pagado sea suficiente
    if (totalPagadoCents < totalPedidoCents) {
      // Pago parcial permitido
      const nuevoEstadoPago = 'parcial';
      
      // Registrar pago parcial
      const pagoId = uuidv4();
      db.prepare(`
        INSERT INTO pagos (id, pedido_id, monto_efectivo, monto_tarjeta, monto_transferencia, total_pagado, cambio)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(pagoId, pedido_id, efectivoCents, tarjetaCents, transferenciaCents, totalPagadoCents, 0);

      // Actualizar estado del pedido
      db.prepare(`
        UPDATE pedidos 
        SET estado_pago = ?, fecha_actualizacion = datetime('now')
        WHERE id = ?
      `).run(nuevoEstadoPago, pedido_id);

      return {
        success: true,
        message: 'Pago parcial registrado',
        data: {
          pedido_id,
          estado_pago: nuevoEstadoPago,
          total_pedido: fromCents(totalPedidoCents),
          total_pagado: fromCents(totalPagadoCents),
          saldo_pendiente: fromCents(totalPedidoCents - totalPagadoCents),
          cambio: 0
        }
      };
    }

    // 5. Pago completo - Descontar inventario
    // Obtener detalles del pedido
    const detalles = db.prepare(`
      SELECT dp.*, p.nombre as producto_nombre, p.id as producto_id
      FROM detalles_pedido dp
      JOIN productos p ON dp.producto_id = p.id
      WHERE dp.pedido_id = ?
    `).all(pedido_id);

    // Obtener desechables del pedido
    const desechables = db.prepare(`
      SELECT pd.*, p.nombre as producto_nombre, p.id as producto_id
      FROM pedido_desechables pd
      JOIN productos p ON pd.producto_id = p.id
      WHERE pd.pedido_id = ?
    `).all(pedido_id);

    // 6. Validar stock antes de descontar
    for (const detalle of detalles) {
      const inventario = db.prepare(`
        SELECT * FROM inventario WHERE producto_id = ?
      `).get(detalle.producto_id);

      if (inventario && inventario.stock_actual < detalle.cantidad) {
        throw new Error(`Stock insuficiente de ${inventario.nombre}. Disponible: ${inventario.stock_actual}, Requerido: ${detalle.cantidad}`);
      }
    }

    for (const desechable of desechables) {
      const inventario = db.prepare(`
        SELECT * FROM inventario WHERE producto_id = ?
      `).get(desechable.producto_id);

      if (inventario && inventario.stock_actual < desechable.cantidad) {
        throw new Error(`Stock insuficiente de ${inventario.nombre}. Disponible: ${inventario.stock_actual}, Requerido: ${desechable.cantidad}`);
      }
    }

    // 7. Descontar inventario (productos)
    for (const detalle of detalles) {
      db.prepare(`
        UPDATE inventario 
        SET stock_actual = stock_actual - ?
        WHERE producto_id = ?
      `).run(detalle.cantidad, detalle.producto_id);
    }

    // 8. Descontar inventario (desechables)
    for (const desechable of desechables) {
      db.prepare(`
        UPDATE inventario 
        SET stock_actual = stock_actual - ?
        WHERE producto_id = ?
      `).run(desechable.cantidad, desechable.producto_id);
    }

    // 9. Registrar pago completo
    const pagoId = uuidv4();
    db.prepare(`
      INSERT INTO pagos (id, pedido_id, monto_efectivo, monto_tarjeta, monto_transferencia, total_pagado, cambio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pagoId, pedido_id, efectivoCents, tarjetaCents, transferenciaCents, totalPagadoCents, cambioCents);

    // 10. Actualizar estado del pedido
    db.prepare(`
      UPDATE pedidos 
      SET estado_pago = 'pagado', fecha_actualizacion = datetime('now')
      WHERE id = ?
    `).run(pedido_id);

    // 11. Si es pedido de mesa, liberar la mesa
    if (pedido.tipo === 'mesa' && pedido.mesa_id) {
      db.prepare(`
        UPDATE mesas 
        SET estado = 'libre', actualizado_en = datetime('now')
        WHERE id = ?
      `).run(pedido.mesa_id);
    }

    // 12. Retornar resultado
    return {
      success: true,
      message: 'Pedido cobrado exitosamente',
      data: {
        pedido_id,
        estado_pago: 'pagado',
        total_pedido: fromCents(totalPedidoCents),
        total_pagado: fromCents(totalPagadoCents),
        cambio: fromCents(cambioCents),
        pago_id: pagoId
      }
    };
  });

  // Ejecutar transacción
  try {
    const result = transaction();
    
    // Emitir evento WebSocket (se hace en server.js)
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
  obtenerHistorialPagos,
  obtenerPedidosPendientes,
  toCents,
  fromCents
};
