export type Rol = 'admin' | 'mesero' | 'cocina';
export type EstadoMesa = 'libre' | 'ocupada' | 'reservada';
export type EstadoCocina = 'pendiente' | 'preparando' | 'listo' | 'entregado';
export type EstadoPago = 'pendiente' | 'pagado' | 'parcial';
export type TipoPedido = 'mesa' | 'llevar';
export type EstadoReserva = 'activa' | 'liberada' | 'cancelada';

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  password_hash: string;
  rol: Rol;
  activo: boolean;
}

export interface Mesa {
  id: string;
  numero_mesa: number;
  puestos: number;
  zona: string;
  estado: EstadoMesa;
}

export interface Reserva {
  id: string;
  mesa_id: string;
  cliente_nombre: string;
  fecha_hora: string;
  nota: string;
  estado: EstadoReserva;
}

export interface Producto {
  id: string;
  nombre: string;
  precio_base: number;
  es_desechable: boolean;
  disponible: boolean;
  envase_predeterminado_id: string | null;
  categoria: string;
}

export interface Inventario {
  id: string;
  producto_id: string;
  stock_actual: number;
  stock_minimo: number;
  precio_costo: number;
  precio_venta: number;
}

export interface DetallePedido {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas: string;
}

export interface PedidoDesechable {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  subtotal: number;
}

export interface Pago {
  id: string;
  pedido_id: string;
  monto_efectivo: number;
  monto_tarjeta: number;
  monto_transferencia: number;
  total_pagado: number;
}

export interface Pedido {
  id: string;
  tipo: TipoPedido;
  mesa_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  mesero_id: string;
  estado_cocina: EstadoCocina;
  estado_pago: EstadoPago;
  total: number;
  detalles: DetallePedido[];
  desechables: PedidoDesechable[];
  pagos: Pago[];
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CajaApertura {
  id: string;
  usuario_id: string;
  monto_inicial: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_final: number | null;
}

// WebSocket events
export interface WSEvent {
  type: 'nuevo_pedido' | 'estado_cocina_actualizado' | 'mesa_liberada' | 'pedido_cobrado' | 'inventario_actualizado';
  payload: any;
  timestamp: string;
}
