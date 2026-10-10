const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pos-kds-secret-key-2024-change-in-production';
const JWT_EXPIRES_IN = '8h';

/**
 * Middleware para verificar token JWT
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticación requerido'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado, por favor inicie sesión nuevamente'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Token inválido'
    });
  }
}

/**
 * Middleware para verificar rol específico
 */
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para realizar esta acción'
      });
    }

    next();
  };
}

/**
 * Generar token JWT
 */
function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      usuario: usuario.usuario,
      rol: usuario.rol,
      nombre: usuario.nombre
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

module.exports = {
  verificarToken,
  verificarRol,
  generarToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
