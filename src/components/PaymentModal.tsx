import React, { useState, useEffect } from 'react';
import { Pedido } from '../types';
import * as db from '../db/database';
import { X, Banknote, CreditCard, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  pedido: Pedido;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  /** Saldo pendiente real (total - pagos previos). Si no se indica, se usa el total. */
  totalPendiente?: number;
}

export default function PaymentModal({ pedido, onClose, onSuccess, title, totalPendiente }: PaymentModalProps) {
  // Saldo realmente pendiente: permite cobros parciales correctos y evita
  // que el modal pretenda cobrar $0 cuando ya fue pagado.
  const saldo = Math.max(
    0,
    Number(totalPendiente ?? pedido.total ?? 0)
  );
  const [efectivo, setEfectivo] = useState(saldo);
  const [tarjeta, setTarjeta] = useState(0);
  const [transferencia, setTransferencia] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const totalPago = efectivo + tarjeta + transferencia;
  const cambio = totalPago - saldo;
  const esValido = totalPago >= saldo && saldo > 0;

  const procesarPago = () => {
    if (saldo <= 0) {
      setError('Este pedido ya no tiene saldo pendiente.');
      return;
    }
    if (!esValido) {
      setError(`Faltan $${(saldo - totalPago).toFixed(2)}`);
      return;
    }

    const result = db.cobrarPedido(pedido.id, efectivo, tarjeta, transferencia);
    if (result.success) {
      db.emitEvent('pedido_cobrado', { pedido_id: pedido.id });
      if (pedido.tipo === 'mesa' && pedido.mesa_id) {
        db.emitEvent('mesa_liberada', { mesa_id: pedido.mesa_id });
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } else {
      setError(result.error || 'Error al procesar el pago');
    }
  };

  const quickAmounts = [
    Math.ceil(saldo),
    Math.ceil(saldo / 100) * 100,
    Math.ceil(saldo / 500) * 500,
    Math.ceil(saldo / 1000) * 1000,
  ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">{title || 'Cobrar Pedido'}</h2>
            <p className="text-slate-400 text-sm">
              {pedido.tipo === 'mesa'
                ? `Mesa ${db.getMesas().find(m => m.id === pedido.mesa_id)?.numero_mesa}`
                : `Para llevar: ${pedido.cliente_nombre}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">¡Pago Exitoso!</h3>
            <p className="text-slate-400">El pedido ha sido cobrado correctamente</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Total */}
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-sm">Total a cobrar</p>
              <p className="text-4xl font-bold text-white">${saldo.toFixed(2)}</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Métodos de pago */}
            <div className="space-y-3">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <label className="flex items-center gap-2 text-white font-medium mb-2">
                  <Banknote className="w-5 h-5 text-green-400" /> Efectivo
                </label>
                <input
                  type="number"
                  value={efectivo || ''}
                  onChange={e => { setEfectivo(Number(e.target.value)); setError(''); }}
                  className="w-full bg-slate-600 border border-slate-500 rounded-lg px-4 py-3 text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="bg-slate-700/50 rounded-xl p-4">
                <label className="flex items-center gap-2 text-white font-medium mb-2">
                  <CreditCard className="w-5 h-5 text-blue-400" /> Tarjeta
                </label>
                <input
                  type="number"
                  value={tarjeta || ''}
                  onChange={e => { setTarjeta(Number(e.target.value)); setError(''); }}
                  className="w-full bg-slate-600 border border-slate-500 rounded-lg px-4 py-3 text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="bg-slate-700/50 rounded-xl p-4">
                <label className="flex items-center gap-2 text-white font-medium mb-2">
                  <Smartphone className="w-5 h-5 text-purple-400" /> Transferencia
                </label>
                <input
                  type="number"
                  value={transferencia || ''}
                  onChange={e => { setTransferencia(Number(e.target.value)); setError(''); }}
                  className="w-full bg-slate-600 border border-slate-500 rounded-lg px-4 py-3 text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount, i) => (
                <button
                  key={i}
                  onClick={() => { setEfectivo(amount); setTarjeta(0); setTransferencia(0); setError(''); }}
                  className="bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold py-2 rounded-lg"
                >
                  ${amount.toFixed(0)}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-slate-900/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Total pagado:</span>
                <span className={`font-bold ${esValido ? 'text-green-400' : 'text-red-400'}`}>
                  ${totalPago.toFixed(2)}
                </span>
              </div>
              {cambio > 0 && (
                <div className="flex justify-between text-green-400 font-bold border-t border-slate-700 pt-2">
                  <span>Cambio:</span>
                  <span>${cambio.toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              onClick={procesarPago}
              disabled={!esValido}
              className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors"
            >
              Confirmar Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
