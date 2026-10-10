# POS/KDS Backend - Sistema de Restaurante

Backend local (On-Premise) para el Sistema de Gestión de Restaurante POS/KDS.

## 🏗️ Arquitectura

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Base de Datos:** SQLite (better-sqlite3) con modo WAL
- **WebSockets:** Socket.io
- **Autenticación:** JWT + bcrypt

## 📦 Instalación

```bash
cd backend
npm install
```

## 🚀 Ejecución

### Desarrollo (con auto-reload)
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Inicializar base de datos con datos de prueba
```bash
npm run seed
```

## 🔌 Endpoints de la API

### Salud
- `GET /api/health` - Verificar estado del servidor

### Cobro
- `POST /api/cobro/cobrar` - Cobrar un pedido
- `GET /api/cobro/historial` - Historial de pagos
- `GET /api/cobro/pendientes` - Pedidos pendientes de pago

### Caja
- `POST /api/caja/abrir` - Abrir caja (crear turno)
- `POST /api/caja/cerrar` - Cerrar caja (calcular cuadre)
- `GET /api/caja/turno-activo` - Obtener turno activo
- `GET /api/caja/historial` - Historial de turnos

### Pedidos
- `GET /api/pedidos` - Listar pedidos
- `GET /api/pedidos/:id` - Obtener pedido específico
- `POST /api/pedidos` - Crear nuevo pedido
- `PUT /api/pedidos/:id/estado-cocina` - Actualizar estado de cocina

### Mesas
- `GET /api/mesas` - Listar mesas
- `PUT /api/mesas/:id` - Actualizar mesa

### Productos e Inventario
- `GET /api/productos` - Listar productos
- `GET /api/inventario` - Listar inventario

## 💾 Base de Datos

### Tablas Principales

1. **usuarios** - Usuarios del sistema (admin, mesero, cocina)
2. **mesas** - Mesas del restaurante
3. **productos** - Menú de productos
4. **inventario** - Insumos y stock
5. **pedidos** - Pedidos de clientes
6. **detalles_pedido** - Items de cada pedido
7. **pedido_desechables** - Desechables del pedido
8. **pagos** - Registro de pagos
9. **caja_turnos** - Turnos de caja
10. **reservas** - Reservas de mesas

### Características de la Base de Datos

- **Modo WAL (Write-Ahead Logging):** Permite lecturas concurrentes mientras se escribe
- **Transacciones SQL:** Garantiza atomicidad en operaciones críticas (cobro, cierre de caja)
- **Montos en Centavos:** Todos los montos se almacenan como INTEGER (centavos) para evitar errores de precisión
- **Índices Optimizados:** Índices en columnas de búsqueda frecuente

## 🔐 Seguridad

### Prevención de Doble Cobro

El endpoint `/api/cobro/cobrar` incluye validaciones críticas:

1. **Verifica estado del pedido:** Si ya está pagado, rechaza la operación
2. **Transacción SQL:** Toda la operación (cobro + descuento de inventario) es atómica
3. **Validación de stock:** Verifica que haya suficiente inventario antes de descontar
4. **Montos en centavos:** Evita errores de precisión con números decimales

### Ejemplo de Respuesta de Cobro Exitoso

```json
{
  "success": true,
  "message": "Pedido cobrado exitosamente",
  "data": {
    "pedido_id": "abc123",
    "estado_pago": "pagado",
    "total_pedido": 120.00,
    "total_pagado": 150.00,
    "cambio": 30.00,
    "pago_id": "xyz789"
  }
}
```

### Ejemplo de Error por Doble Cobro

```json
{
  "success": false,
  "error": "Este pedido ya fue pagado. No se puede cobrar dos veces."
}
```

## 🔌 WebSockets (Socket.io)

### Eventos Emitidos por el Servidor

- `nuevo_pedido` - Cuando se crea un pedido
- `pedido_cobrado` - Cuando se cobra un pedido
- `estado_cocina_actualizado` - Cuando cambia el estado de cocina
- `mesa_liberada` - Cuando se libera una mesa

### Eventos que Escucha el Servidor

- `unirse_sala` - Unirse a una sala específica
- `estado_cocina_actualizado` - Cocina actualiza estado
- `mesa_liberada` - Mesa es liberada

### Ejemplo de Conexión desde el Frontend

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Escuchar eventos
socket.on('pedido_cobrado', (data) => {
  console.log('Pedido cobrado:', data);
});

socket.on('nuevo_pedido', (data) => {
  console.log('Nuevo pedido:', data);
});

// Emitir eventos
socket.emit('estado_cocina_actualizado', {
  pedido_id: 'abc123',
  estado: 'preparando'
});
```

## 📊 Flujo de Trabajo

### 1. Apertura de Caja
```
POST /api/caja/abrir
{
  "usuario_id": "user123",
  "monto_apertura": 1000.00
}
```

### 2. Crear Pedido
```
POST /api/pedidos
{
  "tipo": "mesa",
  "mesa_id": "mesa1",
  "mesero_id": "user123",
  "detalles": [
    {
      "producto_id": "prod1",
      "cantidad": 2,
      "precio_unitario": 50.00
    }
  ]
}
```

### 3. Cobrar Pedido
```
POST /api/cobro/cobrar
{
  "pedido_id": "pedido123",
  "monto_efectivo": 100.00,
  "monto_tarjeta": 0,
  "monto_transferencia": 0
}
```

### 4. Cierre de Caja
```
POST /api/caja/cerrar
{
  "turno_id": "turno123",
  "monto_cierre_contado": 1500.00
}
```

Respuesta incluye el cuadre:
```json
{
  "success": true,
  "data": {
    "resumen": {
      "monto_apertura": 1000.00,
      "total_ventas": 500.00,
      "total_efectivo": 400.00,
      "total_tarjeta": 100.00,
      "esperado_en_caja": 1400.00,
      "monto_cierre_contado": 1500.00,
      "cuadre_diferencia": 100.00,
      "cuadre_estado": "SOBRANTE"
    }
  }
}
```

## 🧪 Usuarios de Prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| carlos | 1234 | Mesero |
| maria | 1234 | Mesero |
| cocina | cocina123 | Cocina |

## 📝 Notas Importantes

### Montos en Centavos

**IMPORTANTE:** Todos los montos en la base de datos se almacenan en **centavos** (INTEGER) para evitar errores de precisión con números de punto flotante.

**Conversión:**
- De pesos a centavos: `Math.round(pesos * 100)`
- De centavos a pesos: `centavos / 100`

**Ejemplo:**
- $120.50 → 12050 centavos
- 12050 centavos → $120.50

### Transacciones SQL

Las operaciones críticas usan transacciones SQL para garantizar atomicidad:

```javascript
const transaction = db.transaction(() => {
  // 1. Validar pedido
  // 2. Validar stock
  // 3. Descontar inventario
  // 4. Registrar pago
  // 5. Actualizar estado
});

transaction(); // Si algo falla, todo se revierte
```

### Categorías Separadas

- **Productos (Menú):** Platos, Bebidas, Postres, Desechables
- **Inventario (Insumos):** 9 categorías específicas (Carnes y aves, Pescados y mariscos, etc.)

Las categorías están completamente separadas para evitar confusión.

## 🔧 Configuración

### Variables de Entorno

```bash
PORT=3001                    # Puerto del servidor
NODE_ENV=production          # Entorno (development/production)
```

### Configuración de SQLite

El archivo `database.js` configura SQLite con:
- Modo WAL para concurrencia
- Foreign keys habilitadas
- Cache de 64MB
- Synchronous NORMAL para balance entre seguridad y rendimiento

## 📂 Estructura del Proyecto

```
backend/
├── server.js              # Servidor principal
├── database.js            # Inicialización de SQLite
├── controllers/
│   ├── cobroController.js # Lógica de cobro
│   └── cajaController.js  # Lógica de caja
├── pos_restaurante.db     # Base de datos SQLite (se crea automáticamente)
├── package.json
└── README.md
```

## 🚨 Solución de Problemas

### Error: "Ya existe un turno de caja abierto"
- Solo puede haber un turno abierto a la vez
- Cierra el turno actual antes de abrir uno nuevo

### Error: "Este pedido ya fue pagado"
- El sistema previene doble cobro
- Verifica el estado del pedido antes de cobrar

### Error: "Stock insuficiente"
- Verifica el inventario antes de cobrar
- Ajusta el stock si es necesario

### Base de datos bloqueada
- Modo WAL permite lecturas concurrentes
- Si hay problemas, reinicia el servidor

## 📄 Licencia

MIT

## 👨‍💻 Desarrollo

Para contribuir:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

**Desarrollado para uso On-Premise (Servidor Local)**
**No requiere conexión a internet para funcionar**
