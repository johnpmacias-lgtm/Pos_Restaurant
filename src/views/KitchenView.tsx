import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Pedido, EstadoCocina } from '../types';
import * as db from '../db/database';
import KitchenHistoryModal from '../components/KitchenHistoryModal';
import { ChefHat, Clock, Flame, CheckCircle, LogOut, AlertTriangle, History } from 'lucide-react';

export default function KitchenView() {
  const { user, pedidos, refreshPedidos, logout } = useApp();
  const [selectedPedido, setSelectedPedido] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const interval = setInterval(refreshPedidos, 2000);
    const unsub = db.onEvent(() => refreshPedidos());
    return () => { clearInterval(interval); unsub(); };
  }, [refreshPedidos]);

  // Todos los pedidos (mesa y para llevar) entran a las columnas del kanban
  const pedidosActivos = pedidos.filter(p => p.estado_cocina !== 'entregado');
  const pendientes = pedidosActivos.filter(p => p.estado_cocina === 'pendiente');
  const preparando = pedidosActivos.filter(p => p.estado_cocina === 'preparando');
  const listos = pedidosActivos.filter(p => p.estado_cocina === 'listo');

  const cambiarEstado = (pedidoId: string, nuevoEstado: EstadoCocina) => {
    db.updateEstadoCocina(pedidoId, nuevoEstado);
    db.emitEvent('estado_cocina_actualizado', { pedidoId, estado: nuevoEstado });
    refreshPedidos();
  };

  const getTiempo = (fecha: string) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getUrgencia = (fecha: string) => {
    const mins = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (mins >= 20) return 'border-red-500 bg-red-500/10';
    if (mins >= 10) return 'border-yellow-500 bg-yellow-500/10';
    return 'border-slate-600';
  };

  const getProductos = (pedido: Pedido) => {
    const allProducts = db.getProductos();
    return pedido.detalles.map(d => {
      const prod = allProducts.find(p => p.id === d.producto_id);
      return { ...d, nombre: prod?.nombre || 'Desconocido' };
    });
  };

  const renderCard = (pedido: Pedido) => {
    const detalles = getProductos(pedido);
    const urgencia = getUrgencia(pedido.fecha_creacion);

    return (
      <div
        key={pedido.id}
        className={`border-2 rounded-xl p-4 mb-3 transition-all ${urgencia} ${
          selectedPedido === pedido.id ? 'ring-2 ring-blue-400 scale-[1.02]' : ''
        }`}
        onClick={() => setSelectedPedido(selectedPedido === pedido.id ? null : pedido.id)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`${pedido.tipo === 'llevar' ? 'bg-purple-500' : 'bg-orange-500'} text-white text-sm font-bold px-3 py-1 rounded-full`}>
              {pedido.tipo === 'llevar' 
                ? `📦 Llevar: ${pedido.cliente_nombre || 'Cliente'}`
                : `Mesa ${pedido.mesa_id ? (db.getMesas().find(m => m.id === pedido.mesa_id)?.numero_mesa || '?') : '?'}`
              }
            </span>
            <span className="text-slate-400 text-xs">#{pedido.id.slice(-4)}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3.5 h-3.5" />
            <span className={`text-sm font-mono font-bold ${
              Math.floor((Date.now() - new Date(pedido.fecha_creacion).getTime()) / 60000) >= 15 ? 'text-red-400' : 'text-slate-300'
            }`}>
              {getTiempo(pedido.fecha_creacion)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          {detalles.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded">
                {d.cantidad}x
              </span>
              <span className="text-white text-sm font-medium flex-1">{d.nombre}</span>
              {d.notas && (
                <span className="text-yellow-300 text-xs italic">⚠ {d.notas}</span>
              )}
            </div>
          ))}
        </div>

        {pedido.estado_cocina === 'pendiente' && (
          <button
            onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'preparando'); }}
            className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4" /> Preparar
          </button>
        )}

        {pedido.estado_cocina === 'preparando' && (
          <button
            onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'listo'); }}
            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Listo
          </button>
        )}

        {pedido.estado_cocina === 'listo' && (
          <button
            onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'entregado'); }}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Entregado
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">KDS - Cocina</h1>
            <p className="text-slate-400 text-xs">
              {pendientes.length + preparando.length + listos.length} comandas activas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-green-400 text-sm">En línea</span>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <History className="w-4 h-4" />
            Ver Historial
          </button>
          <span className="text-slate-400 text-sm">{user?.nombre}</span>
          <button onClick={logout} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Pendientes */}
        <div className="flex-1 flex flex-col bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="bg-slate-700/50 px-4 py-3 flex items-center gap-2 border-b border-slate-600">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-bold">Pendientes</h2>
            <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {pendientes.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0">
            {pendientes.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>Sin pedidos pendientes</p>
              </div>
            ) : (
              pendientes.map(renderCard)
            )}
          </div>
        </div>

        {/* Preparando */}
        <div className="flex-1 flex flex-col bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="bg-slate-700/50 px-4 py-3 flex items-center gap-2 border-b border-slate-600">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-white font-bold">Preparando</h2>
            <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {preparando.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0">
            {preparando.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>Sin pedidos en preparación</p>
              </div>
            ) : (
              preparando.map(renderCard)
            )}
          </div>
        </div>

        {/* Listos */}
        <div className="flex-1 flex flex-col bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="bg-slate-700/50 px-4 py-3 flex items-center gap-2 border-b border-slate-600">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-bold">Listos</h2>
            <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {listos.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0">
            {listos.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>Sin pedidos listos</p>
              </div>
            ) : (
              listos.map(renderCard)
            )}
          </div>
        </div>
      </div>

      {/* Modal de Historial */}
      {showHistory && (
        <KitchenHistoryModal onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
