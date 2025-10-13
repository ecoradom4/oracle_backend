// src/controllers/dashboardController.js
const { 
  Booking, 
  Showtime, 
  Movie, 
  Room, 
  User, 
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

class DashboardController {
  // Estadísticas generales
  async getDashboardStats(req, res) {
    try {
      const { period = 'week' } = req.query;
      
      // Calcular fechas según el período
      const dateRange = DashboardController.getDateRange(period);
      
      // Si no hay datos, retornar ceros en lugar de error
      const [
        totalSales,
        totalTickets,
        averagePrice,
        activeMovies,
        totalUsers,
        occupancyRate
      ] = await Promise.all([
        // Ventas totales
        Booking.sum('total_price', {
          where: {
            status: 'confirmed',
            purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
          }
        }).catch(() => 0),
        
        // Total de boletos vendidos
        Booking.count({
          where: {
            status: 'confirmed',
            purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
          }
        }).catch(() => 0),
        
        // Precio promedio
        Booking.findOne({
          attributes: [
            [sequelize.fn('AVG', sequelize.col('total_price')), 'avg_price']
          ],
          where: {
            status: 'confirmed',
            purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
          },
          raw: true
        }).catch(() => ({ avg_price: 0 })),
        
        // Películas activas
        Movie.count({ where: { status: 'active' } }).catch(() => 0),
        
        // Total de usuarios
        User.count().catch(() => 0),
        
        // Tasa de ocupación promedio
        DashboardController.getAverageOccupancy(dateRange).catch(() => 0)
      ]);

      const previousPeriodRange = DashboardController.getDateRange(period, true);
      const previousSales = await Booking.sum('total_price', {
        where: {
          status: 'confirmed',
          purchase_date: { 
            [Op.between]: [previousPeriodRange.start, previousPeriodRange.end] 
          }
        }
      }).catch(() => 0);

      const salesGrowth = previousSales ? 
        ((totalSales - previousSales) / previousSales * 100) : 0;

      res.json({
        success: true,
        data: {
          stats: {
            totalSales: totalSales || 0,
            totalTickets: totalTickets || 0,
            averagePrice: averagePrice?.avg_price || 0,
            activeMovies: activeMovies || 0,
            totalUsers: totalUsers || 0,
            occupancyRate: occupancyRate || 0,
            salesGrowth: parseFloat(salesGrowth.toFixed(2))
          },
          period,
          message: activeMovies === 0 ? 'No hay datos suficientes para mostrar estadísticas' : undefined
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Ventas por película
  async getSalesByMovie(req, res) {
    try {
      const { period = 'week' } = req.query;
      const dateRange = DashboardController.getDateRange(period);

      const salesByMovie = await Booking.findAll({
        attributes: [
          [sequelize.col('showtime.movie.title'), 'movieTitle'],
          [sequelize.fn('SUM', sequelize.col('Booking.total_price')), 'totalSales'],
          [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'ticketCount']
        ],
        include: [{
          model: Showtime,
          as: 'showtime',
          attributes: [],
          include: [{
            model: Movie,
            as: 'movie',
            attributes: []
          }]
        }],
        where: {
          status: 'confirmed',
          purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        group: ['showtime.movie.id', 'showtime.movie.title'],
        order: [[sequelize.fn('SUM', sequelize.col('Booking.total_price')), 'DESC']],
        raw: true
      }).catch(() => []);

      // Si no hay datos, retornar array vacío
      if (!salesByMovie || salesByMovie.length === 0) {
        return res.json({
          success: true,
          data: { 
            salesByMovie: [],
            message: 'No hay datos de ventas para el período seleccionado'
          }
        });
      }

      res.json({
        success: true,
        data: { salesByMovie }
      });

    } catch (error) {
      console.error('Error obteniendo ventas por película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Tendencias diarias
  async getDailyTrends(req, res) {
    try {
      const { days = 7 } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const dailyTrends = await Booking.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('purchase_date')), 'date'],
          [sequelize.fn('SUM', sequelize.col('total_price')), 'dailySales'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'dailyTickets']
        ],
        where: {
          status: 'confirmed',
          purchase_date: { [Op.between]: [startDate, endDate] }
        },
        group: [sequelize.fn('DATE', sequelize.col('purchase_date'))],
        order: [[sequelize.fn('DATE', sequelize.col('purchase_date')), 'ASC']],
        raw: true
      }).catch(() => []);

      // Si no hay datos, generar datos vacíos para los últimos días
      let formattedTrends = [];
      if (!dailyTrends || dailyTrends.length === 0) {
        for (let i = parseInt(days) - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          formattedTrends.push({
            fecha: date.toLocaleDateString('es-ES', { weekday: 'short' }),
            ventas: 0,
            boletos: 0
          });
        }
      } else {
        // Formatear datos existentes
        formattedTrends = dailyTrends.map(trend => ({
          fecha: new Date(trend.date).toLocaleDateString('es-ES', { weekday: 'short' }),
          ventas: parseFloat(trend.dailySales) || 0,
          boletos: trend.dailyTickets || 0
        }));
      }

      res.json({
        success: true,
        data: { 
          dailyTrends: formattedTrends,
          message: formattedTrends.every(t => t.ventas === 0) ? 'No hay datos de tendencias para mostrar' : undefined
        }
      });

    } catch (error) {
      console.error('Error obteniendo tendencias:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Distribución por género
  async getGenreDistribution(req, res) {
    try {
      const { period = 'month' } = req.query;
      const dateRange = DashboardController.getDateRange(period);

      const genreDistribution = await Booking.findAll({
        attributes: [
          [sequelize.col('showtime.movie.genre'), 'genre'],
          [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'bookingCount']
        ],
        include: [{
          model: Showtime,
          as: 'showtime',
          attributes: [],
          include: [{
            model: Movie,
            as: 'movie',
            attributes: []
          }]
        }],
        where: {
          status: 'confirmed',
          purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        group: ['showtime.movie.genre'],
        raw: true
      }).catch(() => []);

      // Si no hay datos, retornar array vacío
      if (!genreDistribution || genreDistribution.length === 0) {
        return res.json({
          success: true,
          data: { 
            genreDistribution: [],
            message: 'No hay datos de distribución por género'
          }
        });
      }

      const totalBookings = genreDistribution.reduce((sum, item) => sum + parseInt(item.bookingCount || 0), 0);
      
      const distribution = genreDistribution.map(item => ({
        name: item.genre || 'Desconocido',
        value: totalBookings > 0 ? 
          Math.round((parseInt(item.bookingCount || 0) / totalBookings) * 100) : 0
      }));

      res.json({
        success: true,
        data: { genreDistribution: distribution }
      });

    } catch (error) {
      console.error('Error obteniendo distribución por género:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Ocupación por sala
  async getRoomOccupancy(req, res) {
    try {
      const roomOccupancy = await Showtime.findAll({
        attributes: [
          [sequelize.col('room.id'), 'roomId'],
          [sequelize.col('room.name'), 'roomName'],
          [sequelize.col('room.capacity'), 'capacity'],
          [sequelize.fn('AVG', 
            sequelize.literal('(1 - (available_seats::decimal / total_seats)) * 100')
          ), 'avgOccupancy']
        ],
        include: [{
          model: Room,
          as: 'room',
          attributes: []
        }],
        where: {
          date: { [Op.gte]: new Date() }
        },
        group: ['room.id', 'room.name', 'room.capacity'],
        raw: true
      }).catch(() => []);

      // Si no hay datos, retornar array vacío
      if (!roomOccupancy || roomOccupancy.length === 0) {
        return res.json({
          success: true,
          data: { 
            roomOccupancy: [],
            message: 'No hay datos de ocupación de salas'
          }
        });
      }

      const formattedOccupancy = roomOccupancy.map(room => ({
        id: room.roomId,
        name: room.roomName,
        capacity: room.capacity,
        percentage: parseFloat(room.avgOccupancy) || 0,
        status: DashboardController.getOccupancyStatus(parseFloat(room.avgOccupancy))
      }));

      res.json({
        success: true,
        data: { 
          roomOccupancy: formattedOccupancy,
          message: formattedOccupancy.every(r => r.percentage === 0) ? 'No hay datos de ocupación para mostrar' : undefined
        }
      });

    } catch (error) {
      console.error('Error obteniendo ocupación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Métodos auxiliares ESTÁTICOS (para que puedan ser llamados sin instancia)
  static getDateRange(period, previous = false) {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    let days = 0;
    
    switch (period) {
      case 'day':
        days = previous ? -2 : -1;
        break;
      case 'week':
        days = previous ? -14 : -7;
        break;
      case 'month':
        days = previous ? -60 : -30;
        break;
      default:
        days = -7;
    }

    start.setDate(now.getDate() + days);
    end.setDate(now.getDate() - (previous ? days + 7 : 1));

    if (previous) {
      const temp = start;
      start.setDate(end.getDate() + days);
      end.setDate(temp.getDate() - 1);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  static async getAverageOccupancy(dateRange) {
    try {
      const occupancy = await Showtime.findOne({
        attributes: [
          [sequelize.fn('AVG', 
            sequelize.literal('(1 - (available_seats::decimal / total_seats)) * 100')
          ), 'avg_occupancy']
        ],
        where: {
          date: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        raw: true
      });

      return parseFloat(occupancy?.avg_occupancy) || 0;
    } catch (error) {
      console.error('Error calculando ocupación promedio:', error);
      return 0;
    }
  }

  static getOccupancyStatus(percentage) {
    if (percentage >= 80) return 'full';
    if (percentage >= 60) return 'high';
    if (percentage >= 30) return 'medium';
    return 'low';
  }
}

module.exports = new DashboardController();