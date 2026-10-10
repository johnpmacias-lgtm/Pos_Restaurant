const db = require('../database');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../middleware/authMiddleware');

const SALT_ROUNDS = 10;

/**
 * Login de usuario
 */
async function login(req, res) {
  const { usuario, password } = req.body;

  // Validación de entrada
  if (!usuario || !password) {
    return res.status(400).json({
      success: false,
      error: 'Usuario y contraseña son requeridos'
    });
  }

  try {
    // Buscar usuario
    const user = db.prepare(`
      SELECT id, nombre, usuario, password_hash, rol, activo
      FROM usuarios
      WHERE usuario = ? AND activo = 1
    `).get(usuario);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña con bcrypt
    const passwordValido = await bcrypt.compare(password, user.password_hash);

    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = generarToken(user);

    // Actualizar último login
    db.prepare(`
      UPDATE usuarios 
      SET actualizado_en = datetime('now')
      WHERE id = ?
    `).run(user.id);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        usuario: {
          id: user.id,
          nombre: user.nombre,
          usuario: user.usuario,
          rol: user.rol
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener perfil del usuario autenticado
 */
function obtenerPerfil(req, res) {
  try {
    const user = db.prepare(`
      SELECT id, nombre, usuario, rol, activo
      FROM usuarios
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener perfil:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Cambiar contraseña
 */
async function cambiarPassword(req, res) {
  const { password_actual, password_nueva } = req.body;

  if (!password_actual || !password_nueva) {
    return res.status(400).json({
      success: false,
      error: 'Contraseña actual y nueva son requeridas'
    });
  }

  if (password_nueva.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'La nueva contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    // Obtener usuario
    const user = db.prepare(`
      SELECT password_hash FROM usuarios WHERE id = ?
    `).get(req.user.id);

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(password_actual, user.password_hash);

    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
    }

    // Hashear nueva contraseña
    const password_hash_nueva = await bcrypt.hash(password_nueva, SALT_ROUNDS);

    // Actualizar en base de datos
    db.prepare(`
      UPDATE usuarios 
      SET password_hash = ?, actualizado_en = datetime('now')
      WHERE id = ?
    `).run(password_hash_nueva, req.user.id);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

module.exports = {
  login,
  obtenerPerfil,
  cambiarPassword,
  SALT_ROUNDS
};
