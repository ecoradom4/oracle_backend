// src/controllers/roomController.js
const { Room, Seat, Showtime, sequelize } = require('../models');
const { Op } = require('sequelize');

class RoomController {
  // Obtener todas las salas
    async getRooms(req, res) {
    try {
      const { search, status, type, location } = req.query;

      const whereClause = {};
      
      // CORRECCIÓN: Para campos ENUM, necesitamos usar una condición diferente
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          // Para el campo ENUM 'location', usamos una comparación exacta o convertimos a texto
          sequelize.where(
            sequelize.cast(sequelize.col('Room.location'), 'TEXT'),
            { [Op.iLike]: `%${search}%` }
          )
        ];
      }

      if (status) whereClause.status = status;
      if (type) whereClause.type = type;
      if (location) whereClause.location = location;

      console.log('Buscando salas con filtros:', { search, status, type, location });

      const rooms = await Room.findAll({
        where: whereClause,
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status']
        }],
        order: [['name', 'ASC']]
      });

      res.json({
        success: true,
        data: { rooms }
      });

    } catch (error) {
      console.error('Error obteniendo salas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nueva sala
  async createRoom(req, res) {
    try {
      const { name, capacity, type, status = 'active', location } = req.body;

      if (!name || !capacity || !type || !location) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar si ya existe una sala con ese nombre
      const existingRoom = await Room.findOne({ where: { name } });
      if (existingRoom) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una sala con ese nombre'
        });
      }

      const room = await Room.create({
        name,
        capacity: parseInt(capacity),
        type,
        status,
        location
      });

      // Crear asientos automáticamente
      await this.generateSeats(room.id, room.capacity);

      const roomWithSeats = await Room.findByPk(room.id, {
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Sala creada exitosamente',
        data: { room: roomWithSeats }
      });

    } catch (error) {
      console.error('Error creando sala:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Generar asientos para una sala
  async generateSeats(roomId, capacity) {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatsPerRow = Math.ceil(capacity / rows.length);
    const seats = [];

    let seatCount = 0;
    
    for (const row of rows) {
      for (let number = 1; number <= seatsPerRow; number++) {
        if (seatCount >= capacity) break;

        let type = 'standard';
        if (rows.indexOf(row) < 2) type = 'vip';
        else if (rows.indexOf(row) < 5) type = 'premium';

        seats.push({
          room_id: roomId,
          row,
          number,
          type,
          status: 'available'
        });

        seatCount++;
      }
      if (seatCount >= capacity) break;
    }

    await Seat.bulkCreate(seats);
  }

  // Actualizar sala
  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const room = await Room.findByPk(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      // Si cambia la capacidad, regenerar asientos
      if (updateData.capacity && updateData.capacity !== room.capacity) {
        await Seat.destroy({ where: { room_id: id } });
        await this.generateSeats(id, parseInt(updateData.capacity));
      }

      await room.update(updateData);

      const updatedRoom = await Room.findByPk(id, {
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status']
        }]
      });

      res.json({
        success: true,
        message: 'Sala actualizada exitosamente',
        data: { room: updatedRoom }
      });

    } catch (error) {
      console.error('Error actualizando sala:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar sala
  async deleteRoom(req, res) {
    try {
      const { id } = req.params;

      const room = await Room.findByPk(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      // Verificar si tiene funciones programadas
      const futureShowtimes = await Showtime.count({
        where: { 
          room_id: id,
          date: { [Op.gte]: new Date() }
        }
      });

      if (futureShowtimes > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar una sala con funciones programadas'
        });
      }

      await room.destroy();

      res.json({
        success: true,
        message: 'Sala eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando sala:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener ubicaciones disponibles
  async getLocations(req, res) {
    try {
      const locations = await Room.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('location')), 'location']
        ],
        order: [['location', 'ASC']]
      });

      const locationList = locations.map(l => l.location);

      res.json({
        success: true,
        data: { locations: locationList }
      });

    } catch (error) {
      console.error('Error obteniendo ubicaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new RoomController();