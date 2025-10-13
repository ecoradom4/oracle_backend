// src/routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Gestión de reservas y pagos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - showtime_id
 *         - seat_ids
 *         - payment_method
 *         - customer_email
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         transaction_id:
 *           type: string
 *           example: "TXN-1703123456789"
 *         user_id:
 *           type: string
 *           format: uuid
 *         showtime_id:
 *           type: string
 *           format: uuid
 *         total_price:
 *           type: number
 *           format: float
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *           default: confirmed
 *         payment_method:
 *           type: string
 *           example: "Tarjeta de Crédito"
 *         customer_email:
 *           type: string
 *           format: email
 *         qr_code_data:
 *           type: string
 *           description: Data URL del código QR
 *         receipt_url:
 *           type: string
 *           description: URL del recibo PDF
 *         purchase_date:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Crear nueva reserva
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showtime_id
 *               - seat_ids
 *             properties:
 *               showtime_id:
 *                 type: string
 *                 format: uuid
 *               seat_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 example: ["a1b2c3", "d4e5f6"]
 *               payment_method:
 *                 type: string
 *                 default: "Tarjeta de Crédito"
 *               customer_email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
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
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Datos de entrada inválidos
 *       409:
 *         description: Algunos asientos ya están reservados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/', 
  authController.authenticateToken, 
  bookingController.createBooking
);

/**
 * @swagger
 * /api/bookings/user:
 *   get:
 *     summary: Obtener reservas del usuario actual
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filtrar por estado
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de resultados
 *     responses:
 *       200:
 *         description: Lista de reservas obtenida exitosamente
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
 *                         bookings:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Booking'
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/user', 
  authController.authenticateToken, 
  bookingController.getUserBookings
);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Obtener reserva específica
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reserva obtenida exitosamente
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
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/:id', 
  authController.authenticateToken, 
  bookingController.getBookingById
);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancelar reserva
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reserva cancelada exitosamente
 *       400:
 *         description: No se puede cancelar - menos de 2 horas para la función
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/:id/cancel', 
  authController.authenticateToken, 
  bookingController.cancelBooking
);

/**
 * @swagger
 * /api/bookings/{id}/receipt:
 *   get:
 *     summary: Descargar recibo de reserva
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Recibo listo para descargar
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
 *                         download_url:
 *                           type: string
 *                         filename:
 *                           type: string
 *       404:
 *         description: Reserva o recibo no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/:id/receipt', 
  authController.authenticateToken, 
  bookingController.downloadReceipt
);

module.exports = router;