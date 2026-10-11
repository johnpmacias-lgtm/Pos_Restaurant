import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, Usuario } from '../services/apiClient';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay token al cargar
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      // Obtener perfil del usuario
      authAPI.getPerfil().then(response => {
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Token inválido, limpiar
          sessionStorage.removeItem('auth_token');
        }
        setLoading(false);
      }).catch(() => {
        sessionStorage.removeItem('auth_token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Todo el flujo de autenticación pasa por la API (SQLite en el backend).
    // Ya no se leen credenciales ni sesiones desde localStorage.
    try {
      const response = await authAPI.login(username, password);

      if (response.success) {
        // Contrato estándar: { success: true, user: { id, username, rol } }
        const u = response.user;
        const legacy = response.data?.usuario;

        const rol = u?.rol ?? legacy?.rol;
        // Validación defensiva del rol: si el backend devolviera un rol
        // inesperado, App.tsx caería al login y "no dejaría ingresar".
        if (rol !== 'admin' && rol !== 'mesero' && rol !== 'cocina') {
          console.error('Rol inválido recibido del backend:', rol);
          return false;
        }

        const usuario: Usuario = {
          id: u?.id ?? legacy?.id ?? '',
          nombre: legacy?.nombre ?? u?.username ?? username,
          usuario: u?.username ?? legacy?.usuario ?? username,
          rol,
        };

        setUser(usuario);
        return true;
      }

      console.warn('Login fallido:', response.message || response.error);
      return false;
    } catch (err) {
      console.error('Error en login:', err);
      return false;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
