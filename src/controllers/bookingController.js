const { Booking, Showtime, Movie, Room, Seat, BookingSeat, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const QRService = require('../services/qrService');
const { sendBookingConfirmation } = require('../services/emailService');
const PDFService = require('../services/pdfService.js');

class BookingController {
  // Crear nueva reserva
  async createBooking(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        showtime_id,
        seat_ids,
        payment_method,
        customer_email
      } = req.body;

      const user_id = req.userId;

      // Validaciones
      if (!showtime_id || !seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Función y asientos son requeridos'
        });
      }

      // Verificar que la función existe
      const showtime = await Showtime.findByPk(showtime_id, {
        include: [
          { model: Movie, as: 'movie' },
          { model: Room, as: 'room' }
        ],
        transaction
      });

      if (!showtime) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Función no encontrada'
        });
      }

      // Verificar que la función sea futura
      const showtimeDate = new Date(`${showtime.date}T${showtime.time}`);
      if (showtimeDate < new Date()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se pueden hacer reservas para funciones pasadas'
        });
      }

      // Verificar disponibilidad de asientos
      const seats = await Seat.findAll({
        where: {
          id: { [Op.in]: seat_ids },
          room_id: showtime.room_id
        },
        transaction
      });

      if (seats.length !== seat_ids.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Algunos asientos no existen en esta sala'
        });
      }

      // Verificar que no estén ya reservados
      const bookedSeats = await BookingSeat.findAll({
        include: [{
          model: Booking,
          as: 'booking',
          where: {
            showtime_id,
            status: { [Op.in]: ['confirmed', 'pending'] }
          },
          attributes: []
        }],
        where: { seat_id: { [Op.in]: seat_ids } },
        attributes: ['seat_id'],
        transaction,
        raw: true
      });

      if (bookedSeats.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Algunos asientos ya están reservados',
          bookedSeats: bookedSeats.map(bs => bs.seat_id)
        });
      }

      // Calcular precios
      const basePrice = parseFloat(showtime.price);
      let totalPrice = 0;
      const bookingSeatsData = [];

      for (const seat of seats) {
        let seatPrice = basePrice;

        switch (seat.type.toLowerCase()) {
          case 'premium':
            seatPrice *= 1.10;
            break;
          case 'vip':
            seatPrice *= 1.20;
            break;
        }

        seatPrice = parseFloat(seatPrice.toFixed(2));
        totalPrice += seatPrice;

        bookingSeatsData.push({
          seat_id: seat.id,
          price: seatPrice
        });
      }

      const serviceFee = parseFloat((totalPrice * 0.05).toFixed(2));
      totalPrice = parseFloat((totalPrice + serviceFee).toFixed(2));

      // Crear transacción única
      const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Crear reserva
      const booking = await Booking.create({
        transaction_id,
        user_id,
        showtime_id,
        total_price: totalPrice,
        payment_method: payment_method || 'Tarjeta de Crédito',
        customer_email: customer_email || req.userEmail,
        status: 'confirmed'
      }, { transaction });

      // Asociar asientos reservados
      const bookingSeats = bookingSeatsData.map(bs => ({
        ...bs,
        booking_id: booking.id
      }));

      await BookingSeat.bulkCreate(bookingSeats, { transaction });

      // Actualizar cupo
      await showtime.decrement('available_seats', {
        by: seat_ids.length,
        transaction
      });

      // Generar QR
      const qrResult = await QRService.generateBookingQR({
        transaction_id,
        id: booking.id,
        showtime,
        bookingSeats: bookingSeatsData.map((bs, index) => ({
          seat: seats[index]
        })),
        customer_email: booking.customer_email,
        purchase_date: booking.purchase_date
      });

      await booking.update({
        qr_code_data: qrResult.dataURL
      }, { transaction });

      // Generar PDF con QR
      const receiptUrl = await PDFService.generateReceiptPDF(
        booking,
        showtime,
        seats,
        totalPrice,
        qrResult.filePath // aquí pasamos correctamente el QR físico
      );

      await booking.update({ receipt_url: receiptUrl }, { transaction });

      // Confirmar transacción
      await transaction.commit();

      // Obtener reserva completa (fuera de la transacción)
      const completeBooking = await Booking.findByPk(booking.id, {
        include: [
          {
            model: Showtime,
            as: 'showtime',
            include: [
              { model: Movie, as: 'movie' },
              { model: Room, as: 'room' }
            ]
          },
          {
            model: BookingSeat,
            as: 'bookingSeats',
            include: [{ model: Seat, as: 'seat' }]
          }
        ]
      });

      // Añadir QR base64 para el correo
      completeBooking.qr_data_url = qrResult.dataURL;

      // ✅ Enviar correo de confirmación
      try {
        await sendBookingConfirmation(completeBooking);
      } catch (emailError) {
        console.error('Error enviando email de confirmación:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Reserva creada exitosamente',
        data: { booking: completeBooking }
      });

    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }

      console.error('Error creando reserva:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener reservas del usuario
  async getUserBookings(req, res) {
    try {
      const user_id = req.userId;
      const { status, page = 1, limit = 20 } = req.query;

      const whereClause = { user_id };
      if (status) whereClause.status = status;

      const offset = (page - 1) * limit;

      const bookings = await Booking.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Showtime,
            as: 'showtime',
            include: [
              {
                model: Movie,
                as: 'movie',
                attributes: ['id', 'title', 'poster']
              },
              {
                model: Room,
                as: 'room',
                attributes: ['id', 'name', 'location']
              }
            ]
          },
          {
            model: BookingSeat,
            as: 'bookingSeats',
            include: [{
              model: Seat,
              as: 'seat',
              attributes: ['id', 'row', 'number', 'type']
            }]
          }
        ],
        order: [['purchase_date', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          bookings: bookings.rows,
          pagination: {
            total: bookings.count,
            page: parseInt(page),
            totalPages: Math.ceil(bookings.count / limit),
            hasNext: offset + bookings.rows.length < bookings.count,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo reservas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener reserva específica
  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.userId;
      const user_role = req.userRole;

      const whereClause = { id };

      // Usuarios normales solo pueden ver sus propias reservas
      if (user_role !== 'admin') {
        whereClause.user_id = user_id;
      }

      const booking = await Booking.findOne({
        where: whereClause,
        include: [
          {
            model: Showtime,
            as: 'showtime',
            include: [
              {
                model: Movie,
                as: 'movie',
                attributes: ['id', 'title', 'genre', 'duration', 'poster']
              },
              {
                model: Room,
                as: 'room',
                attributes: ['id', 'name', 'location']
              }
            ]
          },
          {
            model: BookingSeat,
            as: 'bookingSeats',
            include: [{
              model: Seat,
              as: 'seat',
              attributes: ['id', 'row', 'number', 'type']
            }]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      res.json({
        success: true,
        data: { booking }
      });

    } catch (error) {
      console.error('Error obteniendo reserva:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Cancelar reserva
  async cancelBooking(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const user_id = req.userId;
      const user_role = req.userRole;

      const whereClause = { id };
      if (user_role !== 'admin') {
        whereClause.user_id = user_id;
      }

      const booking = await Booking.findOne({
        where: whereClause,
        include: [{
          model: Showtime,
          as: 'showtime'
        }],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      if (booking.status === 'cancelled') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'La reserva ya está cancelada'
        });
      }

      // Verificar que no sea muy tarde para cancelar (más de 2 horas antes)
      const showtimeDate = new Date(`${booking.showtime.date}T${booking.showtime.time}`);
      const timeUntilShowtime = showtimeDate - new Date();
      const hoursUntilShowtime = timeUntilShowtime / (1000 * 60 * 60);

      if (hoursUntilShowtime < 2 && user_role !== 'admin') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden cancelar reservas con al menos 2 horas de anticipación'
        });
      }

      // Contar asientos para liberar
      const seatCount = await BookingSeat.count({
        where: { booking_id: id },
        transaction
      });

      // Liberar asientos en la función
      await booking.showtime.increment('available_seats', {
        by: seatCount,
        transaction
      });

      // Cancelar reserva
      await booking.update({ status: 'cancelled' }, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: 'Reserva cancelada exitosamente'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error cancelando reserva:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

    async downloadReceipt(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.userId;
      const user_role = req.userRole;

      const whereClause = { id };
      if (user_role !== 'admin') {
        whereClause.user_id = user_id;
      }

      const booking = await Booking.findOne({
        where: whereClause,
        include: [
          {
            model: Showtime,
            as: 'showtime',
            include: [
              { model: Movie, as: 'movie' },
              { model: Room, as: 'room' }
            ]
          },
          {
            model: BookingSeat,
            as: 'bookingSeats',
            include: [{ model: Seat, as: 'seat' }]
          }
        ]
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      if (!booking.receipt_url) {
        return res.status(404).json({
          success: false,
          message: 'Recibo no disponible'
        });
      }

      // Obtener la URL base del backend desde las variables de entorno
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      
      // Construir la URL completa del recibo
      const fullDownloadUrl = `${backendUrl}${booking.receipt_url}`;

      res.json({
        success: true,
        message: 'Recibo listo para descargar',
        data: {
          download_url: fullDownloadUrl, // URL completa
          filename: `recibo-${booking.transaction_id}.pdf`,
          relative_url: booking.receipt_url // Mantener también la ruta relativa por si se necesita
        }
      });

    } catch (error) {
      console.error('Error descargando recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new BookingController();