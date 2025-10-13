// src/controllers/showtimeController.js
const { Showtime, Movie, Room, Booking, Seat, BookingSeat, sequelize } = require('../models');
const { Op } = require('sequelize');

class ShowtimeController {
  // Obtener todas las funciones con filtros
  async getShowtimes(req, res) {
    try {
      const { 
        movieId, 
        roomId, 
        date, 
        time,
        page = 1, 
        limit = 20 
      } = req.query;

      const whereClause = {};
      
      if (movieId) whereClause.movie_id = movieId;
      if (roomId) whereClause.room_id = roomId;
      if (date) whereClause.date = date;
      if (time) whereClause.time = time;

      // Solo funciones futuras por defecto
      whereClause.date = { [Op.gte]: new Date() };

      const offset = (page - 1) * limit;

      const showtimes = await Showtime.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: ['id', 'title', 'genre', 'duration', 'rating', 'poster']
          },
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'name', 'capacity', 'type', 'location']
          }
        ],
        order: [
          ['date', 'ASC'],
          ['time', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: {
          showtimes: showtimes.rows,
          pagination: {
            total: showtimes.count,
            page: parseInt(page),
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
        error: error.message
      });
    }
  }

  // Crear nueva función
  async createShowtime(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { movie_id, room_id, date, time, price } = req.body;

      // Validaciones
      if (!movie_id || !room_id || !date || !time || !price) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar que la película existe
      const movie = await Movie.findByPk(movie_id, { transaction });
      if (!movie) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      // Verificar que la sala existe
      const room = await Room.findByPk(room_id, { transaction });
      if (!room) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      // Verificar conflicto de horarios en la misma sala
      const conflictingShowtime = await Showtime.findOne({
        where: {
          room_id,
          date,
          time,
          id: { [Op.not]: req.params.id } // Excluir la función actual en updates
        },
        transaction
      });

      if (conflictingShowtime) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: `La ${room.name} ya está ocupada el ${date} a las ${time}`
        });
      }

      // Crear la función
      const showtime = await Showtime.create({
        movie_id,
        room_id,
        date,
        time,
        price: parseFloat(price),
        available_seats: room.capacity,
        total_seats: room.capacity
      }, { transaction });

      await transaction.commit();

      const showtimeWithDetails = await Showtime.findByPk(showtime.id, {
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: ['id', 'title', 'genre', 'duration']
          },
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'name', 'capacity', 'location']
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
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar función
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

      if (activeBookings > 0 && (updateData.room_id || updateData.date || updateData.time)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se puede modificar una función con reservas activas'
        });
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
            message: 'Conflicto de horario con otra función'
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
            attributes: ['id', 'title', 'genre', 'duration']
          },
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'name', 'capacity', 'location']
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
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar función
  async deleteShowtime(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;

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

      if (activeBookings > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar una función con reservas activas'
        });
      }

      await showtime.destroy({ transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: 'Función eliminada exitosamente'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error eliminando función:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener asientos disponibles para una función
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
            attributes: ['id', 'row', 'number', 'type', 'status']
          }]
        }]
      });

      if (!showtime) {
        return res.status(404).json({
          success: false,
          message: 'Función no encontrada'
        });
      }

      // Obtener asientos ya reservados
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

      // Marcar asientos ocupados
      const seatsWithAvailability = showtime.room.seats.map(seat => ({
        ...seat.toJSON(),
        status: bookedSeatIds.includes(seat.id) ? 'occupied' : seat.status
      }));

      res.json({
        success: true,
        data: {
          showtime: {
            id: showtime.id,
            date: showtime.date,
            time: showtime.time,
            price: showtime.price,
            available_seats: showtime.available_seats
          },
          room: {
            id: showtime.room.id,
            name: showtime.room.name,
            capacity: showtime.room.capacity
          },
          seats: seatsWithAvailability
        }
      });

    } catch (error) {
      console.error('Error obteniendo asientos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new ShowtimeController();