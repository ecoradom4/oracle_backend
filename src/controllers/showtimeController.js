// src/controllers/showtimeController.js
const { Showtime, Movie, Room, Booking, Seat, BookingSeat, sequelize } = require('../models');
const { Op } = require('sequelize');

class ShowtimeController {
  // Obtener todas las funciones con filtros - ACTUALIZADO PARA ORACLE
  async getShowtimes(req, res) {
    try {
      const {
        movieId,
        roomId,
        date,
        time,
        location,
        page = 1,
        limit = 50 // Reducido para mejor performance en Oracle
      } = req.query;

      const whereClause = {};

      // Filtros básicos
      if (movieId) whereClause.movie_id = movieId;
      if (roomId) whereClause.room_id = roomId;
      if (date) whereClause.date = date;
      if (time) whereClause.time = { [Op.like]: `${time}%` };

      // Solo funciones futuras o del día actual
      const today = new Date().toISOString().split('T')[0];
      whereClause.date = { 
        [Op.gte]: today 
      };

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Incluir filtro por ubicación si se proporciona
      const includeRoom = {
        model: Room,
        as: 'room',
        attributes: ['id', 'name', 'capacity', 'type', 'location'],
        where: location ? { location } : undefined
      };

      const showtimes = await Showtime.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: ['id', 'title', 'genre', 'duration', 'rating', 'poster', 'price'],
            where: { status: 'active' } // Solo películas activas
          },
          includeRoom
        ],
        order: [
          ['date', 'ASC'],
          ['time', 'ASC']
        ]
      });

      // Agregar precios derivados de ticket - ACTUALIZADO
      const showtimesWithPrices = showtimes.rows.map(showtime => {
        const standardPrice = parseFloat(showtime.price);
        const premiumPrice = Math.round(standardPrice * 1.15 * 100) / 100; // 15% premium
        const vipPrice = Math.round(standardPrice * 1.25 * 100) / 100; // 25% VIP

        return {
          ...showtime.toJSON(),
          ticket_prices: {
            standard: standardPrice.toFixed(2),
            premium: premiumPrice.toFixed(2),
            vip: vipPrice.toFixed(2)
          },
          // Información adicional útil
          is_available: showtime.available_seats > 0,
          almost_full: showtime.available_seats <= 10
        };
      });

      res.json({
        success: true,
        data: {
          showtimes: showtimesWithPrices,
          pagination: {
            total: showtimes.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(showtimes.count / limit),
            hasNext: offset + showtimes.rows.length < showtimes.count,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo funciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener función específica por ID con detalles completos - ACTUALIZADO
  async getShowtimeById(req, res) {
    try {
      const { id } = req.params;

      const showtime = await Showtime.findByPk(id, {
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: ['id', 'title', 'genre', 'duration', 'rating', 'poster', 'description', 'price', 'status']
          },
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'name', 'capacity', 'type', 'location', 'status']
          }
        ]
      });

      if (!showtime) {
        return res.status(404).json({
          success: false,
          message: 'Función no encontrada'
        });
      }

      // Verificar que la película y sala estén activas
      if (showtime.movie.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'La película de esta función no está disponible'
        });
      }

      if (showtime.room.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'La sala de esta función no está disponible'
        });
      }

      // Obtener asientos de la sala - ACTUALIZADO
      const seats = await Seat.findAll({
        where: { 
          room_id: showtime.room_id,
          status: { [Op.ne]: 'maintenance' } // Excluir asientos en mantenimiento
        },
        attributes: ['id', 'row', 'number', 'type', 'status'],
        order: [
          ['row', 'ASC'],
          ['number', 'ASC']
        ]
      });

      // Obtener asientos reservados para esta función - ACTUALIZADO
      const bookedSeats = await BookingSeat.findAll({
        include: [{
          model: Booking,
          as: 'booking',
          where: {
            showtime_id: id,
            status: { [Op.in]: ['confirmed', 'pending'] }
          },
          attributes: []
        }],
        attributes: ['seat_id'],
        raw: true
      });

      const bookedSeatIds = bookedSeats.map(bs => bs.seat_id);

      // Preparar datos de asientos con disponibilidad
      const seatsWithAvailability = seats.map(seat => {
        const isBooked = bookedSeatIds.includes(seat.id);
        return {
          ...seat.toJSON(),
          is_available: !isBooked && seat.status === 'available',
          is_booked: isBooked,
          status: isBooked ? 'occupied' : seat.status
        };
      });

      // Calcular precios de tickets derivados - ACTUALIZADO
      const standardPrice = parseFloat(showtime.price);
      const premiumPrice = Math.round(standardPrice * 1.15 * 100) / 100;
      const vipPrice = Math.round(standardPrice * 1.25 * 100) / 100;

      const ticket_prices = {
        standard: standardPrice.toFixed(2),
        premium: premiumPrice.toFixed(2),
        vip: vipPrice.toFixed(2)
      };

      // Calcular métricas de ocupación
      const totalSeats = showtime.total_seats;
      const bookedSeatsCount = bookedSeatIds.length;
      const availableSeatsCount = totalSeats - bookedSeatsCount;
      const occupancyRate = totalSeats > 0 ? (bookedSeatsCount / totalSeats) * 100 : 0;

      // Construir respuesta completa - ACTUALIZADO NOMBRES CAMPOS
      const response = {
        id: showtime.id,
        movie_id: showtime.movie_id,
        room_id: showtime.room_id,
        date: showtime.date,
        time: showtime.time,
        price: showtime.price,
        available_seats: availableSeatsCount, // Actualizado con cálculo real
        total_seats: totalSeats,
        created_at: showtime.created_at,
        updated_at: showtime.updated_at,
        movie: showtime.movie,
        room: showtime.room,
        seats: seatsWithAvailability,
        booking_info: {
          total_seats: totalSeats,
          available_seats: availableSeatsCount,
          booked_seats: bookedSeatsCount,
          occupancy_rate: occupancyRate.toFixed(2),
          occupancy_level: occupancyRate < 50 ? 'low' : occupancyRate < 80 ? 'medium' : 'high'
        },
        ticket_prices,
        status: availableSeatsCount > 0 ? 'available' : 'sold_out'
      };

      res.json({
        success: true,
        data: { showtime: response }
      });

    } catch (error) {
      console.error('Error obteniendo función:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Crear nueva función - ACTUALIZADO
  async createShowtime(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { movie_id, room_id, date, time, price_override } = req.body;

      // Validaciones
      if (!movie_id || !room_id || !date || !time) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'movie_id, room_id, date y time son requeridos'
        });
      }

      // Validar formato de fecha y hora
      const showtimeDate = new Date(date);
      if (isNaN(showtimeDate.getTime())) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido'
        });
      }

      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(time)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Formato de hora inválido. Use HH:MM o HH:MM:SS'
        });
      }

      // Verificar que la película existe y está activa
      const movie = await Movie.findByPk(movie_id, { transaction });
      if (!movie) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      if (movie.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se pueden crear funciones para películas inactivas'
        });
      }

      // Verificar que la sala existe y está activa
      const room = await Room.findByPk(room_id, { transaction });
      if (!room) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      if (room.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se pueden crear funciones en salas inactivas'
        });
      }

      // Verificar conflicto de horarios en la misma sala
      const conflictingShowtime = await Showtime.findOne({
        where: { 
          room_id, 
          date: showtimeDate.toISOString().split('T')[0], 
          time 
        },
        transaction
      });

      if (conflictingShowtime) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: `La sala ${room.name} ya tiene una función programada para ${date} a las ${time}`
        });
      }

      // Calcular precio base - ACTUALIZADO
      let basePrice = price_override ? parseFloat(price_override) : parseFloat(movie.price);

      // Aplicar multiplicadores según tipo de sala
      switch (room.type.toLowerCase()) {
        case 'premium':
          basePrice *= 1.15;
          break;
        case '4dx':
          basePrice *= 1.20;
          break;
        case 'imax':
          basePrice *= 1.25;
          break;
        case 'vip':
          basePrice *= 1.30;
          break;
        default:
          // estándar - sin cambios
          break;
      }

      basePrice = Math.round(basePrice * 100) / 100; // Redondear a 2 decimales

      // Crear la función - ACTUALIZADO
      const showtime = await Showtime.create({
        movie_id,
        room_id,
        date: showtimeDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        time,
        price: basePrice,
        available_seats: room.capacity,
        total_seats: room.capacity
      }, { transaction });

      await transaction.commit();

      // Obtener función con detalles
      const showtimeWithDetails = await Showtime.findByPk(showtime.id, {
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: ['id', 'title', 'genre', 'duration', 'price', 'poster']
          },
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'name', 'capacity', 'location', 'type', 'status']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Función creada exitosamente',
        data: { showtime: showtimeWithDetails }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creando función:', error);
      
      // Manejar errores específicos de Oracle
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una función en esa sala con la misma fecha y hora'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Actualizar función - ACTUALIZADO
  async updateShowtime(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const updateData = req.body;

      const showtime = await Showtime.findByPk(id, { transaction });
      if (!showtime) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Función no encontrada'
        });
      }

      // Verificar si hay reservas activas
      const activeBookings = await Booking.count({
        where: {
          showtime_id: id,
          status: { [Op.in]: ['confirmed', 'pending'] }
        },
        transaction
      });

      // No permitir cambios que afecten reservas existentes
      if (activeBookings > 0) {
        const restrictedFields = ['room_id', 'date', 'time', 'price'];
        const hasRestrictedChange = Object.keys(updateData).some(field => 
          restrictedFields.includes(field)
        );

        if (hasRestrictedChange) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'No se puede modificar una función con reservas activas',
            active_bookings: activeBookings
          });
        }
      }

      // Verificar conflicto de horarios si se cambia sala/fecha/hora
      if (updateData.room_id || updateData.date || updateData.time) {
        const room_id = updateData.room_id || showtime.room_id;
        const date = updateData.date || showtime.date;
        const time = updateData.time || showtime.time;

        const conflictingShowtime = await Showtime.findOne({
          where: {
            room_id,
            date,
            time,
            id: { [Op.ne]: id }
          },
          transaction
        });

        if (conflictingShowtime) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: 'Conflicto de horario con otra función existente'
          });
        }
      }

      await showtime.update(updateData, { transaction });
      await transaction.commit();

      const updatedShowtime = await Showtime.findByPk(id, {
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: ['id', 'title', 'genre', 'duration', 'poster']
          },
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'name', 'capacity', 'location', 'type']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Función actualizada exitosamente',
        data: { showtime: updatedShowtime }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error actualizando función:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Conflicto de horario con otra función existente'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Eliminar función - ACTUALIZADO
  async deleteShowtime(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const showtime = await Showtime.findByPk(id, { 
        include: [{
          model: Room,
          as: 'room',
          attributes: ['name']
        }],
        transaction 
      });
      
      if (!showtime) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Función no encontrada'
        });
      }

      // Verificar si hay reservas activas
      const activeBookings = await Booking.count({
        where: {
          showtime_id: id,
          status: { [Op.in]: ['confirmed', 'pending'] }
        },
        transaction
      });

      if (activeBookings > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la función. Tiene ${activeBookings} reserva(s) activa(s).`,
          active_bookings: activeBookings
        });
      }

      await showtime.destroy({ transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: `Función eliminada exitosamente de la sala ${showtime.room.name}`
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error eliminando función:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener asientos disponibles para una función - ACTUALIZADO
  async getAvailableSeats(req, res) {
    try {
      const { id } = req.params;

      const showtime = await Showtime.findByPk(id, {
        include: [{
          model: Room,
          as: 'room',
          include: [{
            model: Seat,
            as: 'seats',
            where: { status: { [Op.ne]: 'maintenance' } }, // Excluir mantenimiento
            attributes: ['id', 'row', 'number', 'type', 'status'],
            order: [['row', 'ASC'], ['number', 'ASC']]
          }]
        }]
      });

      if (!showtime) {
        return res.status(404).json({
          success: false,
          message: 'Función no encontrada'
        });
      }

      // Obtener asientos ya reservados - OPTIMIZADO
      const bookedSeats = await BookingSeat.findAll({
        include: [{
          model: Booking,
          as: 'booking',
          where: {
            showtime_id: id,
            status: { [Op.in]: ['confirmed', 'pending'] }
          },
          attributes: []
        }],
        attributes: ['seat_id'],
        raw: true
      });

      const bookedSeatIds = new Set(bookedSeats.map(bs => bs.seat_id));

      // Marcar asientos ocupados y calcular disponibilidad
      const seatsWithAvailability = showtime.room.seats.map(seat => {
        const isBooked = bookedSeatIds.has(seat.id);
        return {
          ...seat.toJSON(),
          is_available: !isBooked,
          current_status: isBooked ? 'occupied' : seat.status
        };
      });

      const availableSeats = seatsWithAvailability.filter(seat => seat.is_available);
      const occupiedSeats = seatsWithAvailability.filter(seat => !seat.is_available);

      res.json({
        success: true,
        data: {
          showtime: {
            id: showtime.id,
            date: showtime.date,
            time: showtime.time,
            price: showtime.price,
            available_seats: availableSeats.length,
            total_seats: showtime.total_seats
          },
          room: {
            id: showtime.room.id,
            name: showtime.room.name,
            capacity: showtime.room.capacity,
            type: showtime.room.type,
            location: showtime.room.location
          },
          seats: {
            total: seatsWithAvailability.length,
            available: availableSeats.length,
            occupied: occupiedSeats.length,
            list: seatsWithAvailability
          },
          summary: {
            availability_percentage: ((availableSeats.length / seatsWithAvailability.length) * 100).toFixed(2),
            almost_full: availableSeats.length <= 10
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo asientos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Crear múltiples funciones programadas - ACTUALIZADO PARA ORACLE
  async scheduleShowtimes(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const {
        movie_id,
        room_id,
        start_date,
        end_date,
        times,
        price_override,
        excluded_days = []
      } = req.body;

      // Validación de datos de entrada - MEJORADA
      if (!movie_id || !room_id || !start_date || !end_date || !times || !Array.isArray(times)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Campos requeridos: movie_id, room_id, start_date, end_date y times[]'
        });
      }

      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Rango de fechas inválido. Use formato YYYY-MM-DD'
        });
      }

      // Validar formato de horas
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (times.some(t => !timeRegex.test(t))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Formato de hora inválido. Use HH:mm (ejemplo: "14:30")'
        });
      }

      // Validar entidades base
      const movie = await Movie.findByPk(movie_id, { transaction });
      const room = await Room.findByPk(room_id, { transaction });

      if (!movie || !room) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: !movie ? 'Película no encontrada' : 'Sala no encontrada'
        });
      }

      if (movie.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se pueden programar funciones para películas inactivas'
        });
      }

      // Calcular precio base - ACTUALIZADO
      let basePrice = price_override ? parseFloat(price_override) : parseFloat(movie.price);
      
      switch ((room.type || '').toLowerCase()) {
        case 'premium': basePrice *= 1.15; break;
        case '4dx': basePrice *= 1.20; break;
        case 'imax': basePrice *= 1.25; break;
        case 'vip': basePrice *= 1.30; break;
      }
      
      basePrice = Math.round(basePrice * 100) / 100;

      // Helper: obtener nombre de día
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const normalizedExcludedDays = excluded_days.map(d => d.toLowerCase());

      const showtimesToCreate = [];
      const skippedShowtimes = [];
      const errors = [];

      // Generar fechas dentro del rango
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayName = dayNames[d.getDay()];
        const dateStr = d.toISOString().split('T')[0];

        // Saltar días excluidos
        if (normalizedExcludedDays.includes(dayName)) {
          skippedShowtimes.push({ 
            date: dateStr, 
            reason: 'Día excluido de la programación' 
          });
          continue;
        }

        for (const time of times) {
          try {
            // Verificar conflicto
            const existing = await Showtime.findOne({
              where: { room_id, date: dateStr, time },
              transaction
            });

            if (existing) {
              skippedShowtimes.push({ 
                date: dateStr, 
                time, 
                reason: 'Conflicto de horario' 
              });
              continue;
            }

            showtimesToCreate.push({
              movie_id,
              room_id,
              date: dateStr,
              time,
              price: basePrice,
              available_seats: room.capacity,
              total_seats: room.capacity
            });
          } catch (error) {
            errors.push({ date: dateStr, time, error: error.message });
          }
        }
      }

      // Validar si hay algo para crear
      if (showtimesToCreate.length === 0) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'No se crearon funciones. Todas las combinaciones tienen conflictos o fueron excluidas.',
          summary: {
            total_attempted: (times.length * Math.ceil((end - start) / (1000 * 60 * 60 * 24))),
            skipped: skippedShowtimes.length,
            errors: errors.length
          },
          details: {
            skipped: skippedShowtimes.slice(0, 10), // Limitar para no sobrecargar respuesta
            errors: errors.slice(0, 5)
          }
        });
      }

      // Insertar funciones
      const createdShowtimes = await Showtime.bulkCreate(showtimesToCreate, { 
        transaction,
        returning: true 
      });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `Programación completada: ${createdShowtimes.length} funciones creadas`,
        data: {
          created_count: createdShowtimes.length,
          skipped_count: skippedShowtimes.length,
          error_count: errors.length,
          date_range: {
            start: start_date,
            end: end_date,
            total_days: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
          },
          room: { id: room.id, name: room.name, capacity: room.capacity },
          movie: { id: movie.id, title: movie.title, duration: movie.duration },
          schedule: {
            times: times,
            excluded_days: excluded_days,
            base_price: basePrice
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error programando funciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor durante la programación',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }
}

module.exports = new ShowtimeController();