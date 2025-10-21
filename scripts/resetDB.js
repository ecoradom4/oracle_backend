// scripts/resetDB-simple.js
require('dotenv').config();
const { sequelize } = require('../src/models');

async function resetDatabase() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    
    console.log('🗑️  Eliminando todas las tablas...');
    
    // Sincronizar con force: true elimina y recrea todas las tablas
    await sequelize.sync({ force: true });
    
    console.log('✅ Todas las tablas eliminadas y recreadas');
    
    // Crear usuario admin por defecto
    await createDefaultAdmin();
    
    console.log('✅ Base de datos reseteada completamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function createDefaultAdmin() {
  try {
    const { User } = require('../src/models');
    const bcrypt = require('bcryptjs');
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await User.create({
      name: 'Administrador',
      email: 'cineconnet@gmail.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+502 1234-5678'
    });
    console.log('👤 Usuario admin creado: admin@cineconnect.com / admin123');
  } catch (error) {
    console.log('⚠️  No se pudo crear usuario admin:', error.message);
  }
}

resetDatabase();