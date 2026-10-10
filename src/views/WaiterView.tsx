import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Pedido, Producto, DetallePedido, PedidoDesechable, Mesa } from '../types';
import * as db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import PaymentModal from '../components/PaymentModal';
import OrderSummaryModal from '../components/OrderSummaryModal';
import {
  LogOut, Plus, Minus, ShoppingCart, CreditCard, Banknote,
  Smartphone, X, ChefHat, Clock, CheckCircle, Truck, UtensilsCrossed
} from 'lucide-react';

type View = 'mesas' | 'pedido' | 'cobrar' | 'llevar';

export default function WaiterView() {
  const { user, pedidos, mesas, productos, logout, refreshData, refreshPedidos } = useApp();
  const [view, setView] = useState<View>('mesas');
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [cart, setCart] = useState<{ producto: Producto; cantidad: number; notas: string }[]>([]);
  const [desechables, setDesechables] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [categoria, setCategoria] = useState('Platos');
  const [showDesechables, setShowDesechables] = useState(false);

  // Modals
  const [summaryPedido, setSummaryPedido] = useState<Pedido | null>(null);
  const [paymentPedido, setPaymentPedido] = useState<Pedido | null>(null);

  // Llevar form
  const [llevarNombre, setLlevarNombre] = useState('');
  const [llevarTelefono, setLlevarTelefono] = useState('');

  // Pago
  const [pagoEfectivo, setPagoEfectivo] = useState(0);
  const [pagoTarjeta, setPagoTarjeta] = useState(0);
  const [pagoTransferencia, setPagoTransferencia] = useState(0);
  const [pagoError, setPagoError] = useState('');

  const categorias = ['Platos', 'Bebidas', 'Postres', 'Desechables'];
  const productosCategoria = productos.filter(p => p.categoria === categoria && p.disponible && !p.es_desechable);
  const productosDesechables = productos.filter(p => p.es_desechable && p.disponible);

  useEffect(() => {
    const unsub = db.onEvent(() => refreshData());
    const interval = setInterval(refreshPedidos, 3000);
    return () => { unsub(); clearInterval(interval); };
  }, [refreshData, refreshPedidos]);

  const addToCart = (producto: Producto) => {
    setCart(prev => {
      const existing = prev.find(c => c.producto.id === producto.id);
      if (existing) {
        return prev.map(c => c.producto.id === producto.id ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { producto, cantidad: 1, notas: '' }];
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.producto.id === productoId);
      if (existing && existing.cantidad > 1) {
        return prev.map(c => c.producto.id === productoId ? { ...c, cantidad: c.cantidad - 1 } : c);
      }
      return prev.filter(c => c.producto.id !== productoId);
    });
  };

  const addDesechable = (producto: Producto) => {
    setDesechables(prev => {
      const existing = prev.find(d => d.producto.id === producto.id);
      if (existing) {
        return prev.map(d => d.producto.id === producto.id ? { ...d, cantidad: d.cantidad + 1 } : d);
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const removeDesechable = (productoId: string) => {
    setDesechables(prev => {
      const existing = prev.find(d => d.producto.id === productoId);
      if (existing && existing.cantidad > 1) {
        return prev.map(d => d.producto.id === productoId ? { ...d, cantidad: d.cantidad - 1 } : d);
      }
      return prev.filter(d => d.producto.id !== productoId);
    });
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + (item.producto.precio_base * item.cantidad), 0);
  const getDesechablesTotal = () => desechables.reduce((sum, item) => sum + (item.producto.precio_base * item.cantidad), 0);
  const getTotal = () => getCartTotal() + getDesechablesTotal();

  // MEJORA A: Interactividad mejorada en mesas
  const selectMesa = (mesa: Mesa) => {
    setSelectedMesa(mesa);
    const pedidoExistente = pedidos.find(p => p.mesa_id === mesa.id && p.estado_pago !== 'pagado' && p.tipo === 'mesa');

    if (mesa.estado === 'ocupada' && pedidoExistente && pedidoExistente.estado_pago === 'pendiente') {
      // Mesa ocupada con pedido por cobrar → mostrar resumen con botón cobrar
      setSummaryPedido(pedidoExistente);
      return;
    }

    if (pedidoExistente) {
      setPedidoActivo(pedidoExistente);
      const allProducts = db.getProductos();
      const loadedCart = pedidoExistente.detalles.map(d => ({
        producto: allProducts.find(p => p.id === d.producto_id)!,
        cantidad: d.cantidad,
        notas: d.notas,
      })).filter(c => c.producto);
      setCart(loadedCart);
      const loadedDesechables = pedidoExistente.desechables.map(d => ({
        producto: allProducts.find(p => p.id === d.producto_id)!,
        cantidad: d.cantidad,
      })).filter(d => d.producto);
      setDesechables(loadedDesechables);
    } else {
      // Mesa libre → abrir directamente la vista de toma de pedido
      setPedidoActivo(null);
      setCart([]);
      setDesechables([]);
    }
    setView('pedido');
  };

  const enviarPedido = () => {
    if (cart.length === 0) return;
    const detalles: DetallePedido[] = cart.map(item => ({
      id: uuidv4(), pedido_id: '', producto_id: item.producto.id,
      cantidad: item.cantidad, precio_unitario: item.producto.precio_base,
      subtotal: item.producto.precio_base * item.cantidad, notas: item.notas,
    }));
    const desechablesDet: PedidoDesechable[] = desechables.map(item => ({
      id: uuidv4(), pedido_id: '', producto_id: item.producto.id,
      cantidad: item.cantidad, subtotal: item.producto.precio_base * item.cantidad,
    }));
    const total = getTotal();

    if (pedidoActivo) {
      const pedidos = db.getPedidos();
      const idx = pedidos.findIndex(p => p.id === pedidoActivo.id);
      if (idx >= 0) {
        pedidos[idx].detalles = detalles.map(d => ({ ...d, pedido_id: pedidoActivo.id }));
        pedidos[idx].desechables = desechablesDet.map(d => ({ ...d, pedido_id: pedidoActivo.id }));
        pedidos[idx].total = total;
        pedidos[idx].estado_cocina = 'pendiente';
        pedidos[idx].fecha_actualizacion = new Date().toISOString();
        localStorage.setItem('pos_pedidos', JSON.stringify(pedidos));
      }
      db.updateMesaEstado(selectedMesa!.id, 'ocupada');
    } else {
      const pedido = db.crearPedido({
        tipo: 'mesa', mesa_id: selectedMesa!.id, cliente_nombre: '', cliente_telefono: '',
        mesero_id: user!.id, estado_cocina: 'pendiente', estado_pago: 'pendiente',
        total, detalles, desechables: desechablesDet, pagos: [],
      });
      setPedidoActivo(pedido);
      db.updateMesaEstado(selectedMesa!.id, 'ocupada');
    }
    db.emitEvent('nuevo_pedido', { mesa: selectedMesa?.numero_mesa });
    refreshData();
    setView('mesas');
    setCart([]);
    setDesechables([]);
  };

  const crearPedidoLlevar = () => {
    if (!llevarNombre.trim() || cart.length === 0) return;
    const detalles: DetallePedido[] = cart.map(item => ({
      id: uuidv4(), pedido_id: '', producto_id: item.producto.id,
      cantidad: item.cantidad, precio_unitario: item.producto.precio_base,
      subtotal: item.producto.precio_base * item.cantidad, notas: item.notas,
    }));
    const desechablesDet: PedidoDesechable[] = desechables.map(item => ({
      id: uuidv4(), pedido_id: '', producto_id: item.producto.id,
      cantidad: item.cantidad, subtotal: item.producto.precio_base * item.cantidad,
    }));
    const total = getTotal();
    const pedido = db.crearPedido({
      tipo: 'llevar', mesa_id: null, cliente_nombre: llevarNombre, cliente_telefono: llevarTelefono,
      mesero_id: user!.id, estado_cocina: 'pendiente', estado_pago: 'pendiente',
      total, detalles, desechables: desechablesDet, pagos: [],
    });
    const result = db.cobrarPedido(pedido.id, total, 0, 0);
    if (result.success) db.emitEvent('nuevo_pedido', { tipo: 'llevar', cliente: llevarNombre });
    refreshData();
    setView('mesas');
    setCart([]);
    setDesechables([]);
    setLlevarNombre('');
    setLlevarTelefono('');
  };

  const getEstadoCocinaBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">⏳ Pendiente</span>;
      case 'preparando': return <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">🔥 Preparando</span>;
      case 'listo': return <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">✅ Listo</span>;
      default: return null;
    }
  };

  // ============ RENDER ============
  const renderMesas = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-6 h-6 text-orange-400" />
          <div>
            <h1 className="text-white font-bold">Mesero: {user?.nombre}</h1>
            <p className="text-slate-400 text-xs">Seleccione una mesa o cree pedido para llevar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setView('llevar'); setCart([]); setDesechables([]); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Truck className="w-4 h-4" /> Para Llevar
          </button>
          <button onClick={logout} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mesas.map(mesa => {
            const pedidoMesa = pedidos.find(p => p.mesa_id === mesa.id && p.estado_pago !== 'pagado' && p.tipo === 'mesa');
            return (
              <button key={mesa.id} onClick={() => selectMesa(mesa)}
                className={`relative p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  mesa.estado === 'libre' ? 'bg-green-900/30 border-green-600/50 hover:border-green-400' :
                  mesa.estado === 'reservada' ? 'bg-purple-900/30 border-purple-600/50 hover:border-purple-400' :
                  'bg-orange-900/30 border-orange-600/50 hover:border-orange-400'
                }`}>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    mesa.estado === 'libre' ? 'text-green-400' : mesa.estado === 'reservada' ? 'text-purple-400' : 'text-orange-400'
                  }`}>{mesa.numero_mesa}</div>
                  <div className="text-slate-400 text-xs mt-1">{mesa.puestos} pax • {mesa.zona}</div>
                  <div className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full inline-block ${
                    mesa.estado === 'libre' ? 'bg-green-500/20 text-green-300' : mesa.estado === 'reservada' ? 'bg-purple-500/20 text-purple-300' : 'bg-orange-500/20 text-orange-300'
                  }`}>
                    {mesa.estado === 'libre' ? '🟢 LIBRE' : mesa.estado === 'reservada' ? '🟣 RESERVADA' : '🟠 OCUPADA'}
                  </div>
                </div>
                {pedidoMesa && (
                  <>
                    <div className="absolute top-2 right-2">{getEstadoCocinaBadge(pedidoMesa.estado_cocina)}</div>
                    <div className="mt-2 text-center">
                      <span className="text-white text-sm font-bold">${pedidoMesa.total.toFixed(0)}</span>
                      {pedidoMesa.estado_pago === 'pendiente' && mesa.estado === 'ocupada' && (
                        <p className="text-orange-300 text-xs mt-1">👆 Click para cobrar</p>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderLlevar = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('mesas')} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
          <Truck className="w-6 h-6 text-purple-400" />
          <h1 className="text-white font-bold">Pedido Para Llevar</h1>
        </div>
        <button onClick={crearPedidoLlevar} disabled={!llevarNombre.trim() || cart.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold">
          Cobrar ${getTotal().toFixed(2)}
        </button>
      </header>
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-800/50 border-b border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={llevarNombre} onChange={e => setLlevarNombre(e.target.value)}
                placeholder="Nombre del cliente *" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
              <input type="tel" value={llevarTelefono} onChange={e => setLlevarTelefono(e.target.value)}
                placeholder="Teléfono (opcional)" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex gap-2 p-3 overflow-x-auto bg-slate-800/30 border-b border-slate-700">
            {categorias.map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  categoria === cat ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}>{cat}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(categoria === 'Desechables' ? productosDesechables : productosCategoria).map(producto => (
                <button key={producto.id}
                  onClick={() => categoria === 'Desechables' ? addDesechable(producto) : addToCart(producto)}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-left hover:border-purple-500 transition-all active:scale-95">
                  <p className="text-white text-sm font-medium truncate">{producto.nombre}</p>
                  <p className="text-purple-400 font-bold mt-1">${producto.precio_base.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full lg:w-80 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-purple-400" /> Orden</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.map(item => (
              <div key={item.producto.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                <span className="text-white text-sm flex-1 truncate">{item.producto.nombre}</span>
                <button onClick={() => removeFromCart(item.producto.id)} className="text-red-400 p-1"><Minus className="w-4 h-4" /></button>
                <span className="text-white font-bold text-sm w-6 text-center">{item.cantidad}</span>
                <button onClick={() => addToCart(item.producto)} className="text-green-400 p-1"><Plus className="w-4 h-4" /></button>
                <span className="text-white text-sm w-16 text-right">${(item.producto.precio_base * item.cantidad).toFixed(0)}</span>
              </div>
            ))}
            {desechables.map(item => (
              <div key={item.producto.id} className="flex items-center gap-2 bg-purple-900/30 rounded-lg p-2 border border-purple-700/50">
                <span className="text-purple-200 text-sm flex-1 truncate">📦 {item.producto.nombre}</span>
                <button onClick={() => removeDesechable(item.producto.id)} className="text-red-400 p-1"><Minus className="w-4 h-4" /></button>
                <span className="text-white font-bold text-sm w-6 text-center">{item.cantidad}</span>
                <button onClick={() => addDesechable(item.producto)} className="text-green-400 p-1"><Plus className="w-4 h-4" /></button>
                <span className="text-white text-sm w-16 text-right">${(item.producto.precio_base * item.cantidad).toFixed(0)}</span>
              </div>
            ))}
            {cart.length === 0 && desechables.length === 0 && <p className="text-slate-500 text-center py-8">Agregue productos</p>}
          </div>
          <div className="p-4 border-t border-slate-700 space-y-2">
            {getDesechablesTotal() > 0 && (
              <div className="flex justify-between text-sm text-purple-300"><span>Desechables:</span><span>${getDesechablesTotal().toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-lg font-bold text-white"><span>Total:</span><span>${getTotal().toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPedido = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('mesas'); setCart([]); setDesechables([]); }} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
          <div>
            <h1 className="text-white font-bold">Mesa {selectedMesa?.numero_mesa}</h1>
            <p className="text-slate-400 text-xs">{selectedMesa?.puestos} pax • {selectedMesa?.zona}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pedidoActivo && pedidoActivo.estado_pago !== 'pagado' && (
            <button onClick={() => setPaymentPedido(pedidoActivo)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Cobrar
            </button>
          )}
          <button onClick={enviarPedido} disabled={cart.length === 0}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <ChefHat className="w-4 h-4" /> Enviar
          </button>
        </div>
      </header>
      {pedidoActivo && (
        <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex items-center gap-3">
          <span className="text-slate-400 text-sm">Estado cocina:</span>
          {getEstadoCocinaBadge(pedidoActivo.estado_cocina)}
          <span className="ml-auto text-white font-bold">${pedidoActivo.total.toFixed(2)}</span>
        </div>
      )}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex gap-2 p-3 overflow-x-auto bg-slate-800/30 border-b border-slate-700">
            {categorias.filter(c => c !== 'Desechables').map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  categoria === cat ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}>{cat}</button>
            ))}
            <button onClick={() => setShowDesechables(!showDesechables)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                showDesechables ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}>📦 Desechables</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {showDesechables ? (
              <div>
                <h3 className="text-purple-300 font-medium mb-3">📦 Envases y Desechables</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {productosDesechables.map(producto => (
                    <button key={producto.id} onClick={() => addDesechable(producto)}
                      className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-3 text-left hover:border-purple-400 transition-all active:scale-95">
                      <p className="text-white text-sm font-medium truncate">{producto.nombre}</p>
                      <p className="text-purple-300 font-bold mt-1">${producto.precio_base.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {productosCategoria.map(producto => (
                  <button key={producto.id} onClick={() => addToCart(producto)}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-left hover:border-orange-500 transition-all active:scale-95">
                    <p className="text-white text-sm font-medium truncate">{producto.nombre}</p>
                    <p className="text-orange-400 font-bold mt-1">${producto.precio_base.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-full lg:w-80 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col max-h-[50vh] lg:max-h-full">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-orange-400" /> Orden Actual</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.map(item => (
              <div key={item.producto.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                <span className="text-white text-sm flex-1 truncate">{item.producto.nombre}</span>
                <button onClick={() => removeFromCart(item.producto.id)} className="text-red-400 p-1"><Minus className="w-4 h-4" /></button>
                <span className="text-white font-bold text-sm w-6 text-center">{item.cantidad}</span>
                <button onClick={() => addToCart(item.producto)} className="text-green-400 p-1"><Plus className="w-4 h-4" /></button>
                <span className="text-white text-sm w-16 text-right">${(item.producto.precio_base * item.cantidad).toFixed(0)}</span>
              </div>
            ))}
            {desechables.map(item => (
              <div key={item.producto.id} className="flex items-center gap-2 bg-purple-900/30 rounded-lg p-2 border border-purple-700/50">
                <span className="text-purple-200 text-sm flex-1 truncate">📦 {item.producto.nombre}</span>
                <button onClick={() => removeDesechable(item.producto.id)} className="text-red-400 p-1"><Minus className="w-4 h-4" /></button>
                <span className="text-white font-bold text-sm w-6 text-center">{item.cantidad}</span>
                <button onClick={() => addDesechable(item.producto)} className="text-green-400 p-1"><Plus className="w-4 h-4" /></button>
                <span className="text-white text-sm w-16 text-right">${(item.producto.precio_base * item.cantidad).toFixed(0)}</span>
              </div>
            ))}
            {cart.length === 0 && desechables.length === 0 && <p className="text-slate-500 text-center py-8">Seleccione productos del menú</p>}
          </div>
          <div className="p-4 border-t border-slate-700">
            {getDesechablesTotal() > 0 && (
              <div className="flex justify-between text-sm text-purple-300 mb-1"><span>Desechables:</span><span>${getDesechablesTotal().toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-xl font-bold text-white"><span>Total:</span><span>${getTotal().toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {view === 'mesas' && renderMesas()}
      {view === 'llevar' && renderLlevar()}
      {view === 'pedido' && renderPedido()}

      {/* MEJORA A: Modal de resumen para mesa ocupada */}
      {summaryPedido && (
        <OrderSummaryModal
          pedido={summaryPedido}
          onClose={() => setSummaryPedido(null)}
          onPay={() => {
            setPaymentPedido(summaryPedido);
            setSummaryPedido(null);
          }}
        />
      )}

      {/* Modal de pago global */}
      {paymentPedido && (
        <PaymentModal
          pedido={paymentPedido}
          onClose={() => setPaymentPedido(null)}
          onSuccess={() => {
            setPaymentPedido(null);
            refreshData();
            setView('mesas');
          }}
        />
      )}
    </>
  );
}
