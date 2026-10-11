import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, Usuario } from '../services/apiClient';
import * as db from '../db/database';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Limpia por completo la sesión persistida (localStorage y sessionStorage). */
export function clearPersistedSession(): void {
  try {
    localStorage.removeItem('pos_session');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
  } catch {
    // entorno sin storage: nada que limpiar
  }
}

/** Guarda la sesión en sessionStorage (sobrevive F5 pero NO a cerrar el navegador). */
function persistSession(usuario: Usuario): void {
  try {
    const token = sessionStorage.getItem('auth_token');
    sessionStorage.setItem(
      'auth_user',
      JSON.stringify({ ...usuario, rol: String(usuario.rol ?? '').toLowerCase() })
    );
    if (!token) {
      // Sin token, getPerfil() fallará al restaurar: se guarda uno local para
      // que el refresh no devuelva al login (el backend lo rechazará con
      // seguridad y se limpiará solo si es inválido tras reintentar /perfil).
      sessionStorage.setItem('auth_token', 'local_' + Math.random().toString(36).slice(2));
    }
  } catch {
    // almacenamiento lleno o bloqueado: la sesión vive al menos en memoria
  }
}

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
          persistSession(response.data);
        } else {
          // Backend respondió "no válido": ¿era un fallo de red/CORS (respuesta
          // sintética sin estado HTTP real)? Entonces NO borramos la sesión,
          // para no expulsar al usuario recién autenticado.
          const synthetic = typeof (response as any).status !== 'number' || (response as any).status === 0;
          if (synthetic) {
            const saved = sessionStorage.getItem('auth_user');
            if (saved) {
              try {
                const u = JSON.parse(saved);
                if (u && u.rol) {
                  setUser(u);
                  setLoading(false);
                  return;
                }
              } catch { /* sesión corrupta: se limpia abajo */ }
            }
          }
          // Token inválido de verdad, limpiar
          clearPersistedSession();
        }
        setLoading(false);
      }).catch(() => {
        // El backend está caído: restaurar última sesión conocida si existe.
        const saved = sessionStorage.getItem('auth_user');
        let restored = false;
        if (saved) {
          try {
            const u = JSON.parse(saved);
            if (u && u.rol) { setUser(u); restored = true; }
          } catch { /* ignorar */ }
        }
        if (!restored) clearPersistedSession();
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

        const rol = String(u?.rol ?? legacy?.rol ?? '').toLowerCase();
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
        persistSession(usuario);
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
    // 1) Backend (limpia token en memoria + sessionStorage['auth_token'])
    try { authAPI.logout(); } catch (e) { console.warn('authAPI.logout:', e); }
    // 2) Almacén local heredado (localStorage pos_session, tokens antiguos)
    try { db.logout(); } catch (e) { console.warn('db.logout:', e); }
    // 3) Cualquier resto de sesión persistida (auth_user, localStorage, etc.)
    clearPersistedSession();
    // 4) Estado en memoria -> App.tsx renderiza <Login /> inmediatamente
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
