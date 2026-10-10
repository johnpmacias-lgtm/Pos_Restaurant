-- =====================================================
-- SISTEMA POS/KDS - ESTRUCTURA DE BASE DE DATOS
-- Corrección: Separación de categorías Menú vs Inventario
-- =====================================================

-- =====================================================
-- TABLA: productos (MENÚ)
-- Categorías del MENÚ: Platos, Bebidas, Postres, Desechables
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    es_desechable BOOLEAN DEFAULT FALSE,
    disponible BOOLEAN DEFAULT TRUE,
    envase_predeterminado_id VARCHAR(36) NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Platos', 'Bebidas', 'Postres', 'Desechables')),
    FOREIGN KEY (envase_predeterminado_id) REFERENCES productos(id)
);

-- Índice para búsqueda rápida por categoría del menú
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_disponible ON productos(disponible);

-- =====================================================
-- TABLA: inventario (INSUMOS)
-- Categorías del INVENTARIO: 9 categorías estrictas
-- NO tiene relación directa con la tabla productos.categoria
-- =====================================================
CREATE TABLE IF NOT EXISTS inventario (
    id VARCHAR(36) PRIMARY KEY,
    producto_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria_inventario VARCHAR(100) NOT NULL CHECK (categoria_inventario IN (
        'Carnes y aves',
        'Pescados y mariscos',
        'Frutas y verduras',
        'Lácteos y huevos',
        'Abarrotes y secos',
        'Aceites, salsas y condimentos',
        'Bebidas e insumos líquidos',
        'Congelados',
        'Descartables y suministros'
    )),
    unidad_medida VARCHAR(50) NOT NULL CHECK (unidad_medida IN ('Unidades', 'Kg', 'Litros', 'Gramos', 'Porciones')),
    stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_costo DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX idx_inventario_categoria ON inventario(categoria_inventario);
CREATE INDEX idx_inventario_stock ON inventario(stock_actual);
CREATE INDEX idx_inventario_nombre ON inventario(nombre);

-- =====================================================
-- MIGRACIÓN: Si ya existe la tabla inventario con columna 'categoria'
-- =====================================================

-- Para SQLite:
-- SQLite no soporta ALTER TABLE DROP COLUMN en versiones antiguas
-- Solución: Recrear la tabla

-- Paso 1: Crear tabla temporal
CREATE TABLE inventario_temp (
    id VARCHAR(36) PRIMARY KEY,
    producto_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria_inventario VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(50) NOT NULL,
    stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_costo DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- Paso 2: Migrar datos (mapeo de categorías)
INSERT INTO inventario_temp (id, producto_id, nombre, descripcion, categoria_inventario, unidad_medida, stock_actual, stock_minimo, precio_costo, precio_venta)
SELECT 
    id,
    producto_id,
    nombre,
    descripcion,
    CASE 
        WHEN categoria = 'Platos' THEN 'Carnes y aves'
        WHEN categoria = 'Bebidas' THEN 'Bebidas e insumos líquidos'
        WHEN categoria = 'Postres' THEN 'Lácteos y huevos'
        WHEN categoria = 'Desechables' THEN 'Descartables y suministros'
        WHEN categoria IN ('Carnes y aves', 'Pescados y mariscos', 'Frutas y verduras', 
                          'Lácteos y huevos', 'Abarrotes y secos', 'Aceites, salsas y condimentos',
                          'Bebidas e insumos líquidos', 'Congelados', 'Descartables y suministros') 
            THEN categoria
        ELSE 'Abarrotes y secos'
    END as categoria_inventario,
    unidad_medida,
    stock_actual,
    stock_minimo,
    precio_costo,
    precio_venta
FROM inventario;

-- Paso 3: Eliminar tabla original
DROP TABLE inventario;

-- Paso 4: Renombrar tabla temporal
ALTER TABLE inventario_temp RENAME TO inventario;

-- Paso 5: Recrear índices
CREATE INDEX idx_inventario_categoria ON inventario(categoria_inventario);
CREATE INDEX idx_inventario_stock ON inventario(stock_actual);
CREATE INDEX idx_inventario_nombre ON inventario(nombre);

-- =====================================================
-- Para PostgreSQL (más simple):
-- =====================================================

-- ALTER TABLE inventario RENAME COLUMN categoria TO categoria_old;
-- ALTER TABLE inventario ADD COLUMN categoria_inventario VARCHAR(100);
-- 
-- UPDATE inventario SET categoria_inventario = 
--     CASE 
--         WHEN categoria_old = 'Platos' THEN 'Carnes y aves'
--         WHEN categoria_old = 'Bebidas' THEN 'Bebidas e insumos líquidos'
--         WHEN categoria_old = 'Postres' THEN 'Lácteos y huevos'
--         WHEN categoria_old = 'Desechables' THEN 'Descartables y suministros'
--         WHEN categoria_old IN ('Carnes y aves', 'Pescados y mariscos', 'Frutas y verduras', 
--                               'Lácteos y huevos', 'Abarrotes y secos', 'Aceites, salsas y condimentos',
--                               'Bebidas e insumos líquidos', 'Congelados', 'Descartables y suministros') 
--             THEN categoria_old
--         ELSE 'Abarrotes y secos'
--     END;
-- 
-- ALTER TABLE inventario DROP COLUMN categoria_old;
-- ALTER TABLE inventario ALTER COLUMN categoria_inventario SET NOT NULL;
-- 
-- CREATE INDEX idx_inventario_categoria ON inventario(categoria_inventario);

-- =====================================================
-- EJEMPLOS DE CONSULTAS
-- =====================================================

-- Obtener todos los insumos de una categoría específica del inventario
SELECT * FROM inventario WHERE categoria_inventario = 'Carnes y aves';

-- Buscar insumos por nombre (case insensitive)
SELECT * FROM inventario WHERE LOWER(nombre) LIKE LOWER('%pollo%');

-- Obtener categorías únicas del inventario (para filtros)
SELECT DISTINCT categoria_inventario FROM inventario ORDER BY categoria_inventario;

-- Obtener productos del menú (NO inventario)
SELECT * FROM productos WHERE categoria = 'Platos' AND disponible = TRUE;

-- Obtener insumos con stock bajo
SELECT * FROM inventario WHERE stock_actual <= stock_minimo;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
