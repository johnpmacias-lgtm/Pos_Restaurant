import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UtensilsCrossed, Lock, User } from 'lucide-react';

export default function Login() {
  const { login } = useApp();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const success = login(usuario, password);
      if (!success) {
        setError('Usuario o contraseña incorrectos');
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl shadow-2xl mb-4">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Restaurante POS</h1>
          <p className="text-slate-400 mt-2">Sistema de Gestión de Restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg shadow-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>

          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-slate-400 font-medium mb-2">Cuentas de prueba:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div><span className="text-orange-400">Admin:</span> admin / admin123</div>
              <div><span className="text-orange-400">Mesero:</span> carlos / 1234</div>
              <div><span className="text-orange-400">Mesera:</span> maria / 1234</div>
              <div><span className="text-orange-400">Cocina:</span> cocina / cocina123</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
