/**
 * configuracionController.js - Controlador de Configuración Global
 * Sistema POS/KDS - Backend Local
 * 
 * FUNCIONALIDADES:
 * - Obtener configuración global (Singleton)
 * - Actualizar configuración global
 * - Descargar backup de la base de datos
 */

const db = require('../database');
const path = require('path');
const fs = require('fs');

/**
 * Obtener configuración global
 */
function obtenerConfiguracion(req, res) {
  try {
    const config = db.prepare(`
      SELECT * FROM configuracion_global WHERE id = 1
    `).get();

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        id: config.id,
        nombre_negocio: config.nombre_negocio,
        ruc: config.ruc,
        direccion: config.direccion,
        telefono: config.telefono,
        logo_url: config.logo_url,
        iva_porcentaje: config.iva_porcentaje,
        propina_porcentaje: config.propina_porcentaje,
        mensaje_ticket: config.mensaje_ticket,
        papel_impresora: config.papel_impresora,
        actualizado_en: config.actualizado_en
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener configuración:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración',
      message: error.message
    });
  }
}

/**
 * Actualizar configuración global
 */
function actualizarConfiguracion(req, res) {
  const {
    nombre_negocio,
    ruc,
    direccion,
    telefono,
    logo_url,
    iva_porcentaje,
    propina_porcentaje,
    mensaje_ticket,
    papel_impresora
  } = req.body;

  // Validaciones
  if (!nombre_negocio || nombre_negocio.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'El nombre del negocio es obligatorio'
    });
  }

  if (iva_porcentaje === undefined || iva_porcentaje < 0 || iva_porcentaje > 100) {
    return res.status(400).json({
      success: false,
      error: 'El porcentaje de IVA debe estar entre 0 y 100'
    });
  }

  if (propina_porcentaje === undefined || propina_porcentaje < 0 || propina_porcentaje > 100) {
    return res.status(400).json({
      success: false,
      error: 'El porcentaje de propina debe estar entre 0 y 100'
    });
  }

  if (papel_impresora && !['58mm', '80mm'].includes(papel_impresora)) {
    return res.status(400).json({
      success: false,
      error: 'El papel de impresora debe ser 58mm u 80mm'
    });
  }

  try {
    db.prepare(`
      UPDATE configuracion_global 
      SET 
        nombre_negocio = ?,
        ruc = ?,
        direccion = ?,
        telefono = ?,
        logo_url = ?,
        iva_porcentaje = ?,
        propina_porcentaje = ?,
        mensaje_ticket = ?,
        papel_impresora = ?,
        actualizado_en = datetime('now')
      WHERE id = 1
    `).run(
      nombre_negocio,
      ruc || '',
      direccion || '',
      telefono || '',
      logo_url || '',
      iva_porcentaje,
      propina_porcentaje,
      mensaje_ticket || '',
      papel_impresora || '80mm'
    );

    console.log('✅ Configuración actualizada correctamente');

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar configuración:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración',
      message: error.message
    });
  }
}

/**
 * Descargar backup de la base de datos
 */
function descargarBackup(req, res) {
  try {
    const dbPath = path.join(__dirname, 'pos_restaurante.db');
    
    // Verificar que el archivo existe
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({
        success: false,
        error: 'Base de datos no encontrada'
      });
    }

    // Nombre del archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `backup_pos_${fecha}.db`;

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', fs.statSync(dbPath).size);

    // Crear stream de lectura
    const fileStream = fs.createReadStream(dbPath);
    
    // Manejar errores del stream
    fileStream.on('error', (error) => {
      console.error('❌ Error al leer archivo de backup:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error al leer archivo de backup'
      });
    });

    // Pipe del archivo al response
    fileStream.pipe(res);

    console.log(`✅ Backup descargado: ${nombreArchivo}`);
  } catch (error) {
    console.error('❌ Error al descargar backup:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al descargar backup',
      message: error.message
    });
  }
}

module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
  descargarBackup
};
