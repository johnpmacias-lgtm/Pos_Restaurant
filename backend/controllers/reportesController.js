/**
 * reportesController.js - Controlador de Reportes
 * Sistema POS/KDS - Backend Local
 * 
 * FUNCIONALIDADES:
 * - Reporte Diario (Reporte Z)
 * - Agregaciones SQL (SUM, COUNT)
 * - Cálculo de impuestos (IVA)
 * - Top productos vendidos
 * - Métricas operativas
 */

const db = require('../database');
const { fromCents } = require('./cobroController');

/**
 * Generar Reporte Diario (Reporte Z)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
function reporteDiario(req, res) {
  const { fecha } = req.query;

  // Validar fecha
  if (!fecha) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro "fecha" es requerido (formato: YYYY-MM-DD)'
    });
  }

  // Validar formato de fecha
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return res.status(400).json({
      success: false,
      error: 'Formato de fecha inválido. Use YYYY-MM-DD'
    });
  }

  try {
    // ============================================
    // 1. OBTENER CONFIGURACIÓN (para calcular IVA)
    // ============================================
    
    const config = db.prepare(`
      SELECT iva_porcentaje FROM configuracion_global WHERE id = 1
    `).get();

    const ivaPorcentaje = config?.iva_porcentaje || 15.0;

    // ============================================
    // 2. VENTAS TOTALES DEL DÍA
    // ============================================
    
    const ventasTotales = db.prepare(`
      SELECT 
        COUNT(DISTINCT p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as total_ventas_centavos
      FROM pedidos p
      WHERE DATE(p.fecha_creacion) = ?
        AND p.estado_pago = 'pagado'
    `).get(fecha);

    // ============================================
    // 3. FONDO DE APERTURA
    // ============================================
    
    const fondoApertura = db.prepare(`
      SELECT 
        COALESCE(SUM(ct.monto_apertura), 0) as fondo_apertura_centavos
      FROM caja_turnos ct
      WHERE DATE(ct.fecha_apertura) = ?
        AND ct.estado = 'abierto' OR ct.estado = 'cerrado'
    `).get(fecha);

    // ============================================
    // 4. DESGLOSE POR MÉTODO DE PAGO
    // ============================================
    
    const desglosePagos = db.prepare(`
      SELECT 
        COALESCE(SUM(pg.monto_efectivo), 0) as total_efectivo_centavos,
        COALESCE(SUM(pg.monto_tarjeta), 0) as total_tarjeta_centavos,
        COALESCE(SUM(pg.monto_transferencia), 0) as total_transferencia_centavos,
        COALESCE(SUM(pg.total_pagado), 0) as total_pagado_centavos
      FROM pagos pg
      JOIN pedidos p ON pg.pedido_id = p.id
      WHERE DATE(pg.fecha_pago) = ?
        AND p.estado_pago = 'pagado'
    `).get(fecha);

    // ============================================
    // 5. CÁLCULO DE IMPUESTOS (IVA)
    // ============================================
    
    // El IVA se calcula sobre el total de ventas
    // Fórmula: IVA = Total Ventas * (IVA% / 100)
    const totalVentasCentavos = ventasTotales.total_ventas_centavos;
    const ivaCentavos = Math.round(totalVentasCentavos * (ivaPorcentaje / 100));
    const subtotalCentavos = totalVentasCentavos - ivaCentavos;

    // ============================================
    // 6. MÉTRICAS OPERATIVAS
    // ============================================
    
    // Número de mesas atendidas
    const mesasAtendidas = db.prepare(`
      SELECT COUNT(DISTINCT mesa_id) as mesas_atendidas
      FROM pedidos
      WHERE DATE(fecha_creacion) = ?
        AND tipo = 'mesa'
        AND estado_pago = 'pagado'
        AND mesa_id IS NOT NULL
    `).get(fecha);

    // Pedidos para llevar
    const pedidosLlevar = db.prepare(`
      SELECT COUNT(*) as pedidos_llevar
      FROM pedidos
      WHERE DATE(fecha_creacion) = ?
        AND tipo = 'llevar'
        AND estado_pago = 'pagado'
    `).get(fecha);

    // Ticket promedio
    const ticketPromedioCentavos = ventasTotales.total_pedidos > 0
      ? Math.round(totalVentasCentavos / ventasTotales.total_pedidos)
      : 0;

    // ============================================
    // 7. TOP 5 PRODUCTOS MÁS VENDIDOS
    // ============================================
    
    const topProductos = db.prepare(`
      SELECT 
        p.nombre,
        SUM(dp.cantidad) as cantidad_vendida,
        SUM(dp.subtotal) as total_vendido_centavos,
        COUNT(DISTINCT dp.pedido_id) as numero_pedidos
      FROM detalles_pedido dp
      JOIN productos p ON dp.producto_id = p.id
      JOIN pedidos ped ON dp.pedido_id = ped.id
      WHERE DATE(ped.fecha_creacion) = ?
        AND ped.estado_pago = 'pagado'
      GROUP BY p.id, p.nombre
      ORDER BY cantidad_vendida DESC
      LIMIT 5
    `).all(fecha);

    // ============================================
    // 8. ANULACIONES Y DESCUENTOS
    // ============================================
    
    // Nota: En este sistema no hay tabla de anulaciones/descuentos
    // Pero se puede agregar en el futuro
    const anulaciones = {
      cantidad: 0,
      total_centavos: 0
    };

    const descuentos = {
      cantidad: 0,
      total_centavos: 0
    };

    // ============================================
    // 9. RESUMEN DE TURNO
    // ============================================
    
    const turnosDelDia = db.prepare(`
      SELECT 
        COUNT(*) as total_turnos,
        COALESCE(SUM(total_ventas), 0) as total_ventas_turnos_centavos,
        COALESCE(AVG(cuadre_diferencia), 0) as promedio_cuadre_centavos
      FROM caja_turnos
      WHERE DATE(fecha_apertura) = ?
    `).get(fecha);

    // ============================================
    // 10. CONSTRUIR RESPUESTA
    // ============================================
    
    const reporte = {
      fecha: fecha,
      resumen_financiero: {
        total_ventas: fromCents(totalVentasCentavos),
        subtotal: fromCents(subtotalCentavos),
        iva: fromCents(ivaCentavos),
        iva_porcentaje: ivaPorcentaje,
        fondo_apertura: fromCents(fondoApertura.fondo_apertura_centavos),
        total_pedidos: ventasTotales.total_pedidos,
        ticket_promedio: fromCents(ticketPromedioCentavos)
      },
      desglose_pagos: {
        efectivo: fromCents(desglosePagos.total_efectivo_centavos),
        tarjeta: fromCents(desglosePagos.total_tarjeta_centavos),
        transferencia: fromCents(desglosePagos.total_transferencia_centavos),
        total: fromCents(desglosePagos.total_pagado_centavos)
      },
      metricas_operativas: {
        mesas_atendidas: mesasAtendidas.mesas_atendidas || 0,
        pedidos_para_llevar: pedidosLlevar.pedidos_llevar,
        anulaciones: anulaciones,
        descuentos: descuentos
      },
      top_productos: topProductos.map(p => ({
        nombre: p.nombre,
        cantidad_vendida: p.cantidad_vendida,
        total_vendido: fromCents(p.total_vendido_centavos),
        numero_pedidos: p.numero_pedidos
      })),
      resumen_turno: {
        total_turnos: turnosDelDia.total_turnos,
        total_ventas_turnos: fromCents(turnosDelDia.total_ventas_turnos_centavos),
        promedio_cuadre: fromCents(turnosDelDia.promedio_cuadre_centavos)
      },
      mesas_ocupadas_actuales: db.prepare(`
        SELECT COUNT(*) as count FROM mesas WHERE estado = 'ocupada'
      `).get().count
    };

    res.json({
      success: true,
      data: reporte
    });

  } catch (error) {
    console.error('❌ Error al generar reporte diario:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte diario',
      message: error.message
    });
  }
}

/**
 * Obtener reporte de un rango de fechas
 */
function reporteRango(req, res) {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({
      success: false,
      error: 'Los parámetros "fecha_inicio" y "fecha_fin" son requeridos'
    });
  }

  try {
    const ventasTotales = db.prepare(`
      SELECT 
        COUNT(DISTINCT p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as total_ventas_centavos
      FROM pedidos p
      WHERE DATE(p.fecha_creacion) BETWEEN ? AND ?
        AND p.estado_pago = 'pagado'
    `).get(fecha_inicio, fecha_fin);

    const desglosePagos = db.prepare(`
      SELECT 
        COALESCE(SUM(pg.monto_efectivo), 0) as total_efectivo_centavos,
        COALESCE(SUM(pg.monto_tarjeta), 0) as total_tarjeta_centavos,
        COALESCE(SUM(pg.monto_transferencia), 0) as total_transferencia_centavos
      FROM pagos pg
      JOIN pedidos p ON pg.pedido_id = p.id
      WHERE DATE(pg.fecha_pago) BETWEEN ? AND ?
        AND p.estado_pago = 'pagado'
    `).get(fecha_inicio, fecha_fin);

    res.json({
      success: true,
      data: {
        fecha_inicio,
        fecha_fin,
        total_ventas: fromCents(ventasTotales.total_ventas_centavos),
        total_pedidos: ventasTotales.total_pedidos,
        desglose_pagos: {
          efectivo: fromCents(desglosePagos.total_efectivo_centavos),
          tarjeta: fromCents(desglosePagos.total_tarjeta_centavos),
          transferencia: fromCents(desglosePagos.total_transferencia_centavos)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al generar reporte de rango:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte',
      message: error.message
    });
  }
}

module.exports = {
  reporteDiario,
  reporteRango
};
