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
  // `ensureLocalUsuario` crea/recupera el registro local correspondiente al
  // usuario del backend: las vistas necesitan un id local ESTABLE, porque los
  // pedidos/mesas/caja guardan referencias a ese id. Usar un objeto desalineado
  // (o nulo) provocaba "user is null" y fallos al cobrar/cerrar sesión.
  useEffect(() => {
    if (!authUser) {
      setUser(null);
      return;
    }
    try {
      db.initializeDatabase();
      const local = db.ensureLocalUsuario({
        id: String(authUser.id ?? ''),
        username: authUser.usuario,
        rol: authUser.rol,
      });
      setUser(local);
    } catch (err) {
      console.error('Error al sincronizar usuario local:', err);
      // Nunca quedar en blanco: fallback defensivo con los datos del login.
      setUser({
        id: String(authUser.id ?? 'invitado'),
        nombre: authUser.nombre || authUser.usuario,
        usuario: authUser.usuario,
        password_hash: '',
        rol: authUser.rol,
        activo: true,
      });
    }
  }, [authUser]);

  const handleLogin = (usuario: string, password: string): boolean => {
    // Obsoleto: la autenticación real pasa por AuthContext/API (SQLite).
    // Se mantiene por compatibilidad con llamadas antiguas.
    const loggedUser = db.login(usuario, password);
    if (loggedUser) {
      setUser(loggedUser);
      refreshData();
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    // Delegar SIEMPRE en AuthContext.logout(): es el que limpia token,
    // sessionStorage y localStorage por completo y pone user=null, lo que
    // hace que App.tsx muestre el Login. Antes aquí se hacía setUser(null)
    // manual y quedaban restos de sesión que "revivían" al usuario, por lo
    // que parecía que no se podía cerrar sesión.
    authLogout();
    setUser(null);
    refreshData();
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
