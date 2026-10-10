# 🚀 Guía de Inicio Rápido - Sistema POS/KDS

## 📋 Requisitos Previos

- **Node.js 18+** instalado
- **npm** o **yarn**

## 🔧 Instalación y Ejecución

### 1. Instalar Dependencias del Backend

```bash
cd backend
npm install
```

### 2. Iniciar el Servidor Backend

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El servidor se iniciará en: **http://localhost:3001**

### 3. Verificar que Funciona

Abre tu navegador en: **http://localhost:3001/api/health**

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "POS/KDS Backend",
  "version": "1.0.0"
}
```

## 🗄️ Base de Datos

La base de datos SQLite se crea automáticamente en:
```
backend/pos_restaurante.db
```

### Datos Iniciales

Al iniciar por primera vez, se crean automáticamente:

**Usuarios:**
- admin / admin123 (Administrador)
- carlos / 1234 (Mesero)
- maria / 1234 (Mesero)
- cocina / cocina123 (Cocina)

**Mesas:** 10 mesas distribuidas en Terraza, Interior, VIP y Barra

**Productos:** 15 productos de ejemplo (Platos, Bebidas, Postres, Desechables)

### Reiniciar Base de Datos

Si necesitas reiniciar la base de datos:

```bash
cd backend
rm pos_restaurante.db
npm start
```

## 🧪 Probar la API

### Usando cURL

#### 1. Abrir Caja
```bash
curl -X POST http://localhost:3001/api/caja/abrir \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": "ID_DEL_USUARIO",
    "monto_apertura": 1000
  }'
```

#### 2. Crear Pedido
```bash
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "mesa",
    "mesa_id": "ID_DE_LA_MESA",
    "mesero_id": "ID_DEL_MESERO",
    "detalles": [
      {
        "producto_id": "ID_DEL_PRODUCTO",
        "cantidad": 2,
        "precio_unitario": 50
      }
    ]
  }'
```

#### 3. Cobrar Pedido
```bash
curl -X POST http://localhost:3001/api/cobro/cobrar \
  -H "Content-Type: application/json" \
  -d '{
    "pedido_id": "ID_DEL_PEDIDO",
    "monto_efectivo": 150,
    "monto_tarjeta": 0,
    "monto_transferencia": 0
  }'
```

#### 4. Cerrar Caja
```bash
curl -X POST http://localhost:3001/api/caja/cerrar \
  -H "Content-Type: application/json" \
  -d '{
    "turno_id": "ID_DEL_TURNO",
    "monto_cierre_contado": 1500
  }'
```

### Usando Postman o Insomnia

Importa los endpoints desde la documentación del README.md

## 🔌 Probar WebSockets

### Cliente de Prueba (Node.js)

Crea un archivo `test-websocket.js`:

```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Conectado al servidor');
  console.log('Socket ID:', socket.id);
});

socket.on('nuevo_pedido', (data) => {
  console.log('📦 Nuevo pedido:', data);
});

socket.on('pedido_cobrado', (data) => {
  console.log('💰 Pedido cobrado:', data);
});

socket.on('estado_cocina_actualizado', (data) => {
  console.log('👨‍🍳 Estado cocina actualizado:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado del servidor');
});
```

Ejecuta:
```bash
npm install socket.io-client
node test-websocket.js
```

## 📊 Monitoreo

### Ver Logs del Servidor

El servidor muestra logs en tiempo real:
```
[2024-01-15T10:30:45.123Z] POST /api/cobro/cobrar
✅ Caja abierta - Turno: abc123, Usuario: Carlos, Monto: $1000
❌ Error al cobrar pedido: Este pedido ya fue pagado
```

### Ver Base de Datos

Usa cualquier cliente SQLite:
- **DB Browser for SQLite** (GUI)
- **sqlite3** (CLI)

```bash
sqlite3 backend/pos_restaurante.db

# Ver tablas
.tables

# Ver pedidos
SELECT * FROM pedidos;

# Ver turnos de caja
SELECT * FROM caja_turnos;
```

## 🐛 Solución de Problemas

### Puerto 3001 ya está en uso

```bash
# Linux/Mac
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

O cambia el puerto:
```bash
PORT=3002 npm start
```

### Error: "Cannot find module 'better-sqlite3'"

```bash
npm install
```

Si persiste:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Base de datos bloqueada

```bash
cd backend
rm pos_restaurante.db*
npm start
```

## 📱 Conectar Frontend

### Configuración del Frontend React

En tu aplicación React, configura la URL del backend:

```javascript
// src/config/api.js
export const API_URL = 'http://localhost:3001/api';
export const WS_URL = 'http://localhost:3001';
```

### Ejemplo de Uso

```javascript
// Crear pedido
const response = await fetch(`${API_URL}/pedidos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo: 'mesa',
    mesa_id: 'mesa1',
    mesero_id: 'user1',
    detalles: [...]
  })
});

// WebSocket
import { io } from 'socket.io-client';
const socket = io(WS_URL);

socket.on('pedido_cobrado', (data) => {
  console.log('Pedido cobrado:', data);
});
```

## 🎯 Próximos Pasos

### FASE 2: Refactorizar Frontend
- Dividir componentes grandes en subcomponentes
- Conectar con el backend usando fetch
- Implementar listeners de Socket.io

### FASE 3: Características Adicionales
- Autenticación JWT completa
- Reportes y estadísticas
- Impresión de tickets
- Gestión de empleados

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica que la base de datos no esté corrupta
3. Asegúrate de que el puerto 3001 esté disponible
4. Consulta el README.md del backend

---

**¡Listo para usar! 🎉**

El backend está 100% funcional y listo para conectarse con el frontend.
