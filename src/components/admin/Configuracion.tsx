import React, { useState, useEffect } from 'react';
import { Save, Download, Building2, Receipt, Printer, AlertCircle, CheckCircle } from 'lucide-react';

interface Configuracion {
  id: number;
  nombre_negocio: string;
  ruc: string;
  direccion: string;
  telefono: string;
  logo_url: string;
  iva_porcentaje: number;
  propina_porcentaje: number;
  mensaje_ticket: string;
  papel_impresora: '58mm' | '80mm';
  actualizado_en: string;
}

export default function Configuracion() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/configuracion');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('http://localhost:3001/api/configuracion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
        cargarConfiguracion();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleDescargarBackup = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/backup');
      
      if (!response.ok) {
        throw new Error('Error al descargar el backup');
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_pos_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Backup descargado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al descargar el backup' });
    }
  };

  const handleChange = (field: keyof Configuracion, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Cargando configuración...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error al cargar la configuración</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Configuración del Sistema</h2>
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className={message.type === 'success' ? 'text-green-200' : 'text-red-200'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Sección: Datos del Negocio */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Datos del Negocio</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Nombre del Negocio *
            </label>
            <input
              type="text"
              value={config.nombre_negocio}
              onChange={(e) => handleChange('nombre_negocio', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mi Restaurante"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              RUC / Identificación Fiscal
            </label>
            <input
              type="text"
              value={config.ruc}
              onChange={(e) => handleChange('ruc', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="00000000-0"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={config.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Av. Principal 123"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Teléfono
            </label>
            <input
              type="text"
              value={config.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="555-1234"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              URL del Logo
            </label>
            <input
              type="text"
              value={config.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>
        </div>
      </div>

      {/* Sección: Facturación e Impuestos */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-bold text-white">Facturación e Impuestos</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Porcentaje de IVA (%)
            </label>
            <input
              type="number"
              value={config.iva_porcentaje}
              onChange={(e) => handleChange('iva_porcentaje', parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Porcentaje de Propina Sugerida (%)
            </label>
            <input
              type="number"
              value={config.propina_porcentaje}
              onChange={(e) => handleChange('propina_porcentaje', parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Sección: Impresión */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Printer className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Impresión</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Tamaño de Papel de Impresora
            </label>
            <select
              value={config.papel_impresora}
              onChange={(e) => handleChange('papel_impresora', e.target.value as '58mm' | '80mm')}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="80mm">80mm (Estándar)</option>
              <option value="58mm">58mm (Compacto)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Mensaje en Ticket
            </label>
            <textarea
              value={config.mensaje_ticket}
              onChange={(e) => handleChange('mensaje_ticket', e.target.value)}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="¡Gracias por su preferencia!"
            />
          </div>
        </div>
      </div>

      {/* Sección: Sistema / Seguridad */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Sistema / Seguridad</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Respaldo de Base de Datos</h4>
            <p className="text-slate-400 text-sm mb-4">
              Descarga una copia completa de la base de datos para guardar en un pendrive o carpeta de respaldos.
              Se recomienda realizar este respaldo diariamente.
            </p>
            <button
              onClick={handleDescargarBackup}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Descargar Respaldo (Backup)
            </button>
          </div>

          <div className="text-slate-400 text-sm">
            <p>Última actualización: {new Date(config.actualizado_en).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
