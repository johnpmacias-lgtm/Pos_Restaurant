import React from 'react';
import { Pedido } from '../types';
import * as db from '../db/database';
import { X, Clock, User, ChefHat, CheckCircle } from 'lucide-react';

interface KitchenHistoryModalProps {
  onClose: () => void;
}

export default function KitchenHistoryModal({ onClose }: KitchenHistoryModalProps) {
  const pedidos = db.getPedidos();
  const usuarios = db.getUsuarios();
  const mesas = db.getMesas();
  
  // Filtrar solo pedidos entregados de mesa, ordenados por fecha descendente
  const historial = pedidos
    .filter(p => p.tipo === 'mesa' && p.estado_cocina === 'entregado')
    .sort((a, b) => new Date(b.fecha_actualizacion).getTime() - new Date(a.fecha_actualizacion).getTime());

  const getMeseroNombre = (meseroId: string) => {
    const mesero = usuarios.find(u => u.id === meseroId);
    return mesero?.nombre || 'Desconocido';
  };

  const getMesaNumero = (mesaId: string | null) => {
    if (!mesaId) return '?';
    const mesa = mesas.find(m => m.id === mesaId);
    return mesa?.numero_mesa?.toString() || '?';
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl border border-slate-700 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Historial de Cocina</h2>
              <p className="text-slate-400 text-sm">{historial.length} pedidos entregados</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {historial.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No hay pedidos en el historial</p>
              <p className="text-slate-500 text-sm mt-2">Los pedidos entregados aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map(pedido => (
                <div key={pedido.id} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-lg">Mesa {getMesaNumero(pedido.mesa_id)}</span>
                          <span className="text-slate-400 text-sm">#{pedido.id.slice(-6)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="flex items-center gap-1 text-blue-400">
                            <Clock className="w-4 h-4" />
                            {formatFecha(pedido.fecha_actualizacion)}
                          </span>
                          <span className="flex items-center gap-1 text-orange-400">
                            <User className="w-4 h-4" />
                            {getMeseroNombre(pedido.mesero_id)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-xl">${pedido.total.toFixed(2)}</p>
                      <p className="text-slate-400 text-xs">{pedido.detalles.length} productos</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-600 pt-3 mt-3">
                    <p className="text-slate-400 text-xs mb-2">Productos:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {pedido.detalles.slice(0, 6).map((detalle, idx) => {
                        const producto = db.getProductos().find(p => p.id === detalle.producto_id);
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-slate-300">{detalle.cantidad}x</span>
                            <span className="text-slate-200 truncate">{producto?.nombre || 'Producto'}</span>
                          </div>
                        );
                      })}
                      {pedido.detalles.length > 6 && (
                        <div className="text-slate-400 text-sm col-span-2">
                          +{pedido.detalles.length - 6} productos más
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
