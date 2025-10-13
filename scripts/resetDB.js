// scripts/resetDB-complete.js
require('dotenv').config();
const { sequelize } = require('../src/models');

async function resetDatabase() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    
    console.log('🗑️  Eliminando tablas en orden correcto...');
    
    // Deshabilitar triggers de foreign keys temporalmente
    await sequelize.query('SET session_replication_role = replica;');
    
    // Eliminar tablas en orden inverso a sus dependencias
    const tables = [
      'booking_seats',
      'bookings', 
      'seats',
      'showtimes',
      'movies',
      'rooms',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Tabla ${table} eliminada`);
      } catch (error) {
        console.log(`⚠️  No se pudo eliminar ${table}: ${error.message}`);
      }
    }
    
    // Reactivar constraints
    await sequelize.query('SET session_replication_role = DEFAULT;');
    
    console.log('🔄 Creando tablas nuevas...');
    await sequelize.sync({ force: false });
    
    console.log('✅ Base de datos reseteada y tablas creadas correctamente');
    
    // Crear usuario admin por defecto
    await createDefaultAdmin();
    
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
    
    const adminExists = await User.findOne({ where: { email: 'cineconnet@gmail.com' } });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        name: 'Administrador',
        email: 'admin@cineconnect.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+502 1234-5678'
      });
      console.log('👤 Usuario admin creado: cineconnet@gmail.com / admin123');
    } else {
      console.log('👤 Usuario admin ya existe');
    }
  } catch (error) {
    console.log('⚠️  No se pudo crear usuario admin:', error.message);
  }
}

resetDatabase();