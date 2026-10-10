import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Producto, Inventario, Mesa, Reserva, Pedido } from '../types';
import * as db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import PaymentModal from '../components/PaymentModal';
import OrderSummaryModal from '../components/OrderSummaryModal';
import CashRegisterOpenModal from '../components/CashRegisterOpenModal';
import {
  LogOut, LayoutDashboard, Grid3X3, UtensilsCrossed, Package,
  CalendarDays, Wallet, Users, Plus, Edit2, Trash2, Unlock,
  TrendingUp, AlertTriangle, DollarSign, ShoppingBag,
  ClipboardList, CreditCard, Eye, Filter, X, Search, ChefHat
} from 'lucide-react';

type AdminTab = 'dashboard' | 'mesas' | 'ordenes' | 'menu' | 'inventario' | 'reservas' | 'caja' | 'usuarios' | 'cocina';

export default function AdminView() {
  const { user, pedidos, mesas, productos, inventario, reservas, cajaTurnoActivo, logout, refreshData } = useApp();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [showNewProducto, setShowNewProducto] = useState(false);
  const [showNewReserva, setShowNewReserva] = useState(false);
  const [showNewUsuario, setShowNewUsuario] = useState(false);
  const [showNewInsumo, setShowNewInsumo] = useState(false);
  const [menuFilter, setMenuFilter] = useState<string>('Todos');
  const [inventarioFilter, setInventarioFilter] = useState<string>('Todos');
  const [inventarioSearch, setInventarioSearch] = useState('');
  const [cajaRequiereApertura, setCajaRequiereApertura] = useState(false);

  // Modals
  const [paymentPedido, setPaymentPedido] = useState<Pedido | null>(null);
  const [summaryPedido, setSummaryPedido] = useState<Pedido | null>(null);

  // Form states
  const [newProd, setNewProd] = useState({ nombre: '', precio_base: 0, categoria: 'Platos', es_desechable: false });
  const [newReserva, setNewReserva] = useState({ mesa_id: '', cliente_nombre: '', fecha_hora: '', nota: '' });
  const [newUsuario, setNewUsuario] = useState({ nombre: '', usuario: '', password: '', rol: 'mesero' as const });
  const [newInsumo, setNewInsumo] = useState({ nombre: '', descripcion: '', categoria: 'Platos', unidad_medida: 'Unidades', stock_actual: 0, stock_minimo: 0, precio_costo: 0, precio_venta: 0 });
  const [cajaMontoInicial, setCajaMontoInicial] = useState(0);
  const [cajaMontoFinal, setCajaMontoFinal] = useState(0);

  // Computed
  const ventasHoy = pedidos.filter(p => {
    const today = new Date().toDateString();
    return new Date(p.fecha_creacion).toDateString() === today && p.estado_pago === 'pagado';
  });
  const totalVentasHoy = ventasHoy.reduce((sum, p) => sum + p.total, 0);
  const stockBajo = inventario.filter(i => i.stock_actual <= i.stock_minimo);

  // Categorías dinámicas para filtro
  const categorias = ['Todos', ...Array.from(new Set(productos.map(p => p.categoria)))];
  const productosFiltrados = menuFilter === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === menuFilter);

  // Inventario filtrado
  const categoriasInventario = ['Todos', ...Array.from(new Set(inventario.map(i => i.categoria)))];
  const inventarioFiltrado = inventario.filter(i => {
    const matchCategoria = inventarioFilter === 'Todos' || i.categoria === inventarioFilter;
    const matchSearch = inventarioSearch === '' || 
      i.nombre.toLowerCase().includes(inventarioSearch.toLowerCase()) ||
      i.descripcion.toLowerCase().includes(inventarioSearch.toLowerCase());
    return matchCategoria && matchSearch;
  });

  // Pedidos del día (orden descendente)
  const pedidosDelDia = db.getPedidosDelDia().sort((a, b) => 
    new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
  );

  // Control de caja
  useEffect(() => {
    if (tab === 'caja' && !cajaTurnoActivo) {
      setCajaRequiereApertura(true);
    }
  }, [tab, cajaTurnoActivo]);

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mesas' as const, label: 'Mesas', icon: Grid3X3 },
    { id: 'ordenes' as const, label: 'Órdenes', icon: ClipboardList },
    { id: 'cocina' as const, label: 'Cocina', icon: ChefHat },
    { id: 'menu' as const, label: 'Menú', icon: UtensilsCrossed },
    { id: 'inventario' as const, label: 'Inventario', icon: Package },
    { id: 'reservas' as const, label: 'Reservas', icon: CalendarDays },
    { id: 'caja' as const, label: 'Caja', icon: Wallet },
    { id: 'usuarios' as const, label: 'Usuarios', icon: Users },
  ];

  // MEJORA A: Interactividad en mesas
  const handleMesaClick = (mesa: Mesa) => {
    const pedidoMesa = pedidos.find(p =>
      p.mesa_id === mesa.id &&
      p.estado_pago !== 'pagado' &&
      p.tipo === 'mesa'
    );

    if (mesa.estado === 'libre') {
      alert(`Mesa ${mesa.numero_mesa} está libre. Cambie a la vista de Mesero para tomar el pedido.`);
    } else if (mesa.estado === 'ocupada' && pedidoMesa) {
      setSummaryPedido(pedidoMesa);
    } else if (mesa.estado === 'reservada') {
      const reserva = reservas.find(r => r.mesa_id === mesa.id && r.estado === 'activa');
      if (reserva && confirm(`Mesa reservada para "${reserva.cliente_nombre}".\n¿Desea liberar la mesa?`)) {
        db.liberarReserva(reserva.id);
        db.emitEvent('mesa_liberada', { mesa_id: mesa.id });
        refreshData();
      }
    }
  };

  // MEJORA A: Marcar como entregado
  const marcarComoEntregado = (pedidoId: string) => {
    db.updateEstadoCocina(pedidoId, 'entregado');
    db.emitEvent('estado_cocina_actualizado', { pedidoId, estado: 'entregado' });
    refreshData();
    setSummaryPedido(null);
  };

  // ============ DASHBOARD ============
  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Panel de Control</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">Ventas Hoy</p>
              <p className="text-3xl font-bold text-white">${totalVentasHoy.toFixed(2)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-300 opacity-50" />
          </div>
          <p className="text-green-200 text-xs mt-2">{ventasHoy.length} transacciones</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Mesas Ocupadas</p>
              <p className="text-3xl font-bold text-white">{mesas.filter(m => m.estado === 'ocupada').length}/{mesas.length}</p>
            </div>
            <Grid3X3 className="w-10 h-10 text-blue-300 opacity-50" />
          </div>
          <p className="text-blue-200 text-xs mt-2">{mesas.filter(m => m.estado === 'reservada').length} reservadas</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">Pedidos Activos</p>
              <p className="text-3xl font-bold text-white">{pedidos.filter(p => p.estado_pago !== 'pagado').length}</p>
            </div>
            <ShoppingBag className="w-10 h-10 text-orange-300 opacity-50" />
          </div>
          <p className="text-orange-200 text-xs mt-2">{pedidos.filter(p => p.estado_cocina === 'preparando').length} en cocina</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 text-sm">Stock Bajo</p>
              <p className="text-3xl font-bold text-white">{stockBajo.length}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-300 opacity-50" />
          </div>
          <p className="text-red-200 text-xs mt-2">productos por reabastecer</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" /> Últimos Pedidos
          </h3>
          <div className="space-y-2">
            {pedidos.slice(-5).reverse().map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-white text-sm font-medium">
                    {p.tipo === 'mesa' ? `Mesa ${mesas.find(m => m.id === p.mesa_id)?.numero_mesa}` : p.cliente_nombre}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">{p.estado_cocina} • {p.estado_pago}</span>
                </div>
                <span className="text-white font-bold">${p.total.toFixed(2)}</span>
              </div>
            ))}
            {pedidos.length === 0 && <p className="text-slate-500 text-center py-4">Sin pedidos aún</p>}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" /> Alertas de Inventario
          </h3>
          <div className="space-y-2">
            {stockBajo.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-white text-sm">{inv.nombre}</span>
                <span className="text-red-400 text-sm font-bold">{inv.stock_actual} / {inv.stock_minimo} min</span>
              </div>
            ))}
            {stockBajo.length === 0 && <p className="text-green-400 text-center py-4">✓ Todo el inventario OK</p>}
          </div>
        </div>
      </div>
    </div>
  );

  // ============ MESAS ============
  const renderMesas = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Gestión de Mesas</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-slate-300">Libre</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="text-slate-300">Ocupada</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500"></span><span className="text-slate-300">Reservada</span></span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mesas.map(mesa => {
          const pedidoMesa = pedidos.find(p => p.mesa_id === mesa.id && p.estado_pago !== 'pagado' && p.tipo === 'mesa');
          return (
            <button key={mesa.id} onClick={() => handleMesaClick(mesa)}
              className={`rounded-xl p-4 border-2 transition-all hover:scale-105 active:scale-95 text-left ${
                mesa.estado === 'libre' ? 'bg-green-900/20 border-green-700 hover:border-green-400' :
                mesa.estado === 'ocupada' ? 'bg-orange-900/20 border-orange-700 hover:border-orange-400' :
                'bg-purple-900/20 border-purple-700 hover:border-purple-400'
              }`}>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{mesa.numero_mesa}</p>
                <p className="text-slate-400 text-sm">{mesa.puestos} pax • {mesa.zona}</p>
                <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full inline-block ${
                  mesa.estado === 'libre' ? 'bg-green-500/20 text-green-300' :
                  mesa.estado === 'ocupada' ? 'bg-orange-500/20 text-orange-300' :
                  'bg-purple-500/20 text-purple-300'
                }`}>
                  {mesa.estado === 'libre' ? '🟢 LIBRE' : mesa.estado === 'ocupada' ? '🟠 OCUPADA' : '🟣 RESERVADA'}
                </div>
              </div>
              {pedidoMesa && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">${pedidoMesa.total.toFixed(0)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pedidoMesa.estado_pago === 'pagado' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {pedidoMesa.estado_pago === 'pagado' ? '✓ Pagado' : '⏳ Por cobrar'}
                    </span>
                  </div>
                  {mesa.estado === 'ocupada' && pedidoMesa.estado_pago !== 'pagado' && (
                    <p className="text-orange-300 text-xs mt-1 text-center">👆 Click para cobrar</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ============ MEJORA B: ÓRDENES DEL DÍA ============
  const renderOrdenes = () => {
    const getEstadoCocinaBadge = (estado: string) => {
      switch (estado) {
        case 'pendiente': return <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full font-medium">⏳ Pendiente</span>;
        case 'preparando': return <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full font-medium">🔥 Preparando</span>;
        case 'listo': return <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full font-medium">✅ Listo</span>;
        case 'entregado': return <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-medium">📦 Entregado</span>;
        default: return <span className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded-full">{estado}</span>;
      }
    };

    const getEstadoPagoBadge = (estado: string) => {
      switch (estado) {
        case 'pagado': return <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full font-medium">✓ Pagado</span>;
        case 'pendiente': return <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full font-medium">⏳ Pendiente</span>;
        case 'parcial': return <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full font-medium">◐ Parcial</span>;
        default: return <span className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded-full">{estado}</span>;
      }
    };

    const getClienteOMesa = (pedido: Pedido) => {
      if (pedido.tipo === 'mesa') {
        const mesa = mesas.find(m => m.id === pedido.mesa_id);
        return `Mesa ${mesa?.numero_mesa || '?'}`;
      }
      return pedido.cliente_nombre || 'Sin nombre';
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Órdenes del Día</h2>

        {/* MEJORA B: Tarjetas de resumen ARRIBA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Total Pedidos</p>
            <p className="text-2xl font-bold text-white">{pedidosDelDia.length}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Por Cobrar</p>
            <p className="text-2xl font-bold text-red-400">
              ${pedidosDelDia.filter(p => p.estado_pago === 'pendiente').reduce((s, p) => s + p.total, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Cobrado</p>
            <p className="text-2xl font-bold text-green-400">
              ${pedidosDelDia.filter(p => p.estado_pago === 'pagado').reduce((s, p) => s + p.total, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Para Llevar</p>
            <p className="text-2xl font-bold text-purple-400">
              {pedidosDelDia.filter(p => p.tipo === 'llevar').length}
            </p>
          </div>
        </div>

        {/* MEJORA B: Data Table debajo */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">ID</th>
                  <th className="text-left text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">Tipo</th>
                  <th className="text-left text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">Cliente / Mesa</th>
                  <th className="text-left text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">Estado Cocina</th>
                  <th className="text-left text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">Estado Pago</th>
                  <th className="text-right text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">Total</th>
                  <th className="text-center text-slate-300 text-xs font-medium px-4 py-3 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pedidosDelDia.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg">No hay pedidos registrados hoy</p>
                    </td>
                  </tr>
                ) : (
                  pedidosDelDia.map(pedido => (
                    <tr key={pedido.id} className={`hover:bg-slate-700/30 transition-colors ${
                      pedido.estado_pago === 'pendiente' ? 'bg-red-900/5' : ''
                    }`}>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs font-mono">#{pedido.id.slice(-6)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          pedido.tipo === 'mesa' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {pedido.tipo === 'mesa' ? '🍽️ Mesa' : '📦 Llevar'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm font-medium">{getClienteOMesa(pedido)}</span>
                      </td>
                      <td className="px-4 py-3">{getEstadoCocinaBadge(pedido.estado_cocina)}</td>
                      <td className="px-4 py-3">{getEstadoPagoBadge(pedido.estado_pago)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white font-bold">${pedido.total.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSummaryPedido(pedido)}
                            className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10" title="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </button>
                          {pedido.estado_pago === 'pendiente' && (
                            <button onClick={() => setPaymentPedido(pedido)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                              <CreditCard className="w-3.5 h-3.5" /> Cobrar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============ COCINA (Vista Admin) ============
  const renderCocina = () => {
    const pedidosActivos = pedidos.filter(p => p.estado_cocina !== 'entregado' && p.tipo === 'mesa');
    const pendientes = pedidosActivos.filter(p => p.estado_cocina === 'pendiente');
    const preparando = pedidosActivos.filter(p => p.estado_cocina === 'preparando');
    const listos = pedidosActivos.filter(p => p.estado_cocina === 'listo');

    const getProductoNombre = (productoId: string) => {
      return productos.find(p => p.id === productoId)?.nombre || 'Desconocido';
    };

    const renderCard = (pedido: Pedido) => (
      <div key={pedido.id} className="border-2 border-slate-600 rounded-xl p-4 mb-3 bg-slate-700/30">
        <div className="flex items-center justify-between mb-3">
          <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
            Mesa {mesas.find(m => m.id === pedido.mesa_id)?.numero_mesa || '?'}
          </span>
          <span className="text-slate-400 text-xs">#{pedido.id.slice(-4)}</span>
        </div>
        <div className="space-y-1.5 mb-3">
          {pedido.detalles.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded">{d.cantidad}x</span>
              <span className="text-white text-sm">{getProductoNombre(d.producto_id)}</span>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Supervisión de Cocina</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Pendientes ({pendientes.length})
            </h3>
            {pendientes.map(renderCard)}
            {pendientes.length === 0 && <p className="text-slate-500 text-center py-4">Sin pedidos</p>}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
              <ChefHat className="w-5 h-5" /> Preparando ({preparando.length})
            </h3>
            {preparando.map(renderCard)}
            {preparando.length === 0 && <p className="text-slate-500 text-center py-4">Sin pedidos</p>}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> Listos ({listos.length})
            </h3>
            {listos.map(renderCard)}
            {listos.length === 0 && <p className="text-slate-500 text-center py-4">Sin pedidos</p>}
          </div>
        </div>
      </div>
    );
  };

  // ============ MEJORA C: MENÚ CON FILTROS ============
  const renderMenu = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Menú / Productos</h2>
        <button onClick={() => setShowNewProducto(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {/* MEJORA C: Cinta de filtros */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 text-sm font-medium">Filtrar por categoría:</span>
          <span className="text-slate-500 text-xs ml-auto">{productosFiltrados.length} de {productos.length} productos</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map(cat => (
            <button key={cat} onClick={() => setMenuFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                menuFilter === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}>
              {cat === 'Todos' ? '🍴' : cat === 'Platos' ? '🍽️' : cat === 'Bebidas' ? '🥤' : cat === 'Postres' ? '🍰' : '📦'} {cat}
              <span className="ml-1.5 text-xs opacity-70">({cat === 'Todos' ? productos.length : productos.filter(p => p.categoria === cat).length})</span>
            </button>
          ))}
        </div>
      </div>

      {showNewProducto && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4">Nuevo Producto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" value={newProd.nombre} onChange={e => setNewProd({ ...newProd, nombre: e.target.value })}
              placeholder="Nombre" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
            <input type="number" value={newProd.precio_base || ''} onChange={e => setNewProd({ ...newProd, precio_base: Number(e.target.value) })}
              placeholder="Precio" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
            <select value={newProd.categoria} onChange={e => setNewProd({ ...newProd, categoria: e.target.value, es_desechable: e.target.value === 'Desechables' })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
              <option value="Platos">Platos</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Postres">Postres</option>
              <option value="Desechables">Desechables</option>
            </select>
            <div className="flex items-center gap-4">
              <button onClick={() => {
                if (!newProd.nombre || !newProd.precio_base) return;
                const prod: Producto = {
                  id: uuidv4(), nombre: newProd.nombre, precio_base: newProd.precio_base,
                  es_desechable: newProd.es_desechable, disponible: true, envase_predeterminado_id: null, categoria: newProd.categoria,
                };
                db.addProducto(prod);
                const getUnidadMedida = (cat: string) => {
                  switch (cat) { case 'Bebidas': return 'Litros'; case 'Platos': case 'Postres': return 'Porciones'; default: return 'Unidades'; }
                };
                const inv: Inventario = {
                  id: uuidv4(), producto_id: prod.id, nombre: prod.nombre, descripcion: `Insumo: ${prod.nombre}`,
                  categoria: prod.categoria, unidad_medida: getUnidadMedida(prod.categoria),
                  stock_actual: newProd.es_desechable ? 200 : 50, stock_minimo: newProd.es_desechable ? 50 : 10,
                  precio_costo: Math.round(newProd.precio_base * 0.4), precio_venta: newProd.precio_base,
                };
                const invItems = db.getInventario();
                invItems.push(inv);
                localStorage.setItem('pos_inventario', JSON.stringify(invItems));
                refreshData();
                setShowNewProducto(false);
                setNewProd({ nombre: '', precio_base: 0, categoria: 'Platos', es_desechable: false });
              }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Guardar</button>
              <button onClick={() => setShowNewProducto(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Producto</th>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Categoría</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Precio</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Disponible</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No hay productos en esta categoría</td></tr>
              ) : (
                productosFiltrados.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white text-sm">{prod.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${prod.es_desechable ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {prod.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-bold">${prod.precio_base.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => { db.updateProducto({ ...prod, disponible: !prod.disponible }); refreshData(); }}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${prod.disponible ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {prod.disponible ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => {
                        const newPrecio = prompt('Nuevo precio:', prod.precio_base.toString());
                        if (newPrecio) { db.updateProducto({ ...prod, precio_base: Number(newPrecio) }); refreshData(); }
                      }} className="text-blue-400 hover:text-blue-300 p-1"><Edit2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============ MEJORA C: INVENTARIO CON FILTROS Y BUSCADOR ============
  const renderInventario = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Inventario</h2>
        <button onClick={() => setShowNewInsumo(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Insumo
        </button>
      </div>

      {/* MEJORA C: Filtros y buscador */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={inventarioSearch} onChange={e => setInventarioSearch(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-slate-500 text-sm">{inventarioFiltrado.length} resultados</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categoriasInventario.map(cat => (
            <button key={cat} onClick={() => setInventarioFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                inventarioFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MEJORA C: Modal nuevo insumo */}
      {showNewInsumo && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4">Nuevo Insumo / Producto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Nombre *</label>
              <input type="text" value={newInsumo.nombre} onChange={e => setNewInsumo({ ...newInsumo, nombre: e.target.value })}
                placeholder="Ej: Carne de Res" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Descripción</label>
              <input type="text" value={newInsumo.descripcion} onChange={e => setNewInsumo({ ...newInsumo, descripcion: e.target.value })}
                placeholder="Ej: Corte premium 200g" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Categoría *</label>
              <select value={newInsumo.categoria} onChange={e => setNewInsumo({ ...newInsumo, categoria: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                <option value="Platos">Platos</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Postres">Postres</option>
                <option value="Desechables">Desechables</option>
                <option value="Insumos">Insumos</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Unidad de Medida *</label>
              <select value={newInsumo.unidad_medida} onChange={e => setNewInsumo({ ...newInsumo, unidad_medida: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                <option value="Unidades">Unidades</option>
                <option value="Kg">Kilogramos (Kg)</option>
                <option value="Litros">Litros</option>
                <option value="Gramos">Gramos</option>
                <option value="Porciones">Porciones</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Stock Actual</label>
              <input type="number" value={newInsumo.stock_actual || ''} onChange={e => setNewInsumo({ ...newInsumo, stock_actual: Number(e.target.value) })}
                placeholder="0" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Stock Mínimo</label>
              <input type="number" value={newInsumo.stock_minimo || ''} onChange={e => setNewInsumo({ ...newInsumo, stock_minimo: Number(e.target.value) })}
                placeholder="0" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Precio Costo</label>
              <input type="number" value={newInsumo.precio_costo || ''} onChange={e => setNewInsumo({ ...newInsumo, precio_costo: Number(e.target.value) })}
                placeholder="0.00" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Precio Venta</label>
              <input type="number" value={newInsumo.precio_venta || ''} onChange={e => setNewInsumo({ ...newInsumo, precio_venta: Number(e.target.value) })}
                placeholder="0.00" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button onClick={() => {
                if (!newInsumo.nombre || !newInsumo.categoria) return;
                const prodId = uuidv4();
                // Crear producto
                const prod: Producto = {
                  id: prodId, nombre: newInsumo.nombre, precio_base: newInsumo.precio_venta,
                  es_desechable: newInsumo.categoria === 'Desechables', disponible: true,
                  envase_predeterminado_id: null, categoria: newInsumo.categoria,
                };
                db.addProducto(prod);
                // Crear inventario
                const inv: Inventario = {
                  id: uuidv4(), producto_id: prodId, nombre: newInsumo.nombre,
                  descripcion: newInsumo.descripcion, categoria: newInsumo.categoria,
                  unidad_medida: newInsumo.unidad_medida, stock_actual: newInsumo.stock_actual,
                  stock_minimo: newInsumo.stock_minimo, precio_costo: newInsumo.precio_costo,
                  precio_venta: newInsumo.precio_venta,
                };
                const invItems = db.getInventario();
                invItems.push(inv);
                localStorage.setItem('pos_inventario', JSON.stringify(invItems));
                refreshData();
                setShowNewInsumo(false);
                setNewInsumo({ nombre: '', descripcion: '', categoria: 'Platos', unidad_medida: 'Unidades', stock_actual: 0, stock_minimo: 0, precio_costo: 0, precio_venta: 0 });
              }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Crear Insumo</button>
              <button onClick={() => setShowNewInsumo(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Insumo</th>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Categoría</th>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Unidad</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Stock</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Mínimo</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Estado</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Ajustar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {inventarioFiltrado.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No se encontraron resultados</td></tr>
              ) : (
                inventarioFiltrado.map(inv => {
                  const isLow = inv.stock_actual <= inv.stock_minimo;
                  return (
                    <tr key={inv.id} className={`hover:bg-slate-700/30 ${isLow ? 'bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{inv.nombre}</p>
                          {inv.descripcion && <p className="text-slate-500 text-xs">{inv.descripcion}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">{inv.categoria}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{inv.unidad_medida}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
                        {inv.stock_actual}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">{inv.stock_minimo}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">⚠ BAJO</span>
                        ) : (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => {
                          const cantidad = prompt(`Cantidad a agregar (${inv.unidad_medida}):`, '10');
                          if (cantidad) {
                            db.updateInventario({ ...inv, stock_actual: inv.stock_actual + Number(cantidad) });
                            db.emitEvent('inventario_actualizado', {});
                            refreshData();
                          }
                        }} className="text-green-400 hover:text-green-300 text-sm font-medium">+ Agregar</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============ RESERVAS ============
  const renderReservas = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Reservas</h2>
        <button onClick={() => setShowNewReserva(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Reserva
        </button>
      </div>
      {showNewReserva && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4">Nueva Reserva</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select value={newReserva.mesa_id} onChange={e => setNewReserva({ ...newReserva, mesa_id: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
              <option value="">Seleccionar mesa</option>
              {mesas.filter(m => m.estado === 'libre').map(m => (
                <option key={m.id} value={m.id}>Mesa {m.numero_mesa} ({m.puestos} pax - {m.zona})</option>
              ))}
            </select>
            <input type="text" value={newReserva.cliente_nombre} onChange={e => setNewReserva({ ...newReserva, cliente_nombre: e.target.value })}
              placeholder="Nombre del cliente" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
            <input type="datetime-local" value={newReserva.fecha_hora} onChange={e => setNewReserva({ ...newReserva, fecha_hora: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
            <input type="text" value={newReserva.nota} onChange={e => setNewReserva({ ...newReserva, nota: e.target.value })}
              placeholder="Nota (opcional)" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
            <div className="flex gap-2 sm:col-span-2">
              <button onClick={() => {
                if (!newReserva.mesa_id || !newReserva.cliente_nombre || !newReserva.fecha_hora) return;
                db.crearReserva({ mesa_id: newReserva.mesa_id, cliente_nombre: newReserva.cliente_nombre, fecha_hora: newReserva.fecha_hora, nota: newReserva.nota, estado: 'activa' });
                refreshData(); setShowNewReserva(false);
                setNewReserva({ mesa_id: '', cliente_nombre: '', fecha_hora: '', nota: '' });
              }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Crear Reserva</button>
              <button onClick={() => setShowNewReserva(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {reservas.filter(r => r.estado === 'activa').map(reserva => {
          const mesa = mesas.find(m => m.id === reserva.mesa_id);
          return (
            <div key={reserva.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{reserva.cliente_nombre}</p>
                <p className="text-slate-400 text-sm">Mesa {mesa?.numero_mesa} • {new Date(reserva.fecha_hora).toLocaleString()}</p>
                {reserva.nota && <p className="text-yellow-300 text-xs mt-1">📝 {reserva.nota}</p>}
              </div>
              <button onClick={() => { db.liberarReserva(reserva.id); db.emitEvent('mesa_liberada', { mesa_id: reserva.mesa_id }); refreshData(); }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Unlock className="w-4 h-4" /> Liberar Mesa
              </button>
            </div>
          );
        })}
        {reservas.filter(r => r.estado === 'activa').length === 0 && <p className="text-slate-500 text-center py-8">No hay reservas activas</p>}
      </div>
    </div>
  );

  // ============ MEJORA D: CAJA ============
  const renderCaja = () => {
    if (!cajaTurnoActivo) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Caja No Disponible</h3>
            <p className="text-slate-400">Abra la caja para comenzar</p>
            <button onClick={() => setCajaRequiereApertura(true)}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-bold">Abrir Caja</button>
          </div>
        </div>
      );
    }
    const turnos = db.getCajaTurnos();
    const fechaApertura = new Date(cajaTurnoActivo.fecha_apertura).getTime();
    const pedidosDelTurno = pedidos.filter(p => p.estado_pago === 'pagado' && new Date(p.fecha_actualizacion).getTime() >= fechaApertura);
    const totalVentasTurno = pedidosDelTurno.reduce((s, p) => s + p.total, 0);
    const totalEfectivo = pedidosDelTurno.reduce((s, p) => s + p.pagos.reduce((ps, pg) => ps + pg.monto_efectivo, 0), 0);
    const totalTarjeta = pedidosDelTurno.reduce((s, p) => s + p.pagos.reduce((ps, pg) => ps + pg.monto_tarjeta, 0), 0);
    const totalTransferencia = pedidosDelTurno.reduce((s, p) => s + p.pagos.reduce((ps, pg) => ps + pg.monto_transferencia, 0), 0);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Caja</h2>
        <div className="bg-slate-800 rounded-xl p-6 border border-green-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-green-400 font-bold text-lg">Caja Abierta</span>
            <span className="text-slate-500 text-sm ml-auto">Turno #{cajaTurnoActivo.id.slice(-6)}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Apertura</p>
              <p className="text-white font-bold">{new Date(cajaTurnoActivo.fecha_apertura).toLocaleString()}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Fondo Inicial</p>
              <p className="text-white font-bold text-xl">${cajaTurnoActivo.monto_apertura.toFixed(2)}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Ventas del Turno</p>
              <p className="text-green-400 font-bold text-xl">${totalVentasTurno.toFixed(2)}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Transacciones</p>
              <p className="text-white font-bold text-xl">{pedidosDelTurno.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-center">
              <p className="text-green-300 text-xs">Efectivo</p>
              <p className="text-green-400 font-bold text-lg">${totalEfectivo.toFixed(2)}</p>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-center">
              <p className="text-blue-300 text-xs">Tarjeta</p>
              <p className="text-blue-400 font-bold text-lg">${totalTarjeta.toFixed(2)}</p>
            </div>
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3 text-center">
              <p className="text-purple-300 text-xs">Transferencia</p>
              <p className="text-purple-400 font-bold text-lg">${totalTransferencia.toFixed(2)}</p>
            </div>
          </div>
          <div className="border-t border-slate-600 pt-4">
            <h4 className="text-white font-medium mb-3">Cerrar Caja</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-slate-400 text-sm block mb-1">Monto Final en Caja</label>
                <input type="number" value={cajaMontoFinal || ''} onChange={e => setCajaMontoFinal(Number(e.target.value))}
                  placeholder="0.00" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-xl font-bold" />
              </div>
              <button onClick={() => {
                if (confirm('¿Está seguro de cerrar la caja?')) {
                  db.cerrarCajaTurno(cajaTurnoActivo.id, cajaMontoFinal);
                  db.emitEvent('caja_cerrada', {});
                  refreshData();
                  setCajaMontoFinal(0);
                }
              }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold">Cerrar Caja</button>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600">
            <h3 className="text-white font-bold">Historial de Turnos</h3>
          </div>
          <div className="divide-y divide-slate-700">
            {turnos.filter(c => c.estado === 'cerrado').slice(-5).reverse().map(turno => (
              <div key={turno.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{new Date(turno.fecha_apertura).toLocaleDateString()}</p>
                  <p className="text-slate-400 text-xs">{new Date(turno.fecha_apertura).toLocaleTimeString()} - {turno.fecha_cierre ? new Date(turno.fecha_cierre).toLocaleTimeString() : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">Apertura: ${turno.monto_apertura.toFixed(2)}</p>
                  <p className="text-green-400 text-sm">Ventas: ${turno.total_ventas.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {turnos.filter(c => c.estado === 'cerrado').length === 0 && <p className="text-slate-500 text-center py-4">Sin historial</p>}
          </div>
        </div>
      </div>
    );
  };

  // ============ USUARIOS ============
  const renderUsuarios = () => {
    const usuarios = db.getUsuarios();
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Usuarios</h2>
          <button onClick={() => setShowNewUsuario(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
        {showNewUsuario && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-white font-bold mb-4">Nuevo Usuario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" value={newUsuario.nombre} onChange={e => setNewUsuario({ ...newUsuario, nombre: e.target.value })}
                placeholder="Nombre completo" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
              <input type="text" value={newUsuario.usuario} onChange={e => setNewUsuario({ ...newUsuario, usuario: e.target.value })}
                placeholder="Usuario" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
              <input type="password" value={newUsuario.password} onChange={e => setNewUsuario({ ...newUsuario, password: e.target.value })}
                placeholder="Contraseña" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400" />
              <select value={newUsuario.rol} onChange={e => setNewUsuario({ ...newUsuario, rol: e.target.value as any })}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                <option value="mesero">Mesero</option>
                <option value="cocina">Cocina</option>
                <option value="admin">Administrador</option>
              </select>
              <div className="flex gap-2 sm:col-span-2">
                <button onClick={() => {
                  if (!newUsuario.nombre || !newUsuario.usuario || !newUsuario.password) return;
                  db.addUsuario({ nombre: newUsuario.nombre, usuario: newUsuario.usuario, password: newUsuario.password, rol: newUsuario.rol, activo: true });
                  refreshData(); setShowNewUsuario(false);
                  setNewUsuario({ nombre: '', usuario: '', password: '', rol: 'mesero' });
                }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Crear</button>
                <button onClick={() => setShowNewUsuario(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Nombre</th>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Usuario</th>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Rol</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Estado</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-white text-sm">{u.nombre}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{u.usuario}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.rol === 'admin' ? 'bg-red-500/20 text-red-300' : u.rol === 'mesero' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>{u.rol}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => { db.toggleUsuarioActivo(u.id); refreshData(); }}
                      className={`text-xs px-3 py-1 rounded-lg font-medium ${u.activo ? 'bg-red-600/20 text-red-300 hover:bg-red-600/40' : 'bg-green-600/20 text-green-300 hover:bg-green-600/40'}`}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-400 to-red-600 p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Admin Panel</h1>
              <p className="text-slate-400 text-xs">{user?.nombre}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}>
              <t.icon className="w-5 h-5" />
              {t.label}
              {t.id === 'ordenes' && pedidos.filter(p => p.estado_pago === 'pendiente' && new Date(p.fecha_creacion).toDateString() === new Date().toDateString()).length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {pedidos.filter(p => p.estado_pago === 'pendiente' && new Date(p.fecha_creacion).toDateString() === new Date().toDateString()).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-40">
        <div className="flex overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 px-2 py-2 text-xs relative ${tab === t.id ? 'text-orange-400' : 'text-slate-400'}`}>
              <t.icon className="w-5 h-5" />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
          <button onClick={logout} className="flex-1 min-w-[60px] flex flex-col items-center gap-1 px-2 py-2 text-xs text-red-400">
            <LogOut className="w-5 h-5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
        {tab === 'dashboard' && renderDashboard()}
        {tab === 'mesas' && renderMesas()}
        {tab === 'ordenes' && renderOrdenes()}
        {tab === 'cocina' && renderCocina()}
        {tab === 'menu' && renderMenu()}
        {tab === 'inventario' && renderInventario()}
        {tab === 'reservas' && renderReservas()}
        {tab === 'caja' && renderCaja()}
        {tab === 'usuarios' && renderUsuarios()}
      </main>

      {/* MEJORA D: Modal obligatorio de apertura de caja */}
      {cajaRequiereApertura && !cajaTurnoActivo && (
        <CashRegisterOpenModal usuarioId={user!.id} onOpened={() => { setCajaRequiereApertura(false); refreshData(); }} />
      )}

      {/* Modal de resumen de pedido con opción de marcar como entregado */}
      {summaryPedido && (
        <OrderSummaryModal
          pedido={summaryPedido}
          onClose={() => setSummaryPedido(null)}
          onPay={() => { setSummaryPedido(null); setPaymentPedido(summaryPedido); }}
          onMarkDelivered={() => marcarComoEntregado(summaryPedido.id)}
        />
      )}

      {/* Modal de pago */}
      {paymentPedido && (
        <PaymentModal pedido={paymentPedido} onClose={() => setPaymentPedido(null)} onSuccess={() => { setPaymentPedido(null); refreshData(); }} />
      )}
    </div>
  );
}
