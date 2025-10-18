const PDFService = require('../services/pdfService');
const ExcelService = require('../services/excelService');
const path = require('path');

const {
  Booking,
  Showtime,
  Movie,
  Room,
  BookingSeat, 
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

      // Función helper para formatear decimales de forma segura
      const formatDecimal = (value) => {
        if (value === null || value === undefined || isNaN(value)) return 0;
        return parseFloat(Number(value).toFixed(2));
      };

      res.json({
        success: true,
        data: {
          stats: {
            totalSales: formatDecimal(totalSales),
            totalTickets: totalTickets || 0,
            averagePrice: formatDecimal(averagePrice?.avg_price),
            activeMovies: activeMovies || 0,
            totalUsers: totalUsers || 0,
            occupancyRate: formatDecimal(occupancyRate),
            salesGrowth: formatDecimal(salesGrowth)
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

      // Formatear las ventas a 2 decimales
      const formattedSales = salesByMovie.map(movie => ({
        ...movie,
        totalSales: parseFloat(Number(movie.totalSales || 0).toFixed(2))
      }));

      res.json({
        success: true,
        data: { salesByMovie: formattedSales }
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
      const { period = 'week' } = req.query;
      const dateRange = DashboardController.getDateRange(period);

      const dailyTrends = await Booking.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('purchase_date')), 'date'],
          [sequelize.fn('SUM', sequelize.col('total_price')), 'dailySales'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'dailyTickets']
        ],
        where: {
          status: 'confirmed',
          purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        group: [sequelize.fn('DATE', sequelize.col('purchase_date'))],
        order: [[sequelize.fn('DATE', sequelize.col('purchase_date')), 'ASC']],
        raw: true
      }).catch(() => []);

      // Generar datos para todos los días del período, incluso si no hay ventas
      const allDates = [];
      const currentDate = new Date(dateRange.start);

      while (currentDate <= dateRange.end) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Combinar datos reales con fechas del período
      const formattedTrends = allDates.map(date => {
        const dateString = date.toISOString().split('T')[0];

        // Buscar datos para esta fecha - manejar diferentes formatos de fecha
        const trendData = dailyTrends.find(trend => {
          let trendDateString;

          // Manejar diferentes formatos de fecha que puede devolver la base de datos
          if (trend.date instanceof Date) {
            trendDateString = trend.date.toISOString().split('T')[0];
          } else if (typeof trend.date === 'string') {
            // Si es string, tomar solo la parte de la fecha
            trendDateString = trend.date.split('T')[0];
          } else {
            // Si es otro formato, convertirlo a string y tomar la fecha
            trendDateString = new Date(trend.date).toISOString().split('T')[0];
          }

          return trendDateString === dateString;
        });

        return {
          fecha: date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            weekday: 'short'
          }),
          ventas: trendData ? parseFloat(Number(trendData.dailySales || 0).toFixed(2)) : 0,
          boletos: trendData ? trendData.dailyTickets || 0 : 0,
          fullDate: dateString
        };
      });

      res.json({
        success: true,
        data: {
          dailyTrends: formattedTrends,
          message: formattedTrends.every(t => t.ventas === 0 && t.boletos === 0) ?
            'No hay datos de tendencias para el período seleccionado' : undefined
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

  // Ocupación por sala basada en reservas confirmadas
async getRoomOccupancy(req, res) {
  try {
    const { location, period = 'day', customDate } = req.query; // period: day, week, month, year

    // Construir cláusula WHERE para salas
    const roomWhereClause = {};
    if (location) {
      roomWhereClause.location = location;
    }

    // Obtener todas las salas
    const allRooms = await Room.findAll({
      attributes: ['id', 'name', 'capacity', 'location', 'type', 'status'],
      where: roomWhereClause,
      raw: true
    }).catch(() => []);

    if (!allRooms || allRooms.length === 0) {
      return res.json({
        success: true,
        data: {
          roomOccupancy: [],
          filterApplied: {
            location: location || null,
            period: period,
            customDate: customDate || null
          },
          summary: {
            totalRooms: 0,
            roomsWithShowtimes: 0,
            totalShowtimes: 0,
            overallAvgOccupancy: 0,
            totalRevenue: 0
          },
          message: location ? `No hay salas en la ubicación '${location}'` : 'No hay salas registradas'
        }
      });
    }

    const roomIds = allRooms.map(room => room.id);

    // Calcular fechas según el período
    const dateRange = DashboardController.getOccupancyDateRange(period, customDate);
    const { startDate, endDate, periodLabel } = dateRange;

    // Obtener funciones dentro del rango de fechas
    const showtimesInRange = await Showtime.findAll({
      attributes: ['id', 'room_id', 'date', 'time', 'price', 'total_seats'],
      where: {
        room_id: { [Op.in]: roomIds },
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['name', 'location', 'type']
        },
        {
          model: Movie,
          as: 'movie',
          attributes: ['title', 'genre', 'duration']
        }
      ],
      raw: false
    }).catch(() => []);

    if (showtimesInRange.length === 0) {
      return res.json({
        success: true,
        data: {
          roomOccupancy: allRooms.map(room => ({
            ...room,
            totalShowtimes: 0,
            avgOccupancy: 0,
            maxOccupancy: 0,
            minOccupancy: 0,
            totalRevenue: 0,
            occupancyCounts: { low: 0, medium: 0, high: 0, full: 0 },
            occupancyStatus: 'low',
            hasShowtimes: false,
            showtimes: []
          })),
          filterApplied: {
            location: location || null,
            period: period,
            customDate: customDate || null,
            dateRange: {
              start: startDate,
              end: endDate,
              label: periodLabel
            }
          },
          summary: {
            totalRooms: allRooms.length,
            roomsWithShowtimes: 0,
            totalShowtimes: 0,
            overallAvgOccupancy: 0,
            totalRevenue: 0
          },
          message: `No hay funciones programadas para el período ${periodLabel}`
        }
      });
    }

    const showtimeIds = showtimesInRange.map(st => st.id);

    // Obtener reservas CONFIRMADAS para estas funciones
    const confirmedBookings = await Booking.findAll({
      attributes: ['showtime_id'],
      where: {
        showtime_id: { [Op.in]: showtimeIds },
        status: 'confirmed'
      },
      include: [
        {
          model: BookingSeat,
          as: 'bookingSeats',
          attributes: ['price']
        }
      ],
      raw: false
    }).catch(() => []);

    // Contar asientos ocupados por función
    const seatsByShowtime = {};
    const revenueByShowtime = {};

    confirmedBookings.forEach(booking => {
      const showtimeId = booking.showtime_id;
      
      if (!seatsByShowtime[showtimeId]) {
        seatsByShowtime[showtimeId] = 0;
        revenueByShowtime[showtimeId] = 0;
      }
      
      // Contar asientos (cada bookingSeat es un asiento)
      seatsByShowtime[showtimeId] += booking.bookingSeats.length;
      
      // Sumar ingresos
      revenueByShowtime[showtimeId] += booking.bookingSeats.reduce((sum, seat) => 
        sum + parseFloat(seat.price), 0
      );
    });

    // Procesar ocupación por sala
    const roomStats = {};
    const showtimesByRoom = {};

    showtimesInRange.forEach(showtime => {
      const roomId = showtime.room_id;
      const showtimeId = showtime.id;
      
      if (!roomStats[roomId]) {
        roomStats[roomId] = {
          totalShowtimes: 0,
          totalOccupancy: 0,
          maxOccupancy: 0,
          minOccupancy: 100,
          totalRevenue: 0,
          occupancyCounts: { low: 0, medium: 0, high: 0, full: 0 },
          showtimes: []
        };
        showtimesByRoom[roomId] = [];
      }

      const occupiedSeats = seatsByShowtime[showtimeId] || 0;
      const totalSeats = showtime.total_seats;
      const occupancyPercentage = totalSeats > 0 ? 
        parseFloat(((occupiedSeats / totalSeats) * 100).toFixed(2)) : 0;
      
      const showtimeRevenue = revenueByShowtime[showtimeId] || 0;

      // Actualizar estadísticas de la sala
      roomStats[roomId].totalShowtimes++;
      roomStats[roomId].totalOccupancy += occupancyPercentage;
      roomStats[roomId].maxOccupancy = Math.max(roomStats[roomId].maxOccupancy, occupancyPercentage);
      roomStats[roomId].minOccupancy = Math.min(roomStats[roomId].minOccupancy, occupancyPercentage);
      roomStats[roomId].totalRevenue += showtimeRevenue;

      // Contar por nivel de ocupación
      const occupancyStatus = DashboardController.getOccupancyStatus(occupancyPercentage);
      roomStats[roomId].occupancyCounts[occupancyStatus]++;

      // Agregar detalle de la función
      showtimesByRoom[roomId].push({
        showtimeId: showtime.id,
        date: showtime.date,
        time: showtime.time,
        movieTitle: showtime.movie?.title || 'Desconocida',
        movieGenre: showtime.movie?.genre || 'No especificado',
        duration: showtime.movie?.duration || 0,
        occupiedSeats: occupiedSeats,
        totalSeats: totalSeats,
        price: showtime.price,
        occupancyPercentage: occupancyPercentage,
        revenue: parseFloat(showtimeRevenue.toFixed(2)),
        occupancyStatus: occupancyStatus
      });
    });

    // Calcular promedios y formatear respuesta
    const formattedOccupancy = allRooms.map(room => {
      const stats = roomStats[room.id];
      
      if (!stats) {
        return {
          ...room,
          totalShowtimes: 0,
          avgOccupancy: 0,
          maxOccupancy: 0,
          minOccupancy: 0,
          totalRevenue: 0,
          occupancyCounts: { low: 0, medium: 0, high: 0, full: 0 },
          occupancyStatus: 'low',
          hasShowtimes: false,
          showtimes: []
        };
      }

      const avgOccupancy = stats.totalShowtimes > 0 ? 
        parseFloat((stats.totalOccupancy / stats.totalShowtimes).toFixed(2)) : 0;

      return {
        ...room,
        totalShowtimes: stats.totalShowtimes,
        avgOccupancy: avgOccupancy,
        maxOccupancy: stats.maxOccupancy,
        minOccupancy: stats.minOccupancy === 100 ? 0 : stats.minOccupancy,
        totalRevenue: parseFloat(stats.totalRevenue.toFixed(2)),
        occupancyCounts: stats.occupancyCounts,
        occupancyStatus: DashboardController.getOccupancyStatus(avgOccupancy),
        hasShowtimes: stats.totalShowtimes > 0,
        showtimes: showtimesByRoom[room.id] || []
      };
    });

    // Calcular estadísticas generales
    const roomsWithShowtimes = formattedOccupancy.filter(room => room.hasShowtimes).length;
    const totalShowtimes = showtimesInRange.length;
    const totalRevenue = formattedOccupancy.reduce((sum, room) => sum + room.totalRevenue, 0);
    const overallAvgOccupancy = roomsWithShowtimes > 0 ? 
      formattedOccupancy.filter(room => room.hasShowtimes)
        .reduce((sum, room) => sum + room.avgOccupancy, 0) / roomsWithShowtimes : 0;

    res.json({
      success: true,
      data: {
        roomOccupancy: formattedOccupancy,
        filterApplied: {
          location: location || null,
          period: period,
          customDate: customDate || null,
          dateRange: {
            start: startDate,
            end: endDate,
            label: periodLabel
          }
        },
        summary: {
          totalRooms: allRooms.length,
          roomsWithShowtimes: roomsWithShowtimes,
          totalShowtimes: totalShowtimes,
          overallAvgOccupancy: parseFloat(overallAvgOccupancy.toFixed(2)),
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalOccupiedSeats: Object.values(seatsByShowtime).reduce((sum, seats) => sum + seats, 0)
        },
        message: `Datos de ocupación para ${periodLabel}`
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

  // Ubicaciones disponibles (mantener esta función separada)
  async getAvailableLocations(req, res) {
    try {
      const roomsWithLocations = await Room.findAll({
        attributes: ['location'],
        group: ['location'],
        raw: true
      }).catch(() => []);

      const locations = roomsWithLocations
        .map(room => room.location)
        .filter(location => location && location.trim() !== '')
        .sort();

      res.json({
        success: true,
        data: {
          locations,
          total: locations.length,
          message: locations.length === 0 ?
            'No hay ubicaciones registradas en el sistema. Agregue salas con ubicaciones primero.' :
            undefined
        }
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

  // Reporte de ventas para exportación
  async exportSalesReport(req, res) {
    try {
      const { period = 'week', format = 'excel' } = req.query;

      // Obtener todos los datos del dashboard para el período
      const dateRange = DashboardController.getDateRange(period);

      const [
        stats,
        salesByMovie,
        dailyTrends,
        genreDistribution
      ] = await Promise.all([
        // Estadísticas generales
        (async () => {
          const dateRange = DashboardController.getDateRange(period);
          const [
            totalSales,
            totalTickets,
            averagePrice,
            activeMovies
          ] = await Promise.all([
            Booking.sum('total_price', {
              where: {
                status: 'confirmed',
                purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
              }
            }).catch(() => 0),

            Booking.count({
              where: {
                status: 'confirmed',
                purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
              }
            }).catch(() => 0),

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

            Movie.count({ where: { status: 'active' } }).catch(() => 0)
          ]);

          return {
            totalSales: parseFloat(Number(totalSales).toFixed(2)),
            totalTickets: totalTickets || 0,
            averagePrice: parseFloat(Number(averagePrice?.avg_price).toFixed(2)),
            activeMovies: activeMovies || 0,
            period: period
          };
        })(),

        // Ventas por película
        (async () => {
          const sales = await Booking.findAll({
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

          return sales.map(movie => ({
            ...movie,
            totalSales: parseFloat(Number(movie.totalSales || 0).toFixed(2))
          }));
        })(),

        // Tendencias diarias
        (async () => {
          const trends = await Booking.findAll({
            attributes: [
              [sequelize.fn('DATE', sequelize.col('purchase_date')), 'date'],
              [sequelize.fn('SUM', sequelize.col('total_price')), 'dailySales'],
              [sequelize.fn('COUNT', sequelize.col('id')), 'dailyTickets']
            ],
            where: {
              status: 'confirmed',
              purchase_date: { [Op.between]: [dateRange.start, dateRange.end] }
            },
            group: [sequelize.fn('DATE', sequelize.col('purchase_date'))],
            order: [[sequelize.fn('DATE', sequelize.col('purchase_date')), 'ASC']],
            raw: true
          }).catch(() => []);

          return trends.map(trend => ({
            fecha: new Date(trend.date).toLocaleDateString('es-ES'),
            ventas: parseFloat(Number(trend.dailySales || 0).toFixed(2)),
            boletos: trend.dailyTickets || 0,
            fullDate: trend.date
          }));
        })(),

        // Distribución por género
        (async () => {
          const distribution = await Booking.findAll({
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

          const totalBookings = distribution.reduce((sum, item) => sum + parseInt(item.bookingCount || 0), 0);

          return distribution.map(item => ({
            name: item.genre || 'Desconocido',
            value: totalBookings > 0 ?
              Math.round((parseInt(item.bookingCount || 0) / totalBookings) * 100) : 0
          }));
        })()
      ]);

      const reportData = {
        metadata: {
          title: `Reporte de Ventas - ${period}`,
          period: period,
          generatedAt: new Date().toLocaleString('es-GT'),
          dateRange: {
            start: dateRange.start.toLocaleDateString('es-GT'),
            end: dateRange.end.toLocaleDateString('es-GT')
          }
        },
        stats,
        salesByMovie,
        dailyTrends,
        genreDistribution
      };

      // Generar el reporte según el formato solicitado
      if (format === 'pdf') {
        const pdfPath = await PDFService.generateSalesReport(reportData, period);
        const fullPath = path.join(__dirname, '../..', pdfPath);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${period}.pdf`);

        return res.sendFile(fullPath);
      } else {
        // Formato Excel/JSON por defecto
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${period}.xlsx`);

        const excelBuffer = await ExcelService.generateSalesReport(reportData, period);
        return res.send(excelBuffer);
      }

    } catch (error) {
      console.error('Error generando reporte de ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando reporte de ventas',
        error: error.message
      });
    }
  }

  // Métodos auxiliares
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
      case 'year':
        days = previous ? -730 : -365;
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
  // NUEVO método para análisis absolutos de ocupación
static getOccupancyDateRange(period, customDate = null) {
  const now = new Date();
  let startDate, endDate, periodLabel;

  if (customDate) {
    // Fecha personalizada específica
    const custom = new Date(customDate);
    startDate = custom.toISOString().split('T')[0];
    endDate = startDate;
    periodLabel = custom.toLocaleDateString('es-ES');
  } else {
    switch (period) {
      case 'day':
        // Día actual
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
        periodLabel = 'hoy';
        break;
      
      case 'week':
        // Semana actual (lunes a domingo)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        startDate = startOfWeek.toISOString().split('T')[0];
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endDate = endOfWeek.toISOString().split('T')[0];
        periodLabel = 'esta semana';
        break;
      
      case 'month':
        // Mes actual
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        periodLabel = 'este mes';
        break;
      
      case 'year':
        // Año actual
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        periodLabel = 'este año';
        break;

      case 'future':
        // Solo funciones futuras (desde mañana)
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        startDate = tomorrow.toISOString().split('T')[0];
        endDate = new Date(now.getFullYear() + 1, 11, 31).toISOString().split('T')[0]; // Hasta fin del próximo año
        periodLabel = 'futuro';
        break;

      case 'past':
        // Solo funciones pasadas (hasta ayer)
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]; // Desde inicio del año pasado
        endDate = yesterday.toISOString().split('T')[0];
        periodLabel = 'pasado';
        break;
      
      default:
        // Por defecto: día actual
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
        periodLabel = 'hoy';
    }
  }

  return { 
    startDate, 
    endDate, 
    periodLabel,
    start: new Date(startDate),
    end: new Date(endDate + 'T23:59:59.999Z')
  };
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