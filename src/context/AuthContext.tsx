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

  const login = async (usuario: string, password: string): Promise<boolean> => {
    const response = await authAPI.login(usuario, password);
    if (response.success && response.data) {
      setUser(response.data.usuario);
      return true;
    }
    return false;
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
