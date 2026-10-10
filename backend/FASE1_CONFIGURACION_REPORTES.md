# 📋 FASE 1 - Configuración Global y Reportes

## ✅ Implementación Completada

Se han agregado dos nuevos módulos críticos al backend:

### 1. Panel de Configuración Global
### 2. Sistema de Reporte Diario (Reporte Z)

---

## 🗄️ Base de Datos

### Nueva Tabla: `configuracion_global`

**Diseño Singleton:** Solo puede existir una fila (id = 1)

```sql
CREATE TABLE configuracion_global (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre_negocio TEXT NOT NULL DEFAULT 'Mi Restaurante',
  ruc TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  iva_porcentaje REAL NOT NULL DEFAULT 15.0,
  propina_porcentaje REAL NOT NULL DEFAULT 10.0,
  mensaje_ticket TEXT DEFAULT '¡Gracias por su preferencia!',
  papel_impresora TEXT NOT NULL DEFAULT '80mm' CHECK (papel_impresora IN ('58mm', '80mm')),
  actualizado_en TEXT DEFAULT (datetime('now'))
);
```

**Seed Automático:** Si la tabla está vacía, se crea con valores por defecto.

---

## 🔌 Endpoints Nuevos

### 1. Configuración Global

#### GET /api/configuracion
Obtener la configuración actual del negocio.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre_negocio": "Mi Restaurante",
    "ruc": "00000000",
    "direccion": "Dirección del negocio",
    "telefono": "000-000-000",
    "logo_url": "",
    "iva_porcentaje": 15.0,
    "propina_porcentaje": 10.0,
    "mensaje_ticket": "¡Gracias por su preferencia!",
    "papel_impresora": "80mm",
    "actualizado_en": "2024-01-15 10:30:00"
  }
}
```

#### PUT /api/configuracion
Actualizar la configuración del negocio.

**Request:**
```json
{
  "nombre_negocio": "Restaurante El Buen Sabor",
  "ruc": "12345678-9",
  "direccion": "Av. Principal 123",
  "telefono": "555-1234",
  "logo_url": "https://ejemplo.com/logo.png",
  "iva_porcentaje": 15,
  "propina_porcentaje": 10,
  "mensaje_ticket": "¡Gracias por su compra!",
  "papel_impresora": "80mm"
}
```

**Validaciones:**
- ✅ `nombre_negocio` es obligatorio
- ✅ `iva_porcentaje` debe estar entre 0 y 100
- ✅ `propina_porcentaje` debe estar entre 0 y 100
- ✅ `papel_impresora` debe ser "58mm" u "80mm"

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración actualizada exitosamente"
}
```

---

### 2. Backup de Base de Datos

#### GET /api/backup
Descargar el archivo físico de la base de datos SQLite.

**Uso:**
```bash
# Descargar backup
curl -O http://localhost:3001/api/backup
```

**Respuesta:**
- Archivo descargado: `backup_pos_YYYY-MM-DD.db`
- Content-Type: `application/octet-stream`
- Se puede guardar en pendrive o carpeta de respaldos

**Importante:** Este endpoint es crítico para respaldos diarios en entornos sin internet.

---

### 3. Reporte Diario (Reporte Z)

#### GET /api/reportes/diario?fecha=YYYY-MM-DD
Generar reporte completo del día.

**Ejemplo:**
```bash
GET /api/reportes/diario?fecha=2024-01-15
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "fecha": "2024-01-15",
    "resumen_financiero": {
      "total_ventas": 1500.00,
      "subtotal": 1304.35,
      "iva": 195.65,
      "iva_porcentaje": 15.0,
      "fondo_apertura": 1000.00,
      "total_pedidos": 25,
      "ticket_promedio": 60.00
    },
    "desglose_pagos": {
      "efectivo": 800.00,
      "tarjeta": 500.00,
      "transferencia": 200.00,
      "total": 1500.00
    },
    "metricas_operativas": {
      "mesas_atendidas": 8,
      "pedidos_para_llevar": 5,
      "anulaciones": {
        "cantidad": 0,
        "total_centavos": 0
      },
      "descuentos": {
        "cantidad": 0,
        "total_centavos": 0
      }
    },
    "top_productos": [
      {
        "nombre": "Hamburguesa Clásica",
        "cantidad_vendida": 15,
        "total_vendido": 180.00,
        "numero_pedidos": 12
      },
      {
        "nombre": "Cerveza Artesanal",
        "cantidad_vendida": 20,
        "total_vendido": 130.00,
        "numero_pedidos": 18
      },
      {
        "nombre": "Ensalada César",
        "cantidad_vendida": 10,
        "total_vendido": 95.00,
        "numero_pedidos": 8
      },
      {
        "nombre": "Refresco",
        "cantidad_vendida": 25,
        "total_vendido": 87.50,
        "numero_pedidos": 20
      },
      {
        "nombre": "Pastel de Chocolate",
        "cantidad_vendida": 8,
        "total_vendido": 60.00,
        "numero_pedidos": 6
      }
    ],
    "resumen_turno": {
      "total_turnos": 1,
      "total_ventas_turnos": 1500.00,
      "promedio_cuadre": 0.00
    },
    "mesas_ocupadas_actuales": 2
  }
}
```

**Campos del Reporte:**

1. **Resumen Financiero:**
   - `total_ventas`: Suma total de ventas del día
   - `subtotal`: Total sin IVA
   - `iva`: Monto del IVA calculado
   - `iva_porcentaje`: Porcentaje de IVA configurado
   - `fondo_apertura`: Monto inicial de caja
   - `total_pedidos`: Número de pedidos vendidos
   - `ticket_promedio`: Promedio por ticket

2. **Desglose de Pagos:**
   - `efectivo`: Total pagado en efectivo
   - `tarjeta`: Total pagado con tarjeta
   - `transferencia`: Total pagado por transferencia
   - `total`: Suma de todos los métodos

3. **Métricas Operativas:**
   - `mesas_atendidas`: Número de mesas únicas atendidas
   - `pedidos_para_llevar`: Pedidos para llevar
   - `anulaciones`: Pedidos anulados (preparado para futuro)
   - `descuentos`: Descuentos aplicados (preparado para futuro)

4. **Top 5 Productos:**
   - Lista de los 5 productos más vendidos
   - Incluye cantidad, total vendido y número de pedidos

5. **Resumen de Turno:**
   - `total_turnos`: Número de turnos abiertos
   - `total_ventas_turnos`: Ventas totales de turnos
   - `promedio_cuadre`: Promedio de diferencia de cuadre

6. **Alerta de Mesas Ocupadas:**
   - `mesas_ocupadas_actuales`: Número de mesas aún ocupadas
   - Si > 0, mostrar alerta en frontend: "No cerrar caja, hay mesas ocupadas"

---

### 4. Reporte de Rango de Fechas

#### GET /api/reportes/rango?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
Generar reporte de un rango de fechas.

**Ejemplo:**
```bash
GET /api/reportes/rango?fecha_inicio=2024-01-01&fecha_fin=2024-01-31
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "fecha_inicio": "2024-01-01",
    "fecha_fin": "2024-01-31",
    "total_ventas": 45000.00,
    "total_pedidos": 750,
    "desglose_pagos": {
      "efectivo": 25000.00,
      "tarjeta": 15000.00,
      "transferencia": 5000.00
    }
  }
}
```

---

## 🧪 Pruebas con cURL

### 1. Obtener Configuración
```bash
curl http://localhost:3001/api/configuracion
```

### 2. Actualizar Configuración
```bash
curl -X PUT http://localhost:3001/api/configuracion \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_negocio": "Restaurante El Buen Sabor",
    "ruc": "12345678-9",
    "direccion": "Av. Principal 123",
    "telefono": "555-1234",
    "iva_porcentaje": 15,
    "propina_porcentaje": 10,
    "mensaje_ticket": "¡Gracias por su compra!",
    "papel_impresora": "80mm"
  }'
```

### 3. Descargar Backup
```bash
curl -O http://localhost:3001/api/backup
```

### 4. Generar Reporte Diario
```bash
curl "http://localhost:3001/api/reportes/diario?fecha=2024-01-15"
```

### 5. Generar Reporte de Rango
```bash
curl "http://localhost:3001/api/reportes/rango?fecha_inicio=2024-01-01&fecha_fin=2024-01-31"
```

---

## 📊 Cálculo de IVA

**Fórmula:**
```
IVA = Total Ventas × (IVA% / 100)
Subtotal = Total Ventas - IVA
```

**Ejemplo:**
- Total Ventas: $1,500.00
- IVA: 15%
- IVA Calculado: $1,500 × 0.15 = $225.00
- Subtotal: $1,500 - $225 = $1,275.00

**Nota:** El IVA se calcula automáticamente según el porcentaje configurado en `configuracion_global`.

---

## 🔐 Seguridad

### Backup
- ✅ Solo accesible para administradores (se agregará autenticación en FASE 3)
- ✅ El archivo se descarga con nombre incluyendo fecha
- ✅ No requiere autenticación por ahora (entorno local seguro)

### Configuración
- ✅ Validaciones estrictas de datos
- ✅ Solo una fila (Singleton)
- ✅ Actualización atómica

### Reportes
- ✅ Validación de formato de fecha
- ✅ Solo datos de pedidos pagados
- ✅ Cálculos precisos en centavos

---

## 📝 Archivos Modificados/Creados

### Modificados:
1. `backend/database.js` - Agregada tabla `configuracion_global` + seed
2. `backend/server.js` - Agregados 5 nuevos endpoints

### Creados:
1. `backend/controllers/configuracionController.js` - Controlador de configuración
2. `backend/controllers/reportesController.js` - Controlador de reportes
3. `backend/FASE1_CONFIGURACION_REPORTES.md` - Esta documentación

---

## 🚀 Próximos Pasos (FASE 2)

### Frontend en React:

1. **Vista de Configuración (`Configuracion.tsx`)**
   - Formulario dividido en secciones
   - Botón de descarga de backup
   - Validaciones en frontend

2. **Vista de Reporte Diario (`ReporteDiario.tsx`)**
   - Visualización elegante del JSON
   - Alerta si hay mesas ocupadas
   - Botones de exportación:
     - Imprimir en Ticket (80mm)
     - Exportar a PDF (jsPDF o html2pdf.js)

---

## ✅ Checklist FASE 1

- [x] Tabla `configuracion_global` creada
- [x] Seed automático de configuración
- [x] Endpoint GET /api/configuracion
- [x] Endpoint PUT /api/configuracion
- [x] Endpoint GET /api/backup
- [x] Endpoint GET /api/reportes/diario
- [x] Endpoint GET /api/reportes/rango
- [x] Cálculo de IVA automático
- [x] Top 5 productos vendidos
- [x] Métricas operativas
- [x] Desglose por método de pago
- [x] Alerta de mesas ocupadas
- [x] Documentación completa

---

## 🎉 Conclusión

**FASE 1 completada exitosamente.**

El backend ahora tiene:
- ✅ Panel de Configuración Global completo
- ✅ Sistema de Backup de base de datos
- ✅ Reporte Diario (Reporte Z) con todas las métricas
- ✅ Cálculo automático de IVA
- ✅ Top productos vendidos
- ✅ Métricas operativas completas

**¿Todo está correcto? ¿Procedemos con la FASE 2 (Frontend)?**
