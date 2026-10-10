import React from 'react';
import { Pedido, Producto } from '../types';
import * as db from '../db/database';
import { X, CreditCard, Clock, ChefHat, CheckCircle, AlertTriangle } from 'lucide-react';

interface OrderSummaryModalProps {
  pedido: Pedido;
  onClose: () => void;
  onPay: () => void;
}

export default function OrderSummaryModal({ pedido, onClose, onPay }: OrderSummaryModalProps) {
  const productos = db.getProductos();
  const mesas = db.getMesas();
  const mesa = mesas.find(m => m.id === pedido.mesa_id);

  const getProductoNombre = (productoId: string) => {
    return productos.find(p => p.id === productoId)?.nombre || 'Desconocido';
  };

  const getEstadoCocinaInfo = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pendiente' };
      case 'preparando': return { icon: ChefHat, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Preparando' };
      case 'listo': return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Listo' };
      case 'entregado': return { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Entregado' };
      default: return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20', label: estado };
    }
  };

  const estadoCocina = getEstadoCocinaInfo(pedido.estado_cocina);
  const EstadoIcon = estadoCocina.icon;

  const getTiempoTranscurrido = () => {
    const diff = Date.now() - new Date(pedido.fecha_creacion).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins} min`;
    return `Hace ${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white text-lg font-bold w-12 h-12 flex items-center justify-center rounded-xl">
              {mesa?.numero_mesa || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Mesa {mesa?.numero_mesa}</h2>
              <p className="text-slate-400 text-sm">{mesa?.puestos} pax • {mesa?.zona}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${estadoCocina.bg}`}>
              <EstadoIcon className={`w-4 h-4 ${estadoCocina.color}`} />
              <span className={`text-sm font-medium ${estadoCocina.color}`}>{estadoCocina.label}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              pedido.estado_pago === 'pagado' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <span className={`text-sm font-medium ${
                pedido.estado_pago === 'pagado' ? 'text-green-400' : 'text-red-400'
              }`}>
                {pedido.estado_pago === 'pagado' ? '✓ Pagado' : '⏳ Pendiente de pago'}
              </span>
            </div>
            <span className="text-slate-500 text-xs ml-auto">{getTiempoTranscurrido()}</span>
          </div>

          {/* Order details */}
          <div className="bg-slate-900/50 rounded-xl p-4">
            <h3 className="text-slate-400 text-sm font-medium mb-3">Detalle del Pedido</h3>
            <div className="space-y-2">
              {pedido.detalles.map((detalle, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="bg-slate-700 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded">
                      {detalle.cantidad}x
                    </span>
                    <div className="flex-1">
                      <p className="text-white text-sm">{getProductoNombre(detalle.producto_id)}</p>
                      {detalle.notas && (
                        <p className="text-yellow-300 text-xs italic">📝 {detalle.notas}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-white text-sm font-medium">${detalle.subtotal.toFixed(2)}</span>
                </div>
              ))}

              {/* Desechables */}
              {pedido.desechables.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-2 pt-2">
                    <p className="text-purple-300 text-xs font-medium">📦 Desechables</p>
                  </div>
                  {pedido.desechables.map((des, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="bg-purple-900/50 text-purple-200 text-xs font-bold w-7 h-7 flex items-center justify-center rounded">
                          {des.cantidad}x
                        </span>
                        <span className="text-purple-200 text-sm">{getProductoNombre(des.producto_id)}</span>
                      </div>
                      <span className="text-white text-sm font-medium">${des.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl p-4 border border-orange-600/30">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Total</span>
              <span className="text-3xl font-bold text-white">${pedido.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          {pedido.estado_pago !== 'pagado' && (
            <button
              onClick={onPay}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-green-600/20"
            >
              <CreditCard className="w-6 h-6" />
              Cobrar ${pedido.total.toFixed(2)}
            </button>
          )}

          {pedido.estado_pago === 'pagado' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-medium">Este pedido ya fue cobrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
