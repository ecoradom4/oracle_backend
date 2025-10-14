const { BookingSeat, Booking, Seat, Showtime } = require('../models');

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

    // Validar formato UUID (opcional pero recomendado)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(showtimeId)) {
      return res.status(400).json({
        success: false,
        message: "Formato de showtimeId inválido"
      });
    }

    // Consultar asientos reservados para el showtime
    const bookedSeats = await BookingSeat.findAll({
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { 
            showtime_id: showtimeId,
            status: 'confirmed'
          },
          attributes: []
        },
        {
          model: Seat,
          as: 'seat',
          attributes: ['id', 'row', 'number', 'type']
        }
      ],
      attributes: ['seat_id']
    });

    // Formatear respuesta
    const result = bookedSeats.map(bookingSeat => ({
      seat_id: bookingSeat.seat_id,
      row: bookingSeat.seat.row,
      number: bookingSeat.seat.number,
      type: bookingSeat.seat.type
    }));

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error al obtener asientos reservados:', error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

module.exports = {
  getBookedSeatsByShowtime
};