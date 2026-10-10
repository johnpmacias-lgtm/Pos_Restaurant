import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import AdminView from './views/AdminView';
import WaiterView from './views/WaiterView';
import KitchenView from './views/KitchenView';

function AppContent() {
  const { user } = useApp();

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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
