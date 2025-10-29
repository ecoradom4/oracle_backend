// scripts/init-oracle.js
const models = require('../src/models');

const initializeDatabase = async () => {
  try {
    // Probar conexión
    console.log('🔄 Probando conexión a Oracle Cloud...');
    await models.testConnection();

    // Sincronizar modelos (crear tablas)
    console.log('🔄 Sincronizando modelos con la base de datos...');
    await models.sequelize.sync({ 
      force: false, // Cambia a true si quieres recrear las tablas (¡CUIDADO: borra datos!)
      alter: true   // Modifica las tablas existentes para que coincidan con los modelos
    });

    console.log('✅ Base de datos inicializada correctamente');
    
    // Verificar tablas creadas
    const [tables] = await models.sequelize.query(
      "SELECT table_name FROM user_tables"
    );
    console.log('📊 Tablas en la base de datos:', tables.map(t => t.TABLE_NAME));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

initializeDatabase();