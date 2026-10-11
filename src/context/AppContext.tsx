import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Usuario, Pedido, Mesa, Producto, Inventario, Reserva, CajaTurno } from '../types';
import * as db from '../db/database';
import { useAuth } from './AuthContext';

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
  // Fuente de verdad de la sesión: AuthContext (login validado contra el
  // backend SQLite vía POST /api/login). Así, al autenticar correctamente,
  // las vistas reciben el usuario y ya no quedan "en blanco".
  const { user: authUser, logout: authLogout } = useAuth();
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
    refreshData();

    // Listen for cross-tab events
    const unsubscribe = db.onEvent(() => {
      refreshData();
    });
    return unsubscribe;
  }, [refreshData]);

  // Sincronizar el usuario autenticado (backend) con el estado de la app.
  // Se busca el registro completo en el almacén local para que las vistas
  // tengan `nombre`, `activo`, etc.; si no existe, se construye uno
  // defensivo a partir de los datos del login (nunca quedar en blanco).
  useEffect(() => {
    if (!authUser) {
      setUser(null);
      return;
    }
    const local = db.getUsuarios().find(
      (u) => u.usuario.toLowerCase() === authUser.usuario.toLowerCase()
    );
    if (local) {
      setUser(local);
    } else {
      setUser({
        id: String(authUser.id),
        nombre: authUser.nombre || authUser.usuario,
        usuario: authUser.usuario,
        password_hash: '',
        rol: authUser.rol,
        activo: true,
      });
    }
  }, [authUser]);

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
    // Cierra la sesión tanto en el almacén local como en AuthContext
    // (elimina token de sessionStorage) para volver al formulario de login.
    db.logout();
    setUser(null);
    authLogout();
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
