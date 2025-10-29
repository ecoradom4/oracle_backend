const { BookingSeat, Booking, Seat, Showtime } = require('../models');
const { Op } = require('sequelize');

const getBookedSeatsByShowtime = async (req, res) => {
  try {
    const { showtimeId } = req.query;

    // Validar que showtimeId esté presente
    if (!showtimeId) {
      return res.status(400).json({
        success: false,
        message: "Parámetro showtimeId es requerido"
      });
    }

    // Validar formato UUID (Oracle usa UUID como string)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(showtimeId)) {
      return res.status(400).json({
        success: false,
        message: "Formato de showtimeId inválido"
      });
    }

    // Consultar asientos reservados para el showtime - ACTUALIZADO PARA ORACLE
    const bookedSeats = await BookingSeat.findAll({
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { 
            showtime_id: showtimeId,
            status: { [Op.in]: ['confirmed', 'pending'] } // Incluir pendientes también
          },
          attributes: [] // No incluir campos de Booking en el resultado
        },
        {
          model: Seat,
          as: 'seat',
          attributes: ['id', 'row', 'number', 'type', 'status']
        }
      ],
      attributes: ['id', 'seat_id', 'booking_id', 'price', 'created_at'],
      raw: false // Mantener instancias de Sequelize para relaciones
    });

    // Formatear respuesta - ACTUALIZADO
    const result = bookedSeats.map(bookingSeat => ({
      booking_seat_id: bookingSeat.id,
      seat_id: bookingSeat.seat_id,
      booking_id: bookingSeat.booking_id,
      price: parseFloat(bookingSeat.price),
      row: bookingSeat.seat?.row,
      number: bookingSeat.seat?.number,
      type: bookingSeat.seat?.type,
      status: bookingSeat.seat?.status,
      booked_at: bookingSeat.created_at
    }));

    return res.status(200).json({
      success: true,
      data: {
        showtime_id: showtimeId,
        booked_seats: result,
        total_booked: result.length
      }
    });

  } catch (error) {
    console.error('Error al obtener asientos reservados:', error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
    });
  }
};

// Nuevo método para verificar disponibilidad de asientos específicos
const checkSeatsAvailability = async (req, res) => {
  try {
    const { showtimeId, seatIds } = req.body;

    if (!showtimeId || !seatIds || !Array.isArray(seatIds)) {
      return res.status(400).json({
        success: false,
        message: "showtimeId y seatIds (array) son requeridos"
      });
    }

    // Verificar asientos ya reservados
    const bookedSeats = await BookingSeat.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: {
          showtime_id: showtimeId,
          status: { [Op.in]: ['confirmed', 'pending'] }
        }
      }],
      where: {
        seat_id: { [Op.in]: seatIds }
      },
      attributes: ['seat_id'],
      raw: true
    });

    const bookedSeatIds = bookedSeats.map(bs => bs.seat_id);
    const availableSeats = seatIds.filter(seatId => !bookedSeatIds.includes(seatId));

    return res.status(200).json({
      success: true,
      data: {
        showtime_id: showtimeId,
        requested_seats: seatIds,
        available_seats: availableSeats,
        unavailable_seats: bookedSeatIds,
        all_available: bookedSeatIds.length === 0
      }
    });

  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
    });
  }
};

module.exports = {
  getBookedSeatsByShowtime,
  checkSeatsAvailability
};