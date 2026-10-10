/**
 * migratePasswords.js - Script para migrar contraseñas a bcrypt
 * Ejecutar UNA VEZ después de crear la base de datos
 * 
 * Uso: node migratePasswords.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pos_restaurante.db');
const db = new Database(DB_PATH);

const SALT_ROUNDS = 10;

// Contraseñas por defecto para los usuarios iniciales
const usuariosDefault = [
  { usuario: 'admin', password: 'admin123' },
  { usuario: 'carlos', password: '1234' },
  { usuario: 'maria', password: '1234' },
  { usuario: 'cocina', password: 'cocina123' }
];

console.log('🔐 Migrando contraseñas a bcrypt...\n');

const migrateTransaction = db.transaction(() => {
  for (const { usuario, password } of usuariosDefault) {
    // Buscar usuario
    const user = db.prepare('SELECT id, usuario FROM usuarios WHERE usuario = ?').get(usuario);
    
    if (!user) {
      console.log(`⚠️  Usuario "${usuario}" no encontrado, omitiendo`);
      continue;
    }

    // Hashear contraseña
    const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);

    // Actualizar en base de datos
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(password_hash, user.id);

    console.log(`✅ Contraseña de "${usuario}" actualizada con bcrypt`);
  }
});

try {
  migrateTransaction();
  console.log('\n✅ Migración completada exitosamente');
  console.log('\n📝 Contraseñas por defecto:');
  console.log('   - admin / admin123');
  console.log('   - carlos / 1234');
  console.log('   - maria / 1234');
  console.log('   - cocina / cocina123');
  console.log('\n⚠️  IMPORTANTE: Cambie estas contraseñas en producción');
} catch (error) {
  console.error('❌ Error durante la migración:', error.message);
  process.exit(1);
}

db.close();
