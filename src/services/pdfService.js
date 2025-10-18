const PDFDocument = require('pdfkit');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class PDFService {
  // Generar recibo de compra
  static async generateReceiptPDF(booking, showtime, seats, totalPrice, qrFilePath) {
    try {
      // Crear directorio para recibos
      const receiptsDir = path.join(__dirname, '../../storage/receipts');
      await PDFService.ensureDirectoryExists(receiptsDir);

      const filename = `recibo-${booking.transaction_id}.pdf`;
      const filePath = path.join(receiptsDir, filename);

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header del recibo
        PDFService.addReceiptHeader(doc, booking);

        // Información de la compra (ahora incluye QR)
        PDFService.addBookingDetails(doc, booking, showtime, seats, qrFilePath);

        // Desglose de precios
        PDFService.addPriceBreakdown(doc, totalPrice, seats.length);

        // Términos y condiciones
        PDFService.addTermsAndConditions(doc);

        // Footer
        PDFService.addReceiptFooter(doc);

        doc.end();

        stream.on('finish', () => {
          resolve(`/storage/receipts/${filename}`);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // Header del recibo
  static addReceiptHeader(doc, booking) {
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text('CINE CONNECT', 50, 50, { align: 'center' });

    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Sistema de Reservas de Cine', 50, 75, { align: 'center' });

    // Línea separadora
    doc.moveTo(50, 100)
      .lineTo(550, 100)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    // Información del recibo
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('COMPROBANTE DE RESERVA', 50, 120, { align: 'center' });

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Nº Transacción: ${booking.transaction_id}`, 50, 150)
      .text(`Fecha: ${new Date(booking.purchase_date).toLocaleDateString('es-ES')}`, 300, 150)
      .text(`Hora: ${new Date(booking.purchase_date).toLocaleTimeString('es-ES')}`, 450, 150);
  }

  // Detalles de la reserva (con QR a la derecha)
  static addBookingDetails(doc, booking, showtime, seats, qrFilePath) {
    let yPosition = 190;

    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('DETALLES DE LA FUNCIÓN', 50, yPosition);

    yPosition += 25;

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Película: ${showtime.movie.title}`, 70, yPosition)
      .text(`Género: ${showtime.movie.genre}`, 300, yPosition);

    yPosition += 20;

    doc.text(`Sala: ${showtime.room.name}`, 70, yPosition)
      .text(`Ubicación: ${showtime.room.location}`, 300, yPosition);

    yPosition += 20;

    doc.text(`Fecha: ${new Date(showtime.date).toLocaleDateString('es-ES')}`, 70, yPosition)
      .text(`Hora: ${showtime.time}`, 300, yPosition);

    // === Agregar QR en la parte derecha ===
    if (qrFilePath) {
      try {
        const qrX = 450; // posición horizontal
        const qrY = 190; // alineado con el bloque de detalles
        doc.image(qrFilePath, qrX, qrY, { width: 100, height: 100 });
      } catch (err) {
        console.warn('⚠️ No se pudo agregar QR al PDF:', err.message);
      }
    }

    yPosition += 40;

    // Asientos
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('ASIENTOS RESERVADOS:', 50, yPosition);

    yPosition += 20;

    seats.forEach((seat, index) => {
      const column = index % 2 === 0 ? 70 : 300;
      const rowOffset = Math.floor(index / 2) * 15;

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(`• ${seat.row}${seat.number} (${PDFService.getSeatTypeLabel(seat.type)})`, column, yPosition + rowOffset);
    });

    yPosition += Math.ceil(seats.length / 2) * 15 + 20;

    // Información del cliente
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('INFORMACIÓN DEL CLIENTE:', 50, yPosition);

    yPosition += 20;

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Email: ${booking.customer_email}`, 70, yPosition)
      .text(`Teléfono: ${booking.customer_phone || 'No proporcionado'}`, 300, yPosition);
  }

  // Desglose de precios
  static addPriceBreakdown(doc, totalPrice, seatCount) {
    let yPosition = doc.y + 30;

    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('DESGLOSE DE PAGO', 50, yPosition);

    yPosition += 25;

    const subtotal = totalPrice / 1.05;
    const serviceFee = subtotal * 0.05;

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Subtotal (${seatCount} asientos):`, 70, yPosition)
      .text(`Q${subtotal.toFixed(2)}`, 450, yPosition, { align: 'right' });

    yPosition += 15;

    doc.text('Cargos por servicio (5%):', 70, yPosition)
      .text(`Q${serviceFee.toFixed(2)}`, 450, yPosition, { align: 'right' });

    yPosition += 20;

    doc.moveTo(70, yPosition)
      .lineTo(450, yPosition)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    yPosition += 15;

    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text('TOTAL:', 70, yPosition)
      .text(`Q${totalPrice.toFixed(2)}`, 450, yPosition, { align: 'right' });
  }

  // Términos y condiciones
  static addTermsAndConditions(doc) {
    let yPosition = doc.y + 40;

    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('TÉRMINOS Y CONDICIONES:', 50, yPosition);

    yPosition += 15;

    const terms = [
      '• Los boletos no son reembolsables ni transferibles',
      '• Llegar al menos 15 minutos antes de la función',
      '• Presentar este comprobante o código QR en la entrada',
      '• No se permiten cambios después de la compra',
      '• Para asistencia, contactar: soporte@cineconnect.com'
    ];

    terms.forEach((term, index) => {
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text(term, 70, yPosition + (index * 12));
    });
  }

  // Footer del recibo
  static addReceiptFooter(doc) {
    const yPosition = doc.page.height - 100;

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Gracias por su compra. ¡Disfrute de la película!', 50, yPosition, { align: 'center' })
      .text('Cine Connect - Sistema de Reservas', 50, yPosition + 15, { align: 'center' })
      .text('www.cineconnect.com - Tel: +502 1234-5678', 50, yPosition + 30, { align: 'center' });
  }

  static getSeatTypeLabel(type) {
    const labels = {
      'standard': 'Estándar',
      'premium': 'Premium',
      'vip': 'VIP'
    };
    return labels[type] || type;
  }

  static async ensureDirectoryExists(dirPath) {
    try {
      await fsPromises.access(dirPath);
    } catch (error) {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }

  static async generateSalesReport(reportData, period) {
    try {
      const reportsDir = path.join(__dirname, '../../storage/reports');
      await PDFService.ensureDirectoryExists(reportsDir);

      const filename = `reporte-ventas-${period}-${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, filename);

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header del reporte
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#1a365d')
          .text('CINE CONNECT', 50, 50, { align: 'center' });

        doc.fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#2d3748')
          .text(`REPORTE DE VENTAS - ${period.toUpperCase()}`, 50, 80, { align: 'center' });

        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Generado: ${reportData.metadata.generatedAt}`, 50, 110, { align: 'center' })
          .text(`Período: ${reportData.metadata.dateRange.start} - ${reportData.metadata.dateRange.end}`, 50, 125, { align: 'center' });

        let yPosition = 160;

        // Estadísticas principales
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('ESTADÍSTICAS PRINCIPALES', 50, yPosition);

        yPosition += 30;

        const stats = [
          ['Ventas Totales:', `Q${reportData.stats.totalSales.toLocaleString('es-GT')}`],
          ['Boletos Vendidos:', `${reportData.stats.totalTickets.toLocaleString('es-GT')}`],
          ['Precio Promedio:', `Q${reportData.stats.averagePrice.toFixed(2)}`],
          ['Películas Activas:', `${reportData.stats.activeMovies}`]
        ];

        stats.forEach(([label, value], index) => {
          doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#333333')
            .text(label, 70, yPosition + (index * 20));

          doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#666666')
            .text(value, 250, yPosition + (index * 20));
        });

        yPosition += 100;

        // Ventas por película (primeras 5)
        if (reportData.salesByMovie.length > 0) {
          doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('TOP PELÍCULAS POR VENTAS', 50, yPosition);

          yPosition += 25;

          reportData.salesByMovie.slice(0, 5).forEach((movie, index) => {
            doc.fontSize(9)
              .font('Helvetica-Bold')
              .fillColor('#333333')
              .text(`${index + 1}. ${movie.movieTitle}`, 70, yPosition + (index * 15));

            doc.fontSize(9)
              .font('Helvetica')
              .fillColor('#666666')
              .text(`Q${movie.totalSales.toLocaleString('es-GT')} (${movie.ticketCount} boletos)`, 350, yPosition + (index * 15));
          });

          yPosition += 90;
        }

        // Distribución por género
        if (reportData.genreDistribution.length > 0) {
          doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('DISTRIBUCIÓN POR GÉNERO', 50, yPosition);

          yPosition += 25;

          reportData.genreDistribution.forEach((genre, index) => {
            doc.fontSize(9)
              .font('Helvetica-Bold')
              .fillColor('#333333')
              .text(`• ${genre.name}`, 70, yPosition + (index * 15));

            doc.fontSize(9)
              .font('Helvetica')
              .fillColor('#666666')
              .text(`${genre.value}%`, 200, yPosition + (index * 15));
          });
        }

        // Footer
        const footerY = doc.page.height - 50;
        doc.fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text('Reporte generado automáticamente por Cine Connect Dashboard', 50, footerY, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(`/storage/reports/${filename}`);
        });

        stream.on('error', reject);
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PDFService;
