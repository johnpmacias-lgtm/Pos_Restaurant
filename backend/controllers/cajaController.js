/**
 * cajaController.js - Controlador de Gestión de Caja
 * Sistema POS/KDS - Backend Local
 * 
 * FUNCIONALIDADES:
 * - Apertura de caja (crear turno)
 * - Cierre de caja (calcular cuadre)
 * - Obtener turno activo
 * - Historial de turnos
 * 
 * NOTA: Todos los montos se manejan en centavos (INTEGER)
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { toCents, fromCents } = require('./cobroController');

/**
 * Abrir caja (crear nuevo turno)
 */
function abrirCaja(req, res) {
  const { usuario_id, monto_apertura } = req.body;

  // ============================================
  // VALIDACIÓN
  // ============================================
  
  if (!usuario_id) {
    return res.status(400).json({
      success: false,
      error: 'usuario_id es requerido'
    });
  }

  // Verificar que el usuario existe
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ? AND activo = 1').get(usuario_id);
  if (!usuario) {
    return res.status(404).json({
      success: false,
      error: 'Usuario no encontrado o inactivo'
    });
  }

  // Verificar que no haya un turno abierto
  const turnoActivo = db.prepare(`
    SELECT * FROM caja_turnos WHERE estado = 'abierto'
  `).get();

  if (turnoActivo) {
    return res.status(400).json({
      success: false,
      error: 'Ya existe un turno de caja abierto',
      data: {
        turno_id: turnoActivo.id,
        fecha_apertura: turnoActivo.fecha_apertura
      }
    });
  }

  // ============================================
  // CREAR TURNO
  // ============================================
  
  const turnoId = uuidv4();
  const montoAperturaCents = toCents(monto_apertura || 0);

  db.prepare(`
    INSERT INTO caja_turnos (id, usuario_id, monto_apertura, estado)
    VALUES (?, ?, ?, 'abierto')
  `).run(turnoId, usuario_id, montoAperturaCents);

  console.log(`✅ Caja abierta - Turno: ${turnoId}, Usuario: ${usuario.nombre}, Monto: $${fromCents(montoAperturaCents)}`);

  res.json({
    success: true,
    message: 'Caja abierta exitosamente',
    data: {
      turno_id: turnoId,
      usuario_id,
      usuario_nombre: usuario.nombre,
      monto_apertura: fromCents(montoAperturaCents),
      fecha_apertura: new Date().toISOString()
    }
  });
}

/**
 * Cerrar caja (calcular cuadre)
 */
function cerrarCaja(req, res) {
  const { turno_id, monto_cierre_contado } = req.body;

  // ============================================
  // VALIDACIÓN
  // ============================================
  
  if (!turno_id) {
    return res.status(400).json({
      success: false,
      error: 'turno_id es requerido'
    });
  }

  // Buscar el turno
  const turno = db.prepare(`
    SELECT * FROM caja_turnos WHERE id = ?
  `).get(turno_id);

  if (!turno) {
    return res.status(404).json({
      success: false,
      error: 'Turno no encontrado'
    });
  }

  if (turno.estado === 'cerrado') {
    return res.status(400).json({
      success: false,
      error: 'Este turno ya fue cerrado',
      data: {
        fecha_cierre: turno.fecha_cierre
      }
    });
  }

  // ============================================
  // CÁLCULO DE CUADRE
  // ============================================
  
  const montoCierreCents = toCents(monto_cierre_contado || 0);

  // Obtener todos los pedidos pagados de este turno
  const pedidosDelTurno = db.prepare(`
    SELECT 
      p.id,
      p.total,
      pg.monto_efectivo,
      pg.monto_tarjeta,
      pg.monto_transferencia,
      pg.total_pagado
    FROM pedidos p
    JOIN pagos pg ON p.id = pg.pedido_id
    WHERE p.turno_id = ? AND p.estado_pago = 'pagado'
  `).all(turno_id);

  // Calcular totales
  let totalVentasCents = 0;
  let totalEfectivoCents = 0;
  let totalTarjetaCents = 0;
  let totalTransferenciaCents = 0;

  for (const pedido of pedidosDelTurno) {
    totalVentasCents += pedido.total_pagado;
    totalEfectivoCents += pedido.monto_efectivo;
    totalTarjetaCents += pedido.monto_tarjeta;
    totalTransferenciaCents += pedido.monto_transferencia;
  }

  // Calcular esperado en caja (efectivo)
  const esperadoEnCajaCents = turno.monto_apertura + totalEfectivoCents;
  
  // Calcular diferencia (cuadre)
  // Positivo = sobra dinero
  // Negativo = falta dinero
  const cuadreDiferenciaCents = montoCierreCents - esperadoEnCajaCents;

  // ============================================
  // CERRAR TURNO
  // ============================================
  
  db.prepare(`
    UPDATE caja_turnos 
    SET 
      monto_cierre = ?,
      fecha_cierre = datetime('now'),
      estado = 'cerrado',
      total_ventas = ?,
      total_efectivo = ?,
      total_tarjeta = ?,
      total_transferencia = ?,
      cuadre_diferencia = ?
    WHERE id = ?
  `).run(
    montoCierreCents,
    totalVentasCents,
    totalEfectivoCents,
    totalTarjetaCents,
    totalTransferenciaCents,
    cuadreDiferenciaCents,
    turno_id
  );

  console.log(`✅ Caja cerrada - Turno: ${turno_id}`);
  console.log(`   Ventas: $${fromCents(totalVentasCents)}`);
  console.log(`   Esperado: $${fromCents(esperadoEnCajaCents)}`);
  console.log(`   Contado: $${fromCents(montoCierreCents)}`);
  console.log(`   Diferencia: $${fromCents(cuadreDiferenciaCents)} ${cuadreDiferenciaCents >= 0 ? '(Sobra)' : '(Falta)'}`);

  res.json({
    success: true,
    message: 'Caja cerrada exitosamente',
    data: {
      turno_id,
      fecha_cierre: new Date().toISOString(),
      resumen: {
        monto_apertura: fromCents(turno.monto_apertura),
        total_ventas: fromCents(totalVentasCents),
        total_efectivo: fromCents(totalEfectivoCents),
        total_tarjeta: fromCents(totalTarjetaCents),
        total_transferencia: fromCents(totalTransferenciaCents),
        esperado_en_caja: fromCents(esperadoEnCajaCents),
        monto_cierre_contado: fromCents(montoCierreCents),
        cuadre_diferencia: fromCents(cuadreDiferenciaCents),
        cuadre_estado: cuadreDiferenciaCents === 0 ? 'CUADRADO' : 
                       cuadreDiferenciaCents > 0 ? 'SOBRANTE' : 'FALTANTE',
        numero_pedidos: pedidosDelTurno.length
      }
    }
  });
}

/**
 * Obtener turno activo
 */
function obtenerTurnoActivo(req, res) {
  const turno = db.prepare(`
    SELECT 
      ct.*,
      u.nombre as usuario_nombre,
      u.usuario as usuario_username
    FROM caja_turnos ct
    JOIN usuarios u ON ct.usuario_id = u.id
    WHERE ct.estado = 'abierto'
    ORDER BY ct.fecha_apertura DESC
    LIMIT 1
  `).get();

  if (!turno) {
    return res.json({
      success: true,
      data: null,
      message: 'No hay turno activo'
    });
  }

  // Calcular ventas del turno en tiempo real
  const ventasTurno = db.prepare(`
    SELECT 
      COUNT(*) as numero_pedidos,
      COALESCE(SUM(p.total), 0) as total_ventas,
      COALESCE(SUM(pg.monto_efectivo), 0) as total_efectivo,
      COALESCE(SUM(pg.monto_tarjeta), 0) as total_tarjeta,
      COALESCE(SUM(pg.monto_transferencia), 0) as total_transferencia
    FROM pedidos p
    JOIN pagos pg ON p.id = pg.pedido_id
    WHERE p.turno_id = ? AND p.estado_pago = 'pagado'
  `).get(turno.id);

  res.json({
    success: true,
    data: {
      turno_id: turno.id,
      usuario_id: turno.usuario_id,
      usuario_nombre: turno.usuario_nombre,
      usuario_username: turno.usuario_username,
      monto_apertura: fromCents(turno.monto_apertura),
      fecha_apertura: turno.fecha_apertura,
      estado: turno.estado,
      ventas_en_tiempo_real: {
        numero_pedidos: ventasTurno.numero_pedidos,
        total_ventas: fromCents(ventasTurno.total_ventas),
        total_efectivo: fromCents(ventasTurno.total_efectivo),
        total_tarjeta: fromCents(ventasTurno.total_tarjeta),
        total_transferencia: fromCents(ventasTurno.total_transferencia),
        esperado_en_caja: fromCents(turno.monto_apertura + ventasTurno.total_efectivo)
      }
    }
  });
}

/**
 * Obtener historial de turnos
 */
function obtenerHistorialTurnos(req, res) {
  const { limit = 10, offset = 0 } = req.query;

  const turnos = db.prepare(`
    SELECT 
      ct.*,
      u.nombre as usuario_nombre,
      u.usuario as usuario_username
    FROM caja_turnos ct
    JOIN usuarios u ON ct.usuario_id = u.id
    WHERE ct.estado = 'cerrado'
    ORDER BY ct.fecha_cierre DESC
    LIMIT ? OFFSET ?
  `).all(Number(limit), Number(offset));

  const turnosFormateados = turnos.map(t => ({
    turno_id: t.id,
    usuario_nombre: t.usuario_nombre,
    usuario_username: t.usuario_username,
    fecha_apertura: t.fecha_apertura,
    fecha_cierre: t.fecha_cierre,
    monto_apertura: fromCents(t.monto_apertura),
    monto_cierre: fromCents(t.monto_cierre),
    total_ventas: fromCents(t.total_ventas),
    total_efectivo: fromCents(t.total_efectivo),
    total_tarjeta: fromCents(t.total_tarjeta),
    total_transferencia: fromCents(t.total_transferencia),
    cuadre_diferencia: fromCents(t.cuadre_diferencia),
    cuadre_estado: t.cuadre_diferencia === 0 ? 'CUADRADO' : 
                   t.cuadre_diferencia > 0 ? 'SOBRANTE' : 'FALTANTE'
  }));

  res.json({
    success: true,
    data: turnosFormateados
  });
}

/**
 * Asignar turno a un pedido
 */
function asignarTurnoAPedido(pedidoId, turnoId) {
  db.prepare(`
    UPDATE pedidos 
    SET turno_id = ?, fecha_actualizacion = datetime('now')
    WHERE id = ?
  `).run(turnoId, pedidoId);
}

module.exports = {
  abrirCaja,
  cerrarCaja,
  obtenerTurnoActivo,
  obtenerHistorialTurnos,
  asignarTurnoAPedido
};
