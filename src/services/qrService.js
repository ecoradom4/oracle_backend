// src/services/qrService.js
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

class QRService {
  // Generar QR para reserva
  static async generateBookingQR(bookingData) {
    try {
      const qrData = {
        transactionId: bookingData.transaction_id,
        bookingId: bookingData.id,
        movie: bookingData.showtime.movie.title,
        showtime: bookingData.showtime.time,
        date: bookingData.showtime.date,
        cinema: bookingData.showtime.room.name,
        seats: bookingData.bookingSeats.map(bs => 
          `${bs.seat.row}${bs.seat.number}`
        ),
        customer: bookingData.customer_email,
        purchaseDate: bookingData.purchase_date
      };

      // Crear directorio para QR codes si no existe
      const qrDir = path.join(__dirname, '../../storage/qr-codes');
      await this.ensureDirectoryExists(qrDir);

      const qrString = JSON.stringify(qrData);
      
      // Generar QR como Data URL (para almacenar en BD)
      const qrDataURL = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // También guardar como archivo PNG
      const qrFilename = `booking-${bookingData.transaction_id}.png`;
      const qrFilePath = path.join(qrDir, qrFilename);
      
      await QRCode.toFile(qrFilePath, qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        dataURL: qrDataURL,
        filePath: qrFilePath,
        filename: qrFilename
      };

    } catch (error) {
      console.error('Error generando QR:', error);
      throw new Error('No se pudo generar el código QR');
    }
  }

  // Generar QR para validación en entrada
  static async generateValidationQR(bookingId, showtimeId) {
    try {
      const validationData = {
        type: 'entry_validation',
        bookingId: bookingId,
        showtimeId: showtimeId,
        timestamp: new Date().toISOString(),
        validated: false
      };

      const qrString = JSON.stringify(validationData);
      const qrDataURL = await QRCode.toDataURL(qrString, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1a365d',
          light: '#FFFFFF'
        }
      });

      return qrDataURL;

    } catch (error) {
      console.error('Error generando QR de validación:', error);
      throw new Error('No se pudo generar el QR de validación');
    }
  }

  // Validar QR escaneado
  static async validateQR(qrDataString) {
    try {
      const qrData = JSON.parse(qrDataString);
      
      // Verificar estructura básica del QR
      if (!qrData.bookingId || !qrData.transactionId) {
        return {
          valid: false,
          message: 'QR inválido: datos incompletos'
        };
      }

      // Verificar timestamp (no más de 24 horas de antigüedad para validación)
      if (qrData.timestamp) {
        const qrTime = new Date(qrData.timestamp);
        const now = new Date();
        const hoursDiff = (now - qrTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24 && qrData.type === 'entry_validation') {
          return {
            valid: false,
            message: 'QR expirado'
          };
        }
      }

      return {
        valid: true,
        data: qrData
      };

    } catch (error) {
      console.error('Error validando QR:', error);
      return {
        valid: false,
        message: 'QR corrupto o inválido'
      };
    }
  }

  // Helper para crear directorios
  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Limpiar QRs antiguos (más de 30 días)
  static async cleanupOldQRFiles(days = 30) {
    try {
      const qrDir = path.join(__dirname, '../../storage/qr-codes');
      const files = await fs.readdir(qrDir);
      const now = new Date();
      const cutoffTime = now.setDate(now.getDate() - days);

      for (const file of files) {
        if (file.endsWith('.png')) {
          const filePath = path.join(qrDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`QR eliminado: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error limpiando QRs antiguos:', error);
    }
  }
}

module.exports = QRService;