import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Producto, Inventario, Mesa, Reserva } from '../types';
import * as db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import {
  LogOut, LayoutDashboard, Grid3X3, UtensilsCrossed, Package,
  CalendarDays, Wallet, Users, Plus, Edit2, Trash2, Unlock,
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, AlertTriangle
} from 'lucide-react';

type AdminTab = 'dashboard' | 'mesas' | 'menu' | 'inventario' | 'reservas' | 'caja' | 'usuarios';

export default function AdminView() {
  const { user, pedidos, mesas, productos, inventario, reservas, logout, refreshData } = useApp();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [showNewProducto, setShowNewProducto] = useState(false);
  const [showNewReserva, setShowNewReserva] = useState(false);
  const [showNewUsuario, setShowNewUsuario] = useState(false);

  // Form states
  const [newProd, setNewProd] = useState({ nombre: '', precio_base: 0, categoria: 'Platos', es_desechable: false });
  const [newReserva, setNewReserva] = useState({ mesa_id: '', cliente_nombre: '', fecha_hora: '', nota: '' });
  const [newUsuario, setNewUsuario] = useState({ nombre: '', usuario: '', password: '', rol: 'mesero' as const });
  const [cajaMontoInicial, setCajaMontoInicial] = useState(0);
  const [cajaMontoFinal, setCajaMontoFinal] = useState(0);

  const cajaActiva = db.getCaja().find(c => !c.fecha_cierre);
  const ventasHoy = pedidos.filter(p => {
    const today = new Date().toDateString();
    return new Date(p.fecha_creacion).toDateString() === today && p.estado_pago === 'pagado';
  });
  const totalVentasHoy = ventasHoy.reduce((sum, p) => sum + p.total, 0);
  const stockBajo = inventario.filter(i => i.stock_actual <= i.stock_minimo);

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mesas' as const, label: 'Mesas', icon: Grid3X3 },
    { id: 'menu' as const, label: 'Menú', icon: UtensilsCrossed },
    { id: 'inventario' as const, label: 'Inventario', icon: Package },
    { id: 'reservas' as const, label: 'Reservas', icon: CalendarDays },
    { id: 'caja' as const, label: 'Caja', icon: Wallet },
    { id: 'usuarios' as const, label: 'Usuarios', icon: Users },
  ];

  // ============ DASHBOARD ============
  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Panel de Control</h2>

      {/* Stats */}
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

      {/* Recent activity */}
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
                  <span className="text-slate-400 text-xs ml-2">
                    {p.estado_cocina} • {p.estado_pago}
                  </span>
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
            {stockBajo.slice(0, 5).map(inv => {
              const prod = productos.find(p => p.id === inv.producto_id);
              return (
                <div key={inv.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                  <span className="text-white text-sm">{prod?.nombre || 'Desconocido'}</span>
                  <span className="text-red-400 text-sm font-bold">{inv.stock_actual} / {inv.stock_minimo} min</span>
                </div>
              );
            })}
            {stockBajo.length === 0 && <p className="text-green-400 text-center py-4">✓ Todo el inventario OK</p>}
          </div>
        </div>
      </div>
    </div>
  );

  // ============ MESAS ============
  const renderMesas = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Gestión de Mesas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mesas.map(mesa => (
          <div key={mesa.id} className={`rounded-xl p-4 border-2 ${
            mesa.estado === 'libre' ? 'bg-green-900/20 border-green-700' :
            mesa.estado === 'ocupada' ? 'bg-orange-900/20 border-orange-700' :
            'bg-purple-900/20 border-purple-700'
          }`}>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{mesa.numero_mesa}</p>
              <p className="text-slate-400 text-sm">{mesa.puestos} pax • {mesa.zona}</p>
              <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full inline-block ${
                mesa.estado === 'libre' ? 'bg-green-500/20 text-green-300' :
                mesa.estado === 'ocupada' ? 'bg-orange-500/20 text-orange-300' :
                'bg-purple-500/20 text-purple-300'
              }`}>
                {mesa.estado.toUpperCase()}
              </div>
            </div>
            {mesa.estado === 'reservada' && (
              <button
                onClick={() => {
                  const reserva = reservas.find(r => r.mesa_id === mesa.id && r.estado === 'activa');
                  if (reserva) {
                    db.liberarReserva(reserva.id);
                    db.emitEvent('mesa_liberada', { mesa_id: mesa.id });
                    refreshData();
                  }
                }}
                className="w-full mt-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
              >
                <Unlock className="w-3 h-3" /> Liberar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ============ MENÚ ============
  const renderMenu = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Menú / Productos</h2>
        <button
          onClick={() => setShowNewProducto(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {showNewProducto && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4">Nuevo Producto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={newProd.nombre}
              onChange={e => setNewProd({ ...newProd, nombre: e.target.value })}
              placeholder="Nombre"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
            />
            <input
              type="number"
              value={newProd.precio_base || ''}
              onChange={e => setNewProd({ ...newProd, precio_base: Number(e.target.value) })}
              placeholder="Precio"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
            />
            <select
              value={newProd.categoria}
              onChange={e => setNewProd({ ...newProd, categoria: e.target.value, es_desechable: e.target.value === 'Desechables' })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="Platos">Platos</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Postres">Postres</option>
              <option value="Desechables">Desechables</option>
            </select>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (!newProd.nombre || !newProd.precio_base) return;
                  const prod: Producto = {
                    id: uuidv4(),
                    nombre: newProd.nombre,
                    precio_base: newProd.precio_base,
                    es_desechable: newProd.es_desechable,
                    disponible: true,
                    envase_predeterminado_id: null,
                    categoria: newProd.categoria,
                  };
                  db.addProducto(prod);
                  // Add to inventory
                  const inv: Inventario = {
                    id: uuidv4(),
                    producto_id: prod.id,
                    stock_actual: newProd.es_desechable ? 200 : 50,
                    stock_minimo: newProd.es_desechable ? 50 : 10,
                    precio_costo: Math.round(newProd.precio_base * 0.4),
                    precio_venta: newProd.precio_base,
                  };
                  const invItems = db.getInventario();
                  invItems.push(inv);
                  localStorage.setItem('pos_inventario', JSON.stringify(invItems));
                  refreshData();
                  setShowNewProducto(false);
                  setNewProd({ nombre: '', precio_base: 0, categoria: 'Platos', es_desechable: false });
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowNewProducto(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
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
              {productos.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-white text-sm">{prod.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      prod.es_desechable ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {prod.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-bold">${prod.precio_base.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        db.updateProducto({ ...prod, disponible: !prod.disponible });
                        refreshData();
                      }}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        prod.disponible ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {prod.disponible ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        const newPrecio = prompt('Nuevo precio:', prod.precio_base.toString());
                        if (newPrecio) {
                          db.updateProducto({ ...prod, precio_base: Number(newPrecio) });
                          refreshData();
                        }
                      }}
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============ INVENTARIO ============
  const renderInventario = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Inventario</h2>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left text-slate-300 text-sm font-medium px-4 py-3">Producto</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Stock Actual</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Stock Mínimo</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Costo</th>
                <th className="text-right text-slate-300 text-sm font-medium px-4 py-3">Venta</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Estado</th>
                <th className="text-center text-slate-300 text-sm font-medium px-4 py-3">Ajustar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {inventario.map(inv => {
                const prod = productos.find(p => p.id === inv.producto_id);
                const isLow = inv.stock_actual <= inv.stock_minimo;
                return (
                  <tr key={inv.id} className={`hover:bg-slate-700/30 ${isLow ? 'bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3 text-white text-sm">{prod?.nombre || 'Desconocido'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>{inv.stock_actual}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{inv.stock_minimo}</td>
                    <td className="px-4 py-3 text-right text-slate-400">${inv.precio_costo.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white font-bold">${inv.precio_venta.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {isLow ? (
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">⚠ BAJO</span>
                      ) : (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          const cantidad = prompt('Cantidad a agregar:', '10');
                          if (cantidad) {
                            db.updateInventario({ ...inv, stock_actual: inv.stock_actual + Number(cantidad) });
                            db.emitEvent('inventario_actualizado', {});
                            refreshData();
                          }
                        }}
                        className="text-green-400 hover:text-green-300 text-sm font-medium"
                      >
                        + Agregar
                      </button>
                    </td>
                  </tr>
                );
              })}
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
        <button
          onClick={() => setShowNewReserva(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Reserva
        </button>
      </div>

      {showNewReserva && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-bold mb-4">Nueva Reserva</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={newReserva.mesa_id}
              onChange={e => setNewReserva({ ...newReserva, mesa_id: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Seleccionar mesa</option>
              {mesas.filter(m => m.estado === 'libre').map(m => (
                <option key={m.id} value={m.id}>Mesa {m.numero_mesa} ({m.puestos} pax - {m.zona})</option>
              ))}
            </select>
            <input
              type="text"
              value={newReserva.cliente_nombre}
              onChange={e => setNewReserva({ ...newReserva, cliente_nombre: e.target.value })}
              placeholder="Nombre del cliente"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
            />
            <input
              type="datetime-local"
              value={newReserva.fecha_hora}
              onChange={e => setNewReserva({ ...newReserva, fecha_hora: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
            <input
              type="text"
              value={newReserva.nota}
              onChange={e => setNewReserva({ ...newReserva, nota: e.target.value })}
              placeholder="Nota (opcional)"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
            />
            <div className="flex gap-2 sm:col-span-2">
              <button
                onClick={() => {
                  if (!newReserva.mesa_id || !newReserva.cliente_nombre || !newReserva.fecha_hora) return;
                  db.crearReserva({
                    mesa_id: newReserva.mesa_id,
                    cliente_nombre: newReserva.cliente_nombre,
                    fecha_hora: newReserva.fecha_hora,
                    nota: newReserva.nota,
                    estado: 'activa',
                  });
                  refreshData();
                  setShowNewReserva(false);
                  setNewReserva({ mesa_id: '', cliente_nombre: '', fecha_hora: '', nota: '' });
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
              >
                Crear Reserva
              </button>
              <button onClick={() => setShowNewReserva(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm">
                Cancelar
              </button>
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
                <p className="text-slate-400 text-sm">
                  Mesa {mesa?.numero_mesa} • {new Date(reserva.fecha_hora).toLocaleString()}
                </p>
                {reserva.nota && <p className="text-yellow-300 text-xs mt-1">📝 {reserva.nota}</p>}
              </div>
              <button
                onClick={() => {
                  db.liberarReserva(reserva.id);
                  db.emitEvent('mesa_liberada', { mesa_id: reserva.mesa_id });
                  refreshData();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" /> Liberar Mesa
              </button>
            </div>
          );
        })}
        {reservas.filter(r => r.estado === 'activa').length === 0 && (
          <p className="text-slate-500 text-center py-8">No hay reservas activas</p>
        )}
      </div>

      {/* Historical */}
      {reservas.filter(r => r.estado !== 'activa').length > 0 && (
        <div className="mt-6">
          <h3 className="text-slate-400 font-medium mb-3">Historial</h3>
          <div className="space-y-2">
            {reservas.filter(r => r.estado !== 'activa').slice(-5).reverse().map(reserva => {
              const mesa = mesas.find(m => m.id === reserva.mesa_id);
              return (
                <div key={reserva.id} className="bg-slate-800/50 rounded-lg px-4 py-2 flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{reserva.cliente_nombre} - Mesa {mesa?.numero_mesa}</span>
                  <span className="text-slate-500 text-xs">{reserva.estado}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ============ CAJA ============
  const renderCaja = () => {
    const cajas = db.getCaja();
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Apertura / Cierre de Caja</h2>

        {!cajaActiva ? (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-white font-bold mb-4">Abrir Caja</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-slate-400 text-sm block mb-1">Monto Inicial</label>
                <input
                  type="number"
                  value={cajaMontoInicial || ''}
                  onChange={e => setCajaMontoInicial(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-xl font-bold"
                />
              </div>
              <button
                onClick={() => {
                  db.abrirCaja(user!.id, cajaMontoInicial);
                  refreshData();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold"
              >
                Abrir Caja
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-6 border border-green-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-400 font-bold">Caja Abierta</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Apertura</p>
                <p className="text-white font-bold">{new Date(cajaActiva.fecha_apertura).toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Monto Inicial</p>
                <p className="text-white font-bold text-xl">${cajaActiva.monto_inicial.toFixed(2)}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Ventas del período</p>
                <p className="text-green-400 font-bold text-xl">
                  ${pedidos.filter(p => {
                    return p.estado_pago === 'pagado' && new Date(p.fecha_creacion) >= new Date(cajaActiva.fecha_apertura);
                  }).reduce((sum, p) => sum + p.total, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Transacciones</p>
                <p className="text-white font-bold text-xl">
                  {pedidos.filter(p => {
                    return p.estado_pago === 'pagado' && new Date(p.fecha_creacion) >= new Date(cajaActiva.fecha_apertura);
                  }).length}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-600 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-slate-400 text-sm block mb-1">Monto Final en Caja</label>
                  <input
                    type="number"
                    value={cajaMontoFinal || ''}
                    onChange={e => setCajaMontoFinal(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-xl font-bold"
                  />
                </div>
                <button
                  onClick={() => {
                    db.cerrarCaja(cajaActiva.id, cajaMontoFinal);
                    refreshData();
                    setCajaMontoFinal(0);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold"
                >
                  Cerrar Caja
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600">
            <h3 className="text-white font-bold">Historial de Cajas</h3>
          </div>
          <div className="divide-y divide-slate-700">
            {cajas.filter(c => c.fecha_cierre).slice(-5).reverse().map(caja => (
              <div key={caja.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{new Date(caja.fecha_apertura).toLocaleDateString()}</p>
                  <p className="text-slate-400 text-xs">
                    {new Date(caja.fecha_apertura).toLocaleTimeString()} - {caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleTimeString() : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">Inicial: ${caja.monto_inicial.toFixed(2)}</p>
                  <p className="text-green-400 text-sm">Final: ${caja.monto_final?.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {cajas.filter(c => c.fecha_cierre).length === 0 && (
              <p className="text-slate-500 text-center py-4">Sin historial</p>
            )}
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
          <button
            onClick={() => setShowNewUsuario(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>

        {showNewUsuario && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-white font-bold mb-4">Nuevo Usuario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                value={newUsuario.nombre}
                onChange={e => setNewUsuario({ ...newUsuario, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
              />
              <input
                type="text"
                value={newUsuario.usuario}
                onChange={e => setNewUsuario({ ...newUsuario, usuario: e.target.value })}
                placeholder="Usuario"
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
              />
              <input
                type="password"
                value={newUsuario.password}
                onChange={e => setNewUsuario({ ...newUsuario, password: e.target.value })}
                placeholder="Contraseña"
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
              />
              <select
                value={newUsuario.rol}
                onChange={e => setNewUsuario({ ...newUsuario, rol: e.target.value as any })}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="mesero">Mesero</option>
                <option value="cocina">Cocina</option>
                <option value="admin">Administrador</option>
              </select>
              <div className="flex gap-2 sm:col-span-2">
                <button
                  onClick={() => {
                    if (!newUsuario.nombre || !newUsuario.usuario || !newUsuario.password) return;
                    db.addUsuario({
                      nombre: newUsuario.nombre,
                      usuario: newUsuario.usuario,
                      password: newUsuario.password,
                      rol: newUsuario.rol,
                      activo: true,
                    });
                    refreshData();
                    setShowNewUsuario(false);
                    setNewUsuario({ nombre: '', usuario: '', password: '', rol: 'mesero' });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Crear
                </button>
                <button onClick={() => setShowNewUsuario(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm">
                  Cancelar
                </button>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      u.rol === 'admin' ? 'bg-red-500/20 text-red-300' :
                      u.rol === 'mesero' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-orange-500/20 text-orange-300'
                    }`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { db.toggleUsuarioActivo(u.id); refreshData(); }}
                      className={`text-xs px-3 py-1 rounded-lg font-medium ${
                        u.activo ? 'bg-red-600/20 text-red-300 hover:bg-red-600/40' : 'bg-green-600/20 text-green-300 hover:bg-green-600/40'
                      }`}
                    >
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
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20"
          >
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50">
        <div className="flex overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 px-2 py-2 text-xs ${
                tab === t.id ? 'text-orange-400' : 'text-slate-400'
              }`}
            >
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
        {tab === 'menu' && renderMenu()}
        {tab === 'inventario' && renderInventario()}
        {tab === 'reservas' && renderReservas()}
        {tab === 'caja' && renderCaja()}
        {tab === 'usuarios' && renderUsuarios()}
      </main>
    </div>
  );
}
