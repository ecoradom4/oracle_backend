// src/controllers/roomController.js
const { Room, Seat, Showtime, sequelize } = require('../models');
const { Op } = require('sequelize');

class RoomController {
  constructor() {
    this.generateSeats = this.generateSeats.bind(this);
    this.createRoom = this.createRoom.bind(this);
    this.updateRoom = this.updateRoom.bind(this);
  }

  // Obtener todas las salas - ACTUALIZADO PARA ORACLE
  async getRooms(req, res) {
    try {
      const { search, status, type, location, page = 1, limit = 100 } = req.query;

      const whereClause = {};
      
      // Filtro por búsqueda - ACTUALIZADO (sin iLike)
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) whereClause.status = status;
      if (type) whereClause.type = type;
      if (location) whereClause.location = location;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const rooms = await Room.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status'],
          order: [['row', 'ASC'], ['number', 'ASC']]
        }],
        order: [['name', 'ASC']]
      });

      // Enriquecer datos de salas
      const roomsWithStats = await Promise.all(
        rooms.rows.map(async (room) => {
          const roomData = room.toJSON();
          
          // Contar asientos por tipo
          const seatStats = roomData.seats.reduce((acc, seat) => {
            acc.total++;
            acc[seat.type] = (acc[seat.type] || 0) + 1;
            acc[seat.status] = (acc[seat.status] || 0) + 1;
            return acc;
          }, { total: 0 });

          // Verificar funciones futuras
          const today = new Date().toISOString().split('T')[0];
          const futureShowtimes = await Showtime.count({
            where: {
              room_id: room.id,
              date: { [Op.gte]: today }
            }
          });

          return {
            ...roomData,
            capacity: parseInt(roomData.capacity),
            stats: {
              seats: seatStats,
              future_showtimes: futureShowtimes,
              utilization: futureShowtimes > 0 ? 'high' : 'low'
            }
          };
        })
      );

      res.json({
        success: true,
        data: {
          rooms: roomsWithStats,
          pagination: {
            total: rooms.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(rooms.count / limit),
            hasNext: offset + rooms.rows.length < rooms.count,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo salas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Generar asientos para una sala - ACTUALIZADO
  async generateSeats(roomId, capacity, transaction = null) {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatsPerRow = Math.ceil(capacity / rows.length);
    const seats = [];

    let seatCount = 0;
    
    for (const row of rows) {
      for (let number = 1; number <= seatsPerRow; number++) {
        if (seatCount >= capacity) break;

        let type = 'standard';
        const rowIndex = rows.indexOf(row);
        
        if (rowIndex < 2) type = 'vip';
        else if (rowIndex < 5) type = 'premium';

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

    const options = transaction ? { transaction } : {};
    await Seat.bulkCreate(seats, options);
    
    return seats.length;
  }

  // Crear nueva sala - ACTUALIZADO
  async createRoom(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { name, capacity, type, status = 'active', location } = req.body;

      if (!name || !capacity || !type || !location) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Nombre, capacidad, tipo y ubicación son requeridos'
        });
      }

      // Validar capacidad
      const capacityNum = parseInt(capacity);
      if (isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 500) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'La capacidad debe ser un número entre 1 y 500'
        });
      }

      // Verificar si ya existe una sala con ese nombre
      const existingRoom = await Room.findOne({ 
        where: { name: name.trim() },
        transaction 
      });
      
      if (existingRoom) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Ya existe una sala con ese nombre'
        });
      }

      const room = await Room.create({
        name: name.trim(),
        capacity: capacityNum,
        type,
        status,
        location
      }, { transaction });

      // Crear asientos automáticamente
      const seatsCreated = await this.generateSeats(room.id, room.capacity, transaction);

      await transaction.commit();

      const roomWithSeats = await Room.findByPk(room.id, {
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status'],
          order: [['row', 'ASC'], ['number', 'ASC']]
        }]
      });

      res.status(201).json({
        success: true,
        message: `Sala creada exitosamente con ${seatsCreated} asientos`,
        data: { room: roomWithSeats }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creando sala:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una sala con ese nombre'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Actualizar sala - ACTUALIZADO
  async updateRoom(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const updateData = req.body;

      const room = await Room.findByPk(id, { transaction });
      if (!room) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      // Validar capacidad si se actualiza
      if (updateData.capacity) {
        const capacityNum = parseInt(updateData.capacity);
        if (isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 500) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'La capacidad debe ser un número entre 1 y 500'
          });
        }
        updateData.capacity = capacityNum;
      }

      // Verificar conflicto de nombre si se actualiza
      if (updateData.name && updateData.name !== room.name) {
        const existingRoom = await Room.findOne({
          where: { name: updateData.name.trim() },
          transaction
        });
        
        if (existingRoom) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: 'Ya existe una sala con ese nombre'
          });
        }
        updateData.name = updateData.name.trim();
      }

      // Si cambia la capacidad, regenerar asientos
      if (updateData.capacity && updateData.capacity !== room.capacity) {
        // Eliminar asientos existentes
        await Seat.destroy({ 
          where: { room_id: id },
          transaction 
        });
        
        // Crear nuevos asientos
        await this.generateSeats(id, updateData.capacity, transaction);
      }

      await room.update(updateData, { transaction });
      await transaction.commit();

      const updatedRoom = await Room.findByPk(id, {
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status'],
          order: [['row', 'ASC'], ['number', 'ASC']]
        }]
      });

      res.json({
        success: true,
        message: 'Sala actualizada exitosamente',
        data: { room: updatedRoom }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error actualizando sala:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Conflicto con datos existentes'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Eliminar sala - ACTUALIZADO
  async deleteRoom(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;

      const room = await Room.findByPk(id, { transaction });
      if (!room) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      const today = new Date().toISOString().split('T')[0];

      // Verificar si tiene funciones programadas futuras
      const futureShowtimes = await Showtime.count({
        where: { 
          room_id: id,
          date: { [Op.gte]: today }
        },
        transaction
      });

      if (futureShowtimes > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la sala. Tiene ${futureShowtimes} función(es) programada(s).`
        });
      }

      // Cambiar estado a inactive en lugar de eliminar (soft delete)
      await room.update({ status: 'inactive' }, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: 'Sala desactivada exitosamente'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error eliminando sala:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener ubicaciones disponibles - ACTUALIZADO PARA ORACLE
  async getLocations(req, res) {
    try {
      const locations = await Room.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('location')), 'location']
        ],
        where: { status: 'active' },
        order: [['location', 'ASC']],
        raw: true
      });

      const locationList = locations.map(l => l.location).filter(Boolean);

      // Estadísticas por ubicación
      const locationStats = await Room.findAll({
        attributes: [
          'location',
          [sequelize.fn('COUNT', sequelize.col('id')), 'room_count'],
          [sequelize.fn('SUM', sequelize.col('capacity')), 'total_capacity']
        ],
        where: { status: 'active' },
        group: ['location'],
        order: [['location', 'ASC']],
        raw: true
      });

      res.json({
        success: true,
        data: { 
          locations: locationList,
          statistics: locationStats
        }
      });

    } catch (error) {
      console.error('Error obteniendo ubicaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Nuevo método: Obtener detalles completos de una sala
  async getRoomDetails(req, res) {
    try {
      const { id } = req.params;

      const room = await Room.findByPk(id, {
        include: [{
          model: Seat,
          as: 'seats',
          attributes: ['id', 'row', 'number', 'type', 'status'],
          order: [['row', 'ASC'], ['number', 'ASC']]
        }, {
          model: Showtime,
          as: 'showtimes',
          attributes: ['id', 'date', 'time', 'movie_id'],
          where: {
            date: { [Op.gte]: new Date().toISOString().split('T')[0] }
          },
          required: false,
          limit: 10 // Limitar funciones futuras
        }]
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala no encontrada'
        });
      }

      res.json({
        success: true,
        data: { room }
      });

    } catch (error) {
      console.error('Error obteniendo detalles de sala:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }
}

module.exports = new RoomController();