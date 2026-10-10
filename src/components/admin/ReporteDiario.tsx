import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, Printer, AlertTriangle, TrendingUp, DollarSign, CreditCard, ShoppingBag } from 'lucide-react';
import jsPDF from 'jspdf';

interface ReporteDiario {
  fecha: string;
  resumen_financiero: {
    total_ventas: number;
    subtotal: number;
    iva: number;
    iva_porcentaje: number;
    fondo_apertura: number;
    total_pedidos: number;
    ticket_promedio: number;
  };
  desglose_pagos: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    total: number;
  };
  metricas_operativas: {
    mesas_atendidas: number;
    pedidos_para_llevar: number;
    anulaciones: { cantidad: number; total_centavos: number };
    descuentos: { cantidad: number; total_centavos: number };
  };
  top_productos: Array<{
    nombre: string;
    cantidad_vendida: number;
    total_vendido: number;
    numero_pedidos: number;
  }>;
  resumen_turno: {
    total_turnos: number;
    total_ventas_turnos: number;
    promedio_cuadre: number;
  };
  mesas_ocupadas_actuales: number;
}

export default function ReporteDiario() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [reporte, setReporte] = useState<ReporteDiario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reporteRef = useRef<HTMLDivElement>(null);

  const cargarReporte = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:3001/api/reportes/diario?fecha=${fecha}`);
      const data = await response.json();

      if (data.success) {
        setReporte(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al cargar el reporte. Verifique que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [fecha]);

  const exportarAPDF = () => {
    if (!reporte) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DIARIO (Reporte Z)', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Fecha
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date(reporte.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Resumen Financiero
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN FINANCIERO', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Ventas: $${reporte.resumen_financiero.total_ventas.toFixed(2)}`, 25, y); y += 6;
    doc.text(`Subtotal: $${reporte.resumen_financiero.subtotal.toFixed(2)}`, 25, y); y += 6;
    doc.text(`IVA (${reporte.resumen_financiero.iva_porcentaje}%): $${reporte.resumen_financiero.iva.toFixed(2)}`, 25, y); y += 6;
    doc.text(`Fondo de Apertura: $${reporte.resumen_financiero.fondo_apertura.toFixed(2)}`, 25, y); y += 6;
    doc.text(`Total Pedidos: ${reporte.resumen_financiero.total_pedidos}`, 25, y); y += 6;
    doc.text(`Ticket Promedio: $${reporte.resumen_financiero.ticket_promedio.toFixed(2)}`, 25, y); y += 12;

    // Desglose de Pagos
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DESGLOSE DE PAGOS', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Efectivo: $${reporte.desglose_pagos.efectivo.toFixed(2)}`, 25, y); y += 6;
    doc.text(`Tarjeta: $${reporte.desglose_pagos.tarjeta.toFixed(2)}`, 25, y); y += 6;
    doc.text(`Transferencia: $${reporte.desglose_pagos.transferencia.toFixed(2)}`, 25, y); y += 6;
    doc.text(`Total: $${reporte.desglose_pagos.total.toFixed(2)}`, 25, y); y += 12;

    // Métricas Operativas
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTRICAS OPERATIVAS', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mesas Atendidas: ${reporte.metricas_operativas.mesas_atendidas}`, 25, y); y += 6;
    doc.text(`Pedidos para Llevar: ${reporte.metricas_operativas.pedidos_para_llevar}`, 25, y); y += 12;

    // Top Productos
    if (reporte.top_productos.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TOP 5 PRODUCTOS MÁS VENDIDOS', 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Producto', 25, y);
      doc.text('Cantidad', 120, y);
      doc.text('Total', 160, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      reporte.top_productos.forEach((producto) => {
        doc.text(producto.nombre.substring(0, 40), 25, y);
        doc.text(producto.cantidad_vendida.toString(), 120, y);
        doc.text(`$${producto.total_vendido.toFixed(2)}`, 160, y);
        y += 5;
      });
    }

    // Alerta de mesas ocupadas
    if (reporte.mesas_ocupadas_actuales > 0) {
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text(`⚠ ATENCIÓN: ${reporte.mesas_ocupadas_actuales} mesa(s) aún ocupada(s)`, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    // Guardar PDF
    doc.save(`Reporte_Diario_${reporte.fecha}.pdf`);
  };

  const imprimirTicket = () => {
    if (!reporte) return;

    // Crear contenido del ticket
    const ticketContent = `
========================================
        REPORTE DIARIO (Z)
========================================
Fecha: ${new Date(reporte.fecha).toLocaleDateString('es-ES')}

----------------------------------------
RESUMEN FINANCIERO
----------------------------------------
Total Ventas:     $${reporte.resumen_financiero.total_ventas.toFixed(2)}
Subtotal:         $${reporte.resumen_financiero.subtotal.toFixed(2)}
IVA (${reporte.resumen_financiero.iva_porcentaje}%):        $${reporte.resumen_financiero.iva.toFixed(2)}
Fondo Apertura:   $${reporte.resumen_financiero.fondo_apertura.toFixed(2)}
Total Pedidos:    ${reporte.resumen_financiero.total_pedidos}
Ticket Promedio:  $${reporte.resumen_financiero.ticket_promedio.toFixed(2)}

----------------------------------------
DESGLOSE DE PAGOS
----------------------------------------
Efectivo:         $${reporte.desglose_pagos.efectivo.toFixed(2)}
Tarjeta:          $${reporte.desglose_pagos.tarjeta.toFixed(2)}
Transferencia:    $${reporte.desglose_pagos.transferencia.toFixed(2)}
----------------------------------------
TOTAL:            $${reporte.desglose_pagos.total.toFixed(2)}

----------------------------------------
MÉTRICAS OPERATIVAS
----------------------------------------
Mesas Atendidas:  ${reporte.metricas_operativas.mesas_atendidas}
Para Llevar:      ${reporte.metricas_operativas.pedidos_para_llevar}

----------------------------------------
TOP 5 PRODUCTOS
----------------------------------------
${reporte.top_productos.map((p, i) => 
  `${i + 1}. ${p.nombre.substring(0, 25).padEnd(25)} ${p.cantidad_vendida.toString().padStart(3)}x  $${p.total_vendido.toFixed(2)}`
).join('\n')}

========================================
${reporte.mesas_ocupadas_actuales > 0 ? `
⚠ ATENCIÓN: ${reporte.mesas_ocupadas_actuales} mesa(s) ocupada(s)
NO CERRAR CAJA TODAVÍA
` : ''}
========================================
    `.trim();

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte Diario - ${reporte.fecha}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 10px;
                max-width: 80mm;
                margin: 0 auto;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${ticketContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      // Imprimir automáticamente
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Reporte Diario (Reporte Z)</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={exportarAPDF}
            disabled={!reporte}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exportar PDF
          </button>
          <button
            onClick={imprimirTicket}
            disabled={!reporte}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <Printer className="w-5 h-5" />
            Imprimir Ticket
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Cargando reporte...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {reporte && !loading && (
        <div ref={reporteRef} className="space-y-6">
          {/* Alerta de Mesas Ocupadas */}
          {reporte.mesas_ocupadas_actuales > 0 && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <p className="text-red-200 font-bold">
                  ⚠ ATENCIÓN: {reporte.mesas_ocupadas_actuales} mesa(s) aún ocupada(s)
                </p>
                <p className="text-red-300 text-sm">
                  No se debe cerrar la caja hasta que todas las mesas estén liberadas.
                </p>
              </div>
            </div>
          )}

          {/* Resumen Financiero */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-bold text-white">Resumen Financiero</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Total Ventas</p>
                <p className="text-3xl font-bold text-green-400">${reporte.resumen_financiero.total_ventas.toFixed(2)}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Subtotal</p>
                <p className="text-2xl font-bold text-white">${reporte.resumen_financiero.subtotal.toFixed(2)}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">IVA ({reporte.resumen_financiero.iva_porcentaje}%)</p>
                <p className="text-2xl font-bold text-white">${reporte.resumen_financiero.iva.toFixed(2)}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Fondo de Apertura</p>
                <p className="text-2xl font-bold text-white">${reporte.resumen_financiero.fondo_apertura.toFixed(2)}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Total Pedidos</p>
                <p className="text-2xl font-bold text-white">{reporte.resumen_financiero.total_pedidos}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Ticket Promedio</p>
                <p className="text-2xl font-bold text-white">${reporte.resumen_financiero.ticket_promedio.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Desglose de Pagos */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Desglose de Pagos</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <p className="text-green-300 text-sm">Efectivo</p>
                <p className="text-2xl font-bold text-green-400">${reporte.desglose_pagos.efectivo.toFixed(2)}</p>
              </div>
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">Tarjeta</p>
                <p className="text-2xl font-bold text-blue-400">${reporte.desglose_pagos.tarjeta.toFixed(2)}</p>
              </div>
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm">Transferencia</p>
                <p className="text-2xl font-bold text-purple-400">${reporte.desglose_pagos.transferencia.toFixed(2)}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-300 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">${reporte.desglose_pagos.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Métricas Operativas */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-bold text-white">Métricas Operativas</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Mesas Atendidas</p>
                <p className="text-2xl font-bold text-white">{reporte.metricas_operativas.mesas_atendidas}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Pedidos para Llevar</p>
                <p className="text-2xl font-bold text-white">{reporte.metricas_operativas.pedidos_para_llevar}</p>
              </div>
            </div>
          </div>

          {/* Top Productos */}
          {reporte.top_productos.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Top 5 Productos Más Vendidos</h3>
              </div>
              
              <div className="space-y-3">
                {reporte.top_productos.map((producto, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-500/20 text-yellow-400 font-bold w-10 h-10 rounded-full flex items-center justify-center">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{producto.nombre}</p>
                        <p className="text-slate-400 text-sm">{producto.numero_pedidos} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{producto.cantidad_vendida} vendidos</p>
                      <p className="text-green-400">${producto.total_vendido.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
