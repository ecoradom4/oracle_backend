const { Booking, Showtime, Movie, Room, Seat, BookingSeat, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const QRService = require('../services/qrService');
const { sendBookingConfirmation } = require('../services/emailService');
const PDFService = require('../services/pdfService.js');

class BookingController {
  // Crear nueva reserva - ACTUALIZADO PARA ORACLE
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

      // Verificar que la función existe - ACTUALIZADO
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

      // Verificar que la función sea futura - ACTUALIZADO PARA FECHAS ORACLE
      const showtimeDateTime = new Date(showtime.date);
      const [hours, minutes, seconds] = showtime.time.split(':');
      showtimeDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
      
      if (showtimeDateTime < new Date()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se pueden hacer reservas para funciones pasadas'
        });
      }

      // Verificar disponibilidad de asientos - ACTUALIZADO
      const seats = await Seat.findAll({
        where: {
          id: { [Op.in]: seat_ids },
          room_id: showtime.room_id,
          status: 'available' // Añadida verificación de estado
        },
        transaction
      });

      if (seats.length !== seat_ids.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Algunos asientos no están disponibles o no existen en esta sala'
        });
      }

      // Verificar que no estén ya reservados - ACTUALIZADO
      const existingBookingSeats = await BookingSeat.findAll({
        where: {
          seat_id: { [Op.in]: seat_ids }
        },
        include: [{
          model: Booking,
          as: 'booking',
          where: {
            showtime_id: showtime_id,
            status: { [Op.in]: ['confirmed', 'pending'] }
          }
        }],
        transaction
      });

      if (existingBookingSeats.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Algunos asientos ya están reservados',
          bookedSeats: existingBookingSeats.map(bs => bs.seat_id)
        });
      }

      // Calcular precios - ACTUALIZADO PARA DECIMALES ORACLE
      const basePrice = parseFloat(showtime.price);
      let totalPrice = 0;
      const bookingSeatsData = [];

      for (const seat of seats) {
        let seatPrice = basePrice;

        // Aplicar multiplicadores según tipo de asiento
        switch (seat.type.toLowerCase()) {
          case 'premium':
            seatPrice *= 1.10; // Aumentado a 10%
            break;
          case 'vip':
            seatPrice *= 1.20; // Aumentado a 20%
            break;
        }

        seatPrice = Math.round(seatPrice * 100) / 100; // Redondear a 2 decimales
        totalPrice += seatPrice;

        bookingSeatsData.push({
          seat_id: seat.id,
          price: seatPrice
        });
      }

      // Calcular tarifa de servicio
      const serviceFee = Math.round(totalPrice * 0.05 * 100) / 100;
      totalPrice = Math.round((totalPrice + serviceFee) * 100) / 100;

      // Crear transacción única
      const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Crear reserva - ACTUALIZADO
      const booking = await Booking.create({
        transaction_id,
        user_id,
        showtime_id,
        total_price: totalPrice,
        payment_method: payment_method || 'Tarjeta de Crédito',
        customer_email: customer_email || req.userEmail,
        status: 'confirmed',
        purchase_date: new Date() // Asegurar fecha de compra
      }, { transaction });

      // Asociar asientos reservados - ACTUALIZADO
      const bookingSeats = bookingSeatsData.map(bs => ({
        ...bs,
        booking_id: booking.id
      }));

      await BookingSeat.bulkCreate(bookingSeats, { transaction });

      // Actualizar cupo disponible - ACTUALIZADO
      const newAvailableSeats = showtime.available_seats - seat_ids.length;
      if (newAvailableSeats < 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No hay suficientes asientos disponibles'
        });
      }

      await showtime.update({
        available_seats: newAvailableSeats
      }, { transaction });

      // Generar QR - ACTUALIZADO
      const qrData = {
        booking_id: booking.id,
        transaction_id: booking.transaction_id,
        showtime_id: showtime.id,
        movie_title: showtime.movie.title,
        room_name: showtime.room.name,
        date: showtime.date,
        time: showtime.time,
        seats: seats.map(seat => `${seat.row}${seat.number}`),
        customer_email: booking.customer_email
      };

      const qrResult = await QRService.generateBookingQR(qrData);

      await booking.update({
        qr_code_data: qrResult.dataURL
      }, { transaction });

      // Generar PDF con QR
      const receiptUrl = await PDFService.generateReceiptPDF(
        booking,
        showtime,
        seats,
        totalPrice,
        qrResult.filePath
      );

      await booking.update({ 
        receipt_url: receiptUrl 
      }, { transaction });

      // Confirmar transacción
      await transaction.commit();

      // Obtener reserva completa - ACTUALIZADO
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

      // Enviar correo de confirmación
      try {
        await sendBookingConfirmation(completeBooking, qrResult.dataURL);
      } catch (emailError) {
        console.error('Error enviando email de confirmación:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Reserva creada exitosamente',
        data: { 
          booking: completeBooking,
          qr_code: qrResult.dataURL // Incluir QR en respuesta
        }
      });

    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }

      console.error('Error creando reserva:', error);
      
      // Manejar errores específicos de Oracle
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'La transacción ya existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener reservas del usuario - ACTUALIZADO
  async getUserBookings(req, res) {
    try {
      const user_id = req.userId;
      const { status, page = 1, limit = 10 } = req.query; // Reducido límite por defecto

      const whereClause = { user_id };
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const bookings = await Booking.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        include: [
          {
            model: Showtime,
            as: 'showtime',
            include: [
              {
                model: Movie,
                as: 'movie',
                attributes: ['id', 'title', 'poster', 'duration']
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
        order: [['created_at', 'DESC']] // Usar nombre de campo Oracle
      });

      res.json({
        success: true,
        data: {
          bookings: bookings.rows,
          pagination: {
            total: bookings.count,
            page: parseInt(page),
            limit: parseInt(limit),
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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener reserva específica - ACTUALIZADO
  async getBookingById(req, res) {
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
              {
                model: Movie,
                as: 'movie',
                attributes: ['id', 'title', 'genre', 'duration', 'poster', 'rating']
              },
              {
                model: Room,
                as: 'room',
                attributes: ['id', 'name', 'location', 'type']
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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Cancelar reserva - ACTUALIZADO
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

      if (booking.status === 'completed') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se puede cancelar una reserva completada'
        });
      }

      // Verificar tiempo de cancelación - ACTUALIZADO
      const showtimeDate = new Date(booking.showtime.date);
      const [hours, minutes] = booking.showtime.time.split(':');
      showtimeDate.setHours(parseInt(hours), parseInt(minutes));
      
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
        message: 'Reserva cancelada exitosamente',
        data: {
          booking_id: id,
          refund_amount: booking.total_price * 0.8 // 80% de reembolso
        }
      });

    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      
      console.error('Error cancelando reserva:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Descargar recibo - ACTUALIZADO
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
        attributes: ['id', 'transaction_id', 'receipt_url']
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
          message: 'Recibo no disponible para esta reserva'
        });
      }

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      const fullDownloadUrl = `${backendUrl}${booking.receipt_url}`;

      res.json({
        success: true,
        message: 'Recibo listo para descargar',
        data: {
          download_url: fullDownloadUrl,
          filename: `recibo-${booking.transaction_id}.pdf`,
          booking_id: booking.id
        }
      });

    } catch (error) {
      console.error('Error descargando recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }
}

module.exports = new BookingController();