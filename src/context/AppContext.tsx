import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Usuario, Pedido, Mesa, Producto, Inventario, Reserva, CajaTurno } from '../types';
import * as db from '../db/database';

interface AppContextType {
  user: Usuario | null;
  pedidos: Pedido[];
  mesas: Mesa[];
  productos: Producto[];
  inventario: Inventario[];
  reservas: Reserva[];
  cajaTurnoActivo: CajaTurno | null;
  login: (usuario: string, password: string) => boolean;
  logout: () => void;
  refreshData: () => void;
  refreshPedidos: () => void;
  refreshMesas: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cajaTurnoActivo, setCajaTurnoActivo] = useState<CajaTurno | null>(null);

  const refreshData = useCallback(() => {
    setPedidos(db.getPedidos());
    setMesas(db.getMesas());
    setProductos(db.getProductos());
    setInventario(db.getInventario());
    setReservas(db.getReservas());
    setCajaTurnoActivo(db.getCajaTurnoActivo());
  }, []);

  const refreshPedidos = useCallback(() => {
    setPedidos(db.getPedidos());
  }, []);

  const refreshMesas = useCallback(() => {
    setMesas(db.getMesas());
  }, []);

  useEffect(() => {
    db.initializeDatabase();
    const currentUser = db.getCurrentUser();
    if (currentUser) setUser(currentUser);
    refreshData();

    // Listen for cross-tab events
    const unsubscribe = db.onEvent(() => {
      refreshData();
    });
    return unsubscribe;
  }, [refreshData]);

  const handleLogin = (usuario: string, password: string): boolean => {
    const loggedUser = db.login(usuario, password);
    if (loggedUser) {
      setUser(loggedUser);
      refreshData();
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
  };

  return (
    <AppContext.Provider value={{
      user, pedidos, mesas, productos, inventario, reservas, cajaTurnoActivo,
      login: handleLogin, logout: handleLogout,
      refreshData, refreshPedidos, refreshMesas
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
