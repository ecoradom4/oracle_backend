// scripts/initDB.js
require('dotenv').config();
const { sequelize } = require('../src/models');

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // Crear tablas si no existen (pero sin alterar)
    await sequelize.sync({ force: false }); // force: false evita eliminar datos existentes
    console.log('✅ Base de datos inicializada correctamente');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
}

initializeDatabase();