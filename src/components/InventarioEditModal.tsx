import React, { useState } from 'react';
import { Inventario } from '../types';
import * as db from '../db/database';
import { X, Save } from 'lucide-react';

interface InventarioEditModalProps {
  insumo: Inventario;
  onClose: () => void;
  onSave: () => void;
}

export default function InventarioEditModal({ insumo, onClose, onSave }: InventarioEditModalProps) {
  const [formData, setFormData] = useState({
    nombre: insumo.nombre,
    descripcion: insumo.descripcion,
    categoria: insumo.categoria,
    unidad_medida: insumo.unidad_medida,
    stock_actual: insumo.stock_actual,
    stock_minimo: insumo.stock_minimo,
    precio_costo: insumo.precio_costo,
    precio_venta: insumo.precio_venta,
  });

  const handleSave = () => {
    if (!formData.nombre || !formData.categoria) {
      alert('Nombre y Categoría son obligatorios');
      return;
    }
    
    db.updateInventario({
      ...insumo,
      ...formData,
    });
    
    // También actualizar el producto asociado si existe
    const productos = db.getProductos();
    const prodIdx = productos.findIndex(p => p.id === insumo.producto_id);
    if (prodIdx >= 0) {
      productos[prodIdx].nombre = formData.nombre;
      productos[prodIdx].categoria = formData.categoria;
      productos[prodIdx].precio_base = formData.precio_venta;
      localStorage.setItem('pos_productos', JSON.stringify(productos));
    }
    
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Editar Insumo</h2>
            <p className="text-slate-400 text-sm">Modifica los datos del insumo</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Descripción</label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Categoría *</label>
              <select
                value={formData.categoria}
                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Carnes y aves">Carnes y aves</option>
                <option value="Pescados y mariscos">Pescados y mariscos</option>
                <option value="Frutas y verduras">Frutas y verduras</option>
                <option value="Lácteos y huevos">Lácteos y huevos</option>
                <option value="Abarrotes y secos">Abarrotes y secos</option>
                <option value="Aceites, salsas y condimentos">Aceites, salsas y condimentos</option>
                <option value="Bebidas e insumos líquidos">Bebidas e insumos líquidos</option>
                <option value="Congelados">Congelados</option>
                <option value="Descartables y suministros">Descartables y suministros</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Unidad de Medida *</label>
              <select
                value={formData.unidad_medida}
                onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Unidades">Unidades</option>
                <option value="Kg">Kilogramos (Kg)</option>
                <option value="Litros">Litros</option>
                <option value="Gramos">Gramos</option>
                <option value="Porciones">Porciones</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Stock Actual</label>
              <input
                type="number"
                value={formData.stock_actual}
                onChange={e => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Stock Mínimo</label>
              <input
                type="number"
                value={formData.stock_minimo}
                onChange={e => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Precio Costo</label>
              <input
                type="number"
                value={formData.precio_costo}
                onChange={e => setFormData({ ...formData, precio_costo: Number(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Precio Venta</label>
              <input
                type="number"
                value={formData.precio_venta}
                onChange={e => setFormData({ ...formData, precio_venta: Number(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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
