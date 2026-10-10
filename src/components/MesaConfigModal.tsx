import React, { useState } from 'react';
import { Mesa } from '../types';
import * as db from '../db/database';
import { X, Save, MapPin, Users, FileText } from 'lucide-react';

interface MesaConfigModalProps {
  mesa: Mesa;
  onClose: () => void;
  onSave: () => void;
}

export default function MesaConfigModal({ mesa, onClose, onSave }: MesaConfigModalProps) {
  const [puestos, setPuestos] = useState(mesa.puestos);
  const [zona, setZona] = useState(mesa.zona);
  const [notas, setNotas] = useState(mesa.notas || '');

  const zonas = ['Terraza', 'Interior', 'VIP', 'Barra'];

  const handleSave = () => {
    const mesas = db.getMesas();
    const idx = mesas.findIndex(m => m.id === mesa.id);
    if (idx >= 0) {
      mesas[idx].puestos = puestos;
      mesas[idx].zona = zona;
      mesas[idx].notas = notas;
      localStorage.setItem('pos_mesas', JSON.stringify(mesas));
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white text-lg font-bold w-12 h-12 flex items-center justify-center rounded-xl">
              {mesa.numero_mesa}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Configurar Mesa {mesa.numero_mesa}</h2>
              <p className="text-slate-400 text-sm">Ajusta las propiedades de esta mesa</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <Users className="w-4 h-4" /> Puestos (Capacidad)
            </label>
            <input
              type="number"
              value={puestos}
              onChange={e => setPuestos(Number(e.target.value))}
              min="1"
              max="20"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <MapPin className="w-4 h-4" /> Ubicación / Zona
            </label>
            <select
              value={zona}
              onChange={e => setZona(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {zonas.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <FileText className="w-4 h-4" /> Notas (Opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Mesa cerca de la ventana, preferida para parejas..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar Cambios
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
