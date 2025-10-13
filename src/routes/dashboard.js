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
 *           enum: [day, week, month]
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
 *           enum: [day, week, month]
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
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           minimum: 1
 *           maximum: 30
 *         description: Número de días para analizar
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
 *                               ventas:
 *                                 type: number
 *                               boletos:
 *                                 type: integer
 *       500:
 *         description: Error interno del servidor
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
 *           enum: [day, week, month]
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
 *     summary: Obtener ocupación por sala
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ocupación por sala obtenida exitosamente
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
 *                               name:
 *                                 type: string
 *                               capacity:
 *                                 type: integer
 *                               percentage:
 *                                 type: number
 *                               status:
 *                                 type: string
 *                                 enum: [full, high, medium, low]
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/room-occupancy', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  dashboardController.getRoomOccupancy
);

module.exports = router;