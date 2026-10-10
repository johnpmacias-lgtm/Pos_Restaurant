import React, { useState } from 'react';
import * as db from '../db/database';
import { Wallet, Lock, AlertCircle } from 'lucide-react';

interface CashRegisterOpenModalProps {
  usuarioId: string;
  onOpened: () => void;
}

export default function CashRegisterOpenModal({ usuarioId, onOpened }: CashRegisterOpenModalProps) {
  const [monto, setMonto] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    if (monto < 0) {
      setError('El monto no puede ser negativo');
      return;
    }
    if (monto === 0 && !confirm('¿Desea abrir la caja con monto inicial de $0?')) {
      return;
    }

    setLoading(true);
    try {
      db.abrirCajaTurno(usuarioId, monto);
      db.emitEvent('caja_abierta', { monto });
      onOpened();
    } catch (err: any) {
      setError(err.message || 'Error al abrir la caja');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Apertura de Caja Requerida</h2>
          <p className="text-slate-400 text-sm">
            No hay una caja abierta. Para continuar, debe registrar el fondo de caja inicial.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200 text-sm font-medium">Acción Obligatoria</p>
              <p className="text-yellow-200/70 text-xs mt-1">
                El módulo de caja requiere un turno abierto. Ingrese el monto en efectivo disponible al inicio del turno.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Fondo de Caja Inicial (Efectivo)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">$</span>
              <input
                type="number"
                value={monto || ''}
                onChange={e => { setMonto(Number(e.target.value)); setError(''); }}
                className="w-full pl-10 pr-4 py-4 bg-slate-700 border border-slate-600 rounded-xl text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="0.00"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2000, 3000, 5000, 10000].map(amount => (
              <button
                key={amount}
                onClick={() => { setMonto(amount); setError(''); }}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2 rounded-lg transition-colors"
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpen}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>

          <p className="text-center text-slate-500 text-xs">
            Este monto será el fondo inicial del turno. Se sumará al cierre.
          </p>
        </div>
      </div>
    </div>
  );
}
