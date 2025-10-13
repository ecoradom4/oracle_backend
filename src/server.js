// src/server.js
require('dotenv').config();

const App = require('./app');

// Validar variables de entorno requeridas
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Error: Faltan variables de entorno requeridas:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('\n💡 Asegúrate de configurar el archivo .env con todas las variables necesarias');
  process.exit(1);
}

// Manejar excepciones no capturadas
process.on('uncaughtException', (error) => {
  console.error('🚨 Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promesa rechazada no manejada:', reason);
  console.error('En la promesa:', promise);
  process.exit(1);
});

// Inicializar y iniciar la aplicación
try {
  const app = new App();
  app.start();
} catch (error) {
  console.error('❌ Error fatal iniciando la aplicación:', error);
  process.exit(1);
}