// src/services/emailService.js
const { Resend } = require('resend');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async verifyConnection() {
    console.log('✅ Servicio de email (Resend) listo – no requiere verificación SMTP');
    return true;
  }

  // Email de bienvenida
  async sendWelcomeEmail(userEmail, userName) {
    try {
      const result = await this.resend.emails.send({
        from: 'Cine Connect <no-reply@devumg.online>',
        to: userEmail,
        subject: '¡Bienvenido a Cine Connect! 🎬',
        html: this.getWelcomeEmailTemplate(userName),
      });

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
      const { customer_email, transaction_id, showtime } = booking;
      const attachments = await this.getBookingAttachments(booking); // solo PDF

      const result = await this.resend.emails.send({
        from: 'Cine Connect <no-reply@devumg.online>',
        to: customer_email,
        subject: `Confirmación de Reserva - ${showtime.movie.title} 🎟️`,
        html: this.getBookingConfirmationTemplate(booking),
        attachments,
      });

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

      if (hoursUntilShowtime > 0 && hoursUntilShowtime <= 24) {
        const result = await this.resend.emails.send({
          from: 'Cine Connect <no-reply@devumg.online>',
          to: booking.customer_email,
          subject: `Recordatorio: ${booking.showtime.movie.title} hoy a las ${booking.showtime.time} ⏰`,
          html: this.getReminderTemplate(booking),
        });

        console.log('✅ Recordatorio enviado para reserva:', booking.transaction_id);
        return result;
      }
    } catch (error) {
      console.error('❌ Error enviando recordatorio:', error);
      throw error;
    }
  }

  // Obtener archivos adjuntos
  async getBookingAttachments(booking) {
    const attachments = [];
    try {
      if (booking.receipt_url) {
        const receiptPath = path.join(__dirname, '../..', booking.receipt_url);
        try {
          const pdfBuffer = await fs.readFile(receiptPath);
          attachments.push({
            filename: `recibo-${booking.transaction_id}.pdf`,
            content: pdfBuffer.toString('base64'),
          });
        } catch (error) {
          console.warn('⚠️ No se pudo adjuntar recibo PDF:', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error preparando adjuntos:', error);
    }
    return attachments;
  }

  // Helper: asegurar que un valor sea número
  ensureNumber(value) {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return value || 0;
  }

  // Plantilla de bienvenida
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
            <ul>
              <li>📅 Reserva boletos fácilmente</li>
              <li>💺 Elige tus asientos favoritos</li>
              <li>📱 Recibe tus boletos digitalmente</li>
              <li>🎟️ Gestiona todas tus reservas</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/cartelera" class="button">Explorar Cartelera</a>
            </p>
            <p>¡Que comience la función! 🍿</p>
          </div>
          <div class="footer">
            <p>Cine Connect - Sistema de Reservas</p>
            <p>soporte@cineconnect.com | +502 1234-5678</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Plantilla de confirmación de reserva
  getBookingConfirmationTemplate(booking) {
    const { showtime, bookingSeats, total_price, transaction_id } = booking;
    const seatsList = bookingSeats.map(bs => `${bs.seat.row}${bs.seat.number}`).join(', ');
    const totalPrice = this.ensureNumber(total_price);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #333; background: #f7fafc; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .ticket { border: 2px dashed #cbd5e0; padding: 24px; margin: 20px 0; border-radius: 8px; text-align: center; }
        .ticket h2 { margin: 0 0 12px 0; }
        .line { margin: 6px 0; }
        .label { font-weight: bold; }
        .total { background: #edf2f7; padding: 15px; border-radius: 5px; text-align: center; font-weight: bold; margin-top: 14px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
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
            <div class="line"><span class="label">Fecha:</span> ${new Date(showtime.date).toLocaleDateString('es-ES')}</div>
            <div class="line"><span class="label">Hora:</span> ${showtime.time}</div>
            <div class="line"><span class="label">Sala:</span> ${showtime.room.name}</div>
            <div class="line"><span class="label">Ubicación:</span> ${showtime.room.location}</div>
            <div class="line"><span class="label">Asientos:</span> ${seatsList}</div>
            <div class="line"><span class="label">Transacción:</span> ${transaction_id}</div>
            <div class="total">Total Pagado: Q${totalPrice.toFixed(2)}</div>
          </div>

          <h3>📋 Información Importante</h3>
          <ul>
            <li>Llega al cine al menos 15 minutos antes de la función</li>
            <li>Presenta este email o el código QR del recibo en la entrada</li>
            <li>Adjuntamos tu recibo en PDF</li>
          </ul>
          <p><strong>📍 Dirección del cine:</strong><br>${showtime.room.location} - Cine Connect</p>
          <p>¡Gracias por tu compra y que disfrutes la película! 🍿</p>
        </div>
        <div class="footer">
          <p>Cine Connect - Sistema de Reservas</p>
          <p>soporte@cineconnect.com | +502 1234-5678</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Recordatorio de función 
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
            <ul>
              <li>Llega con 15 minutos de anticipación</li>
              <li>Trae tu recibo (con QR) o este email</li>
              <li>Planifica tu viaje — el tráfico puede afectar</li>
            </ul>
            <p>Te esperamos en <strong>${showtime.room.location}</strong></p>
          </div>
          <div class="footer">
            <p>Cine Connect - Sistema de Reservas</p>
            <p>¿Necesitas ayuda? soporte@cineconnect.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = EmailService;
module.exports.sendBookingConfirmation = (booking) => new EmailService().sendBookingConfirmation(booking);
module.exports.sendWelcomeEmail = (userEmail, userName) => new EmailService().sendWelcomeEmail(userEmail, userName);
module.exports.sendShowtimeReminder = (booking) => new EmailService().sendShowtimeReminder(booking);
