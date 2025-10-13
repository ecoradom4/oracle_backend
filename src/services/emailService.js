// src/services/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Verificar conexión del transporter
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error configurando servicio de email:', error);
      return false;
    }
  }

  // Enviar email de bienvenida
  async sendWelcomeEmail(userEmail, userName) {
    try {
      const mailOptions = {
        from: `"Cine Connect" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '¡Bienvenido a Cine Connect! 🎬',
        html: this.getWelcomeEmailTemplate(userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de bienvenida enviado a:', userEmail);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email de bienvenida:', error);
      throw error;
    }
  }

  // Enviar confirmación de reserva
  async sendBookingConfirmation(booking) {
    try {
      const { customer_email, transaction_id, showtime, bookingSeats, total_price } = booking;
      
      const mailOptions = {
        from: `"Cine Connect" <${process.env.EMAIL_USER}>`,
        to: customer_email,
        subject: `Confirmación de Reserva - ${showtime.movie.title} 🎟️`,
        html: this.getBookingConfirmationTemplate(booking),
        attachments: await this.getBookingAttachments(booking)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de confirmación enviado para reserva:', transaction_id);
      return result;

    } catch (error) {
      console.error('❌ Error enviando confirmación de reserva:', error);
      throw error;
    }
  }

  // Enviar recordatorio de función
  async sendShowtimeReminder(booking) {
    try {
      const showtimeDate = new Date(`${booking.showtime.date}T${booking.showtime.time}`);
      const now = new Date();
      const hoursUntilShowtime = (showtimeDate - now) / (1000 * 60 * 60);

      // Solo enviar recordatorio si la función es en las próximas 24 horas
      if (hoursUntilShowtime > 0 && hoursUntilShowtime <= 24) {
        const mailOptions = {
          from: `"Cine Connect" <${process.env.EMAIL_USER}>`,
          to: booking.customer_email,
          subject: `Recordatorio: ${booking.showtime.movie.title} hoy a las ${booking.showtime.time} ⏰`,
          html: this.getReminderTemplate(booking)
        };

        const result = await this.transporter.sendMail(mailOptions);
        console.log('✅ Recordatorio enviado para reserva:', booking.transaction_id);
        return result;
      }

    } catch (error) {
      console.error('❌ Error enviando recordatorio:', error);
      throw error;
    }
  }

  // Obtener archivos adjuntos para la reserva
  async getBookingAttachments(booking) {
    const attachments = [];

    try {
      // Adjuntar recibo PDF si existe
      if (booking.receipt_url) {
        const receiptPath = path.join(__dirname, '../..', booking.receipt_url);
        try {
          const pdfBuffer = await fs.readFile(receiptPath);
          attachments.push({
            filename: `recibo-${booking.transaction_id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          });
        } catch (error) {
          console.warn('⚠️ No se pudo adjuntar recibo PDF:', error.message);
        }
      }

      // Adjuntar QR code si existe como archivo
      const qrPath = path.join(__dirname, '../../storage/qr-codes', `booking-${booking.transaction_id}.png`);
      try {
        const qrBuffer = await fs.readFile(qrPath);
        attachments.push({
          filename: `qr-${booking.transaction_id}.png`,
          content: qrBuffer,
          contentType: 'image/png'
        });
      } catch (error) {
        console.warn('⚠️ No se pudo adjuntar QR code:', error.message);
      }

    } catch (error) {
      console.error('❌ Error preparando adjuntos:', error);
    }

    return attachments;
  }

  // Helper para asegurar que un valor sea número
  ensureNumber(value) {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return value || 0;
  }

  // Template para email de bienvenida
  getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 ¡Bienvenido a Cine Connect!</h1>
            <p>Tu portal para las mejores experiencias cinematográficas</p>
          </div>
          <div class="content">
            <h2>Hola ${userName},</h2>
            <p>Estamos emocionados de tenerte en nuestra comunidad cinéfila.</p>
            <p>Con tu cuenta de Cine Connect puedes:</p>
            <ul>
              <li>📅 Reservar boletos para las mejores películas</li>
              <li>💺 Elegir tus asientos favoritos</li>
              <li>📱 Recibir tus boletos digitalmente</li>
              <li>🎟️ Gestionar todas tus reservas en un solo lugar</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/cartelera" class="button">Explorar Cartelera</a>
            </p>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>¡Que comience la función! 🍿</p>
          </div>
          <div class="footer">
            <p>Cine Connect - Sistema de Reservas</p>
            <p>Email: soporte@cineconnect.com | Tel: +502 1234-5678</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template para confirmación de reserva
  getBookingConfirmationTemplate(booking) {
    const { showtime, bookingSeats, total_price, transaction_id } = booking;
    const seatsList = bookingSeats.map(bs => `${bs.seat.row}${bs.seat.number}`).join(', ');
    
    // CORRECCIÓN: Asegurar que total_price sea número
    const totalPrice = this.ensureNumber(total_price);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket { background: white; border: 2px dashed #cbd5e0; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
          .total { background: #edf2f7; padding: 15px; border-radius: 5px; text-align: center; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Reserva Confirmada</h1>
            <p>Tu entrada para ${showtime.movie.title}</p>
          </div>
          <div class="content">
            <div class="ticket">
              <h2>${showtime.movie.title}</h2>
              <div class="info-grid">
                <div><strong>Fecha:</strong> ${new Date(showtime.date).toLocaleDateString('es-ES')}</div>
                <div><strong>Hora:</strong> ${showtime.time}</div>
                <div><strong>Sala:</strong> ${showtime.room.name}</div>
                <div><strong>Ubicación:</strong> ${showtime.room.location}</div>
                <div><strong>Asientos:</strong> ${seatsList}</div>
                <div><strong>Transacción:</strong> ${transaction_id}</div>
              </div>
              <div class="total">
                Total Pagado: $${totalPrice.toFixed(2)}
              </div>
            </div>
            
            <h3>📋 Información Importante</h3>
            <ul>
              <li>Llega al cine al menos 15 minutos antes de la función</li>
              <li>Presenta este email o el código QR en la entrada</li>
              <li>Los boletos adjuntos incluyen tu recibo y código de acceso</li>
              <li>Para cambios o cancelaciones, contacta a nuestro servicio al cliente</li>
            </ul>
            
            <p><strong>📍 Dirección del cine:</strong><br>
            ${showtime.room.location} - Cine Connect</p>
            
            <p>¡Gracias por tu compra y que disfrutes la película! 🍿</p>
          </div>
          <div class="footer">
            <p>Cine Connect - Sistema de Reservas</p>
            <p>Email: soporte@cineconnect.com | Tel: +502 1234-5678</p>
            <p>Si tienes preguntas, responde a este email</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template para recordatorio
  getReminderTemplate(booking) {
    const { showtime, bookingSeats } = booking;
    const seatsList = bookingSeats.map(bs => `${bs.seat.row}${bs.seat.number}`).join(', ');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f7fafc; padding: 25px; border-radius: 0 0 10px 10px; }
          .reminder { background: #fffaf0; border-left: 4px solid #ed8936; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Función</h1>
            <p>No te pierdas ${showtime.movie.title}</p>
          </div>
          <div class="content">
            <div class="reminder">
              <h3>¡Tu función es hoy!</h3>
              <p><strong>${showtime.movie.title}</strong><br>
              🕒 ${showtime.time} | 📍 ${showtime.room.name} | 💺 ${seatsList}</p>
            </div>
            
            <p><strong>Recomendaciones:</strong></p>
            <ul>
              <li>Llega con 15-20 minutos de anticipación</li>
              <li>Trae tu código QR o este email</li>
              <li>El tráfico puede estar pesado - planifica tu viaje</li>
              <li>¡No olvides tus palomitas! 🍿</li>
            </ul>
            
            <p>Te esperamos en <strong>${showtime.room.location}</strong></p>
            <p>¡Que tengas una excelente experiencia cinematográfica! 🎬</p>
          </div>
          <div class="footer">
            <p>Cine Connect - Sistema de Reservas</p>
            <p>¿Necesitas ayuda? Contacta: soporte@cineconnect.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email genérico
  async sendEmail(to, subject, html, attachments = []) {
    try {
      const mailOptions = {
        from: `"Cine Connect" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado a:', to);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw error;
    }
  }
}

// CORRECCIÓN: Exportar correctamente
module.exports = EmailService;

// Exportar funciones individuales para uso conveniente
module.exports.sendBookingConfirmation = (booking) => {
  const service = new EmailService();
  return service.sendBookingConfirmation(booking);
};

module.exports.sendWelcomeEmail = (userEmail, userName) => {
  const service = new EmailService();
  return service.sendWelcomeEmail(userEmail, userName);
};

module.exports.sendShowtimeReminder = (booking) => {
  const service = new EmailService();
  return service.sendShowtimeReminder(booking);
};