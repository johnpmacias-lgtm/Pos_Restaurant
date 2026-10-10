/**
 * apiClient.ts - Cliente API para comunicarse con el backend
 * Reemplaza localStorage y database.ts (mock local)
 */

const API_URL = 'http://localhost:3001/api';

// ============================================
// TIPOS
// ============================================

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  rol: 'admin' | 'mesero' | 'cocina';
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    usuario: Usuario;
  };
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// GESTIÓN DE TOKEN
// ============================================

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    sessionStorage.setItem('auth_token', token);
  } else {
    sessionStorage.removeItem('auth_token');
  }
}

export function getToken(): string | null {
  if (!authToken) {
    authToken = sessionStorage.getItem('auth_token');
  }
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ============================================
// FUNCIÓN BASE DE FETCH
// ============================================

async function fetchAPI<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Si el token expiró, limpiar sesión
    if (response.status === 401 || response.status === 403) {
      setToken(null);
      window.location.href = '/login';
    }

    return data;
  } catch (error) {
    console.error('❌ Error en API call:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

// ============================================
// AUTENTICACIÓN
// ============================================

export const authAPI = {
  login: async (usuario: string, password: string): Promise<LoginResponse> => {
    const response = await fetchAPI<LoginResponse['data']>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });

    if (response.success && response.data?.token) {
      setToken(response.data.token);
    }

    return response as LoginResponse;
  },

  logout: () => {
    setToken(null);
  },

  getPerfil: async () => {
    return fetchAPI<Usuario>('/auth/perfil');
  },

  cambiarPassword: async (password_actual: string, password_nueva: string) => {
    return fetchAPI('/auth/cambiar-password', {
      method: 'PUT',
      body: JSON.stringify({ password_actual, password_nueva }),
    });
  },
};

// ============================================
// PEDIDOS
// ============================================

export interface Pedido {
  id: string;
  tipo: 'mesa' | 'llevar';
  mesa_id?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  mesero_id: string;
  estado_cocina: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  estado_pago: 'pendiente' | 'pagado' | 'parcial';
  total: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  detalles?: any[];
  desechables?: any[];
  pagos?: any[];
}

export const pedidosAPI = {
  getAll: async (filtros?: {
    estado_pago?: string;
    estado_cocina?: string;
    tipo?: string;
    fecha?: string;
  }) => {
    const params = new URLSearchParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<Pedido[]>(`/pedidos${query}`);
  },

  getById: async (id: string) => {
    return fetchAPI<Pedido>(`/pedidos/${id}`);
  },

  crear: async (pedido: {
    tipo: 'mesa' | 'llevar';
    mesa_id?: string;
    cliente_nombre?: string;
    cliente_telefono?: string;
    detalles: Array<{
      producto_id: string;
      cantidad: number;
      precio_unitario: number;
      notas?: string;
    }>;
    desechables?: Array<{
      producto_id: string;
      cantidad: number;
      precio_unitario: number;
    }>;
  }) => {
    return fetchAPI('/pedidos', {
      method: 'POST',
      body: JSON.stringify(pedido),
    });
  },

  actualizarEstadoCocina: async (id: string, estado_cocina: string) => {
    return fetchAPI(`/pedidos/${id}/estado-cocina`, {
      method: 'PUT',
      body: JSON.stringify({ estado_cocina }),
    });
  },
};

// ============================================
// COBRO
// ============================================

export const cobroAPI = {
  cobrar: async (
    pedido_id: string,
    monto_efectivo: number,
    monto_tarjeta: number,
    monto_transferencia: number
  ) => {
    return fetchAPI('/cobro/cobrar', {
      method: 'POST',
      body: JSON.stringify({
        pedido_id,
        monto_efectivo,
        monto_tarjeta,
        monto_transferencia,
      }),
    });
  },

  getHistorial: async (fecha_inicio?: string, fecha_fin?: string) => {
    const params = new URLSearchParams();
    if (fecha_inicio) params.append('fecha_inicio', fecha_inicio);
    if (fecha_fin) params.append('fecha_fin', fecha_fin);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/cobro/historial${query}`);
  },

  getPendientes: async () => {
    return fetchAPI<Pedido[]>('/cobro/pendientes');
  },
};

// ============================================
// MESAS
// ============================================

export interface Mesa {
  id: string;
  numero_mesa: number;
  puestos: number;
  zona: string;
  estado: 'libre' | 'ocupada' | 'reservada';
  notas?: string;
}

export const mesasAPI = {
  getAll: async () => {
    return fetchAPI<Mesa[]>('/mesas');
  },

  actualizar: async (id: string, data: Partial<Mesa>) => {
    return fetchAPI(`/mesas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// PRODUCTOS
// ============================================

export interface Producto {
  id: string;
  nombre: string;
  precio_base: number;
  es_desechable: boolean;
  disponible: boolean;
  categoria: string;
}

export const productosAPI = {
  getAll: async () => {
    return fetchAPI<Producto[]>('/productos');
  },
};

// ============================================
// INVENTARIO
// ============================================

export interface Inventario {
  id: string;
  producto_id?: string;
  nombre: string;
  descripcion?: string;
  categoria_inventario: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  precio_costo: number;
  precio_venta: number;
}

export const inventarioAPI = {
  getAll: async (filtros?: { categoria?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.categoria) params.append('categoria', filtros.categoria);
    if (filtros?.search) params.append('search', filtros.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<Inventario[]>(`/inventario${query}`);
  },
};

// ============================================
// CAJA
// ============================================

export const cajaAPI = {
  abrir: async (monto_apertura: number) => {
    return fetchAPI('/caja/abrir', {
      method: 'POST',
      body: JSON.stringify({ monto_apertura }),
    });
  },

  cerrar: async (turno_id: string, monto_cierre_contado: number) => {
    return fetchAPI('/caja/cerrar', {
      method: 'POST',
      body: JSON.stringify({ turno_id, monto_cierre_contado }),
    });
  },

  getTurnoActivo: async () => {
    return fetchAPI('/caja/turno-activo');
  },

  getHistorial: async (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/caja/historial${query}`);
  },
};

// ============================================
// CONFIGURACIÓN
// ============================================

export const configuracionAPI = {
  get: async () => {
    return fetchAPI('/configuracion');
  },

  actualizar: async (config: any) => {
    return fetchAPI('/configuracion', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  descargarBackup: async () => {
    const token = getToken();
    const response = await fetch(`${API_URL}/backup`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar backup');
    }

    return response.blob();
  },
};

// ============================================
// REPORTES
// ============================================

export const reportesAPI = {
  getDiario: async (fecha: string) => {
    return fetchAPI(`/reportes/diario?fecha=${fecha}`);
  },

  getRango: async (fecha_inicio: string, fecha_fin: string) => {
    return fetchAPI(
      `/reportes/rango?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`
    );
  },
};

// ============================================
// RESERVAS
// ============================================

export const reservasAPI = {
  getAll: async () => {
    return fetchAPI('/reservas');
  },

  crear: async (reserva: any) => {
    return fetchAPI('/reservas', {
      method: 'POST',
      body: JSON.stringify(reserva),
    });
  },

  liberar: async (id: string) => {
    return fetchAPI(`/reservas/${id}/liberar`, {
      method: 'PUT',
    });
  },
};

// ============================================
// USUARIOS
// ============================================

export const usuariosAPI = {
  getAll: async () => {
    return fetchAPI<Usuario[]>('/usuarios');
  },

  crear: async (usuario: any) => {
    return fetchAPI('/usuarios', {
      method: 'POST',
      body: JSON.stringify(usuario),
    });
  },

  toggleActivo: async (id: string) => {
    return fetchAPI(`/usuarios/${id}/toggle-activo`, {
      method: 'PUT',
    });
  },
};
