// src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Estadísticas y reportes (Solo admin)
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Obtener estadísticas generales del dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: week
 *         description: Período de tiempo para las estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalSales:
 *                               type: number
 *                               description: Ventas totales en el período
 *                             totalTickets:
 *                               type: integer
 *                               description: Total de boletos vendidos
 *                             averagePrice:
 *                               type: number
 *                               description: Precio promedio por boleto
 *                             activeMovies:
 *                               type: integer
 *                               description: Películas activas en cartelera
 *                             totalUsers:
 *                               type: integer
 *                               description: Total de usuarios registrados
 *                             occupancyRate:
 *                               type: number
 *                               description: Tasa de ocupación promedio
 *                             salesGrowth:
 *                               type: number
 *                               description: Crecimiento de ventas vs período anterior
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/stats', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getDashboardStats
);

/**
 * @swagger
 * /api/dashboard/sales-by-movie:
 *   get:
 *     summary: Obtener ventas por película
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: week
 *     responses:
 *       200:
 *         description: Ventas por película obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         salesByMovie:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               movieTitle:
 *                                 type: string
 *                               totalSales:
 *                                 type: number
 *                               ticketCount:
 *                                 type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/sales-by-movie', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getSalesByMovie
);

/**
 * @swagger
 * /api/dashboard/daily-trends:
 *   get:
 *     summary: Obtener tendencias diarias de ventas
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: week
 *         description: Período de tiempo para analizar las tendencias
 *     responses:
 *       200:
 *         description: Tendencias obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         dailyTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               fecha:
 *                                 type: string
 *                                 description: Fecha formateada (ej. "01/10 lun")
 *                                 example: "01/10 lun"
 *                               ventas:
 *                                 type: number
 *                                 format: float
 *                                 description: Ventas totales del día con 2 decimales
 *                                 example: 1500.75
 *                               boletos:
 *                                 type: integer
 *                                 description: Número total de boletos vendidos
 *                                 example: 25
 *                               fullDate:
 *                                 type: string
 *                                 format: date
 *                                 description: Fecha completa en formato YYYY-MM-DD
 *                                 example: "2024-10-01"
 *                         message:
 *                           type: string
 *                           description: Mensaje informativo cuando no hay datos
 *                           example: "No hay datos de tendencias para el período seleccionado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/daily-trends', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getDailyTrends
);

/**
 * @swagger
 * /api/dashboard/genre-distribution:
 *   get:
 *     summary: Obtener distribución de ventas por género
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Distribución por género obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         genreDistribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               value:
 *                                 type: integer
 *                                 description: Porcentaje de distribución
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/genre-distribution', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getGenreDistribution
);

/**
 * @swagger
 * /api/dashboard/room-occupancy:
 *   get:
 *     summary: Obtener ocupación histórica y futura de salas basada en reservas confirmadas
 *     description: |
 *       Endpoint que calcula la ocupación real basada en reservas CONFIRMADAS.
 *       Soporta análisis histórico (día, semana, mes, año) y proyecciones futuras.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *           enum: ['Planta Baja', 'Primer Piso', 'Segundo Piso', 'Tercer Piso']
 *         description: Filtrar salas por ubicación específica (opcional)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: day
 *         description: Período de tiempo para el análisis
 *       - in: query
 *         name: customDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha específica para análisis (YYYY-MM-DD). Sobrescribe el período
 *     responses:
 *       200:
 *         description: Datos de ocupación obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         roomOccupancy:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               capacity:
 *                                 type: integer
 *                               location:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               totalShowtimes:
 *                                 type: integer
 *                               avgOccupancy:
 *                                 type: number
 *                                 format: float
 *                               maxOccupancy:
 *                                 type: number
 *                                 format: float
 *                               minOccupancy:
 *                                 type: number
 *                                 format: float
 *                               totalRevenue:
 *                                 type: number
 *                                 format: float
 *                               occupancyCounts:
 *                                 type: object
 *                               occupancyStatus:
 *                                 type: string
 *                               hasShowtimes:
 *                                 type: boolean
 *                               showtimes:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     showtimeId:
 *                                       type: string
 *                                       format: uuid
 *                                     date:
 *                                       type: string
 *                                       format: date
 *                                     time:
 *                                       type: string
 *                                       format: time
 *                                     movieTitle:
 *                                       type: string
 *                                     occupiedSeats:
 *                                       type: integer
 *                                     totalSeats:
 *                                       type: integer
 *                                     occupancyPercentage:
 *                                       type: number
 *                                       format: float
 *                                     revenue:
 *                                       type: number
 *                                       format: float
 *                                     occupancyStatus:
 *                                       type: string
 *                         filterApplied:
 *                           type: object
 *                           properties:
 *                             location:
 *                               type: string
 *                               nullable: true
 *                             period:
 *                               type: string
 *                             customDate:
 *                               type: string
 *                               nullable: true
 *                             dateRange:
 *                               type: object
 *                               properties:
 *                                 start:
 *                                   type: string
 *                                   format: date
 *                                 end:
 *                                   type: string
 *                                   format: date
 *                                 label:
 *                                   type: string
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalRooms:
 *                               type: integer
 *                             roomsWithShowtimes:
 *                               type: integer
 *                             totalShowtimes:
 *                               type: integer
 *                             overallAvgOccupancy:
 *                               type: number
 *                               format: float
 *                             totalRevenue:
 *                               type: number
 *                               format: float
 *                             totalOccupiedSeats:
 *                               type: integer
 */
router.get(
  '/room-occupancy', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getRoomOccupancy
);

/**
 * @swagger
 * /api/dashboard/locations:
 *   get:
 *     summary: Obtener lista de ubicaciones disponibles de salas
 *     description: Endpoint específico para obtener solo las ubicaciones disponibles, útil para dropdowns de filtros
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ubicaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         locations:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Lista de ubicaciones únicas disponibles
 *                         total:
 *                           type: integer
 *                           description: Número total de ubicaciones
 *                         message:
 *                           type: string
 *                           description: Mensaje informativo
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/locations', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getAvailableLocations
);

/**
 * @swagger
 * /api/dashboard/export-report:
 *   get:
 *     summary: Exportar reporte de ventas en Excel o PDF
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: week
 *         description: Período de tiempo para el reporte
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *           default: excel
 *         description: Formato del reporte
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Error generando reporte
 */
router.get(
  '/export-report', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.exportSalesReport
);

module.exports = router;