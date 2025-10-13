// src/services/index.js
const EmailService = require('./emailService');
const QRService = require('./qrService');
const PDFService = require('./pdfService');

// Crear instancia de EmailService
const emailService = new EmailService();

// Inicializar servicios
const initializeServices = async () => {
  try {
    // Verificar conexión de email
    await emailService.verifyConnection();
    
    console.log('✅ Todos los servicios inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando servicios:', error);
  }
};

module.exports = {
  EmailService: emailService, // Exportar la instancia
  QRService, 
  PDFService,
  initializeServices
};