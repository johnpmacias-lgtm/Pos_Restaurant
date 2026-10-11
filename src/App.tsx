import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext'; // <-- 1. Importamos el AppProvider
import Login from './components/Login';
import AdminView from './views/AdminView';
import WaiterView from './views/WaiterView';
import KitchenView from './views/KitchenView';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  switch (user.rol) {
    case 'admin':
      return <AdminView />;
    case 'mesero':
      return <WaiterView />;
    case 'cocina':
      return <KitchenView />;
    default:
      return <Login />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider> {/* <-- 2. Envolvemos la aplicación aquí */}
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
