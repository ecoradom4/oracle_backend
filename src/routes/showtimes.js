// src/routes/showtimes.js
const express = require('express');
const router = express.Router();
const showtimeController = require('../controllers/showtimeController');
const authController = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Showtimes
 *   description: Gestión de funciones y horarios
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Showtime:
 *       type: object
 *       required:
 *         - movie_id
 *         - room_id
 *         - date
 *         - time
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         movie_id:
 *           type: string
 *           format: uuid
 *         room_id:
 *           type: string
 *           format: uuid
 *         date:
 *           type: string
 *           format: date
 *           example: "2023-12-25"
 *         time:
 *           type: string
 *           format: time
 *           example: "20:00"
 *         price:
 *           type: number
 *           format: float
 *           example: 12.5
 *         available_seats:
 *           type: integer
 *           example: 150
 *         total_seats:
 *           type: integer
 *           example: 150
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/showtimes:
 *   get:
 *     summary: Obtener lista de funciones
 *     tags: [Showtimes]
 *     parameters:
 *       - in: query
 *         name: movieId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por película
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por sala
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar por fecha
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *           format: time
 *         description: Filtrar por hora
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
 *           default: 20
 *         description: Límite de resultados
 *     responses:
 *       200:
 *         description: Lista de funciones obtenida exitosamente
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
 *                         showtimes:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Showtime'
 *                               - type: object
 *                                 properties:
 *                                   movie:
 *                                     $ref: '#/components/schemas/Movie'
 *                                   room:
 *                                     $ref: '#/components/schemas/Room'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', showtimeController.getShowtimes);
/**
 * @swagger
 * /api/showtimes/{id}:
 *   get:
 *     summary: Obtener función específica por ID con detalles completos
 *     tags: [Showtimes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la función
 *     responses:
 *       200:
 *         description: Función obtenida exitosamente con todos los detalles
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
 *                         showtime:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             movie_id:
 *                               type: string
 *                             room_id:
 *                               type: string
 *                             date:
 *                               type: string
 *                             time:
 *                               type: string
 *                             price:
 *                               type: number
 *                             available_seats:
 *                               type: integer
 *                             total_seats:
 *                               type: integer
 *                             createdAt:
 *                               type: string
 *                             updatedAt:
 *                               type: string
 *                             movie:
 *                               $ref: '#/components/schemas/Movie'
 *                             room:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 capacity:
 *                                   type: integer
 *                                 type:
 *                                   type: string
 *                                 location:
 *                                   type: string
 *                             seats:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   row:
 *                                     type: string
 *                                   number:
 *                                     type: integer
 *                                   type:
 *                                     type: string
 *                                     enum: [standard, premium, vip]
 *                                   status:
 *                                     type: string
 *                                     enum: [available, occupied, maintenance]
 *                                   is_available:
 *                                     type: boolean
 *                             booking_info:
 *                               type: object
 *                               properties:
 *                                 total_seats:
 *                                   type: integer
 *                                 available_seats:
 *                                   type: integer
 *                                 booked_seats:
 *                                   type: integer
 *                                 occupancy_rate:
 *                                   type: string
 *       404:
 *         description: Función no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', showtimeController.getShowtimeById);
/**
 * @swagger
 * /api/showtimes/{id}/seats:
 *   get:
 *     summary: Obtener asientos disponibles para una función
 *     tags: [Showtimes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la función
 *     responses:
 *       200:
 *         description: Asientos obtenidos exitosamente
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
 *                         showtime:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             date:
 *                               type: string
 *                             time:
 *                               type: string
 *                             price:
 *                               type: number
 *                             available_seats:
 *                               type: integer
 *                         room:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             capacity:
 *                               type: integer
 *                         seats:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               row:
 *                                 type: string
 *                               number:
 *                                 type: integer
 *                               type:
 *                                 type: string
 *                                 enum: [standard, premium, vip]
 *                               status:
 *                                 type: string
 *                                 enum: [available, occupied, maintenance]
 *       404:
 *         description: Función no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id/seats', showtimeController.getAvailableSeats);

/**
 * @swagger
 * /api/showtimes:
 *   post:
 *     summary: Crear nueva función (Solo admin)
 *     tags: [Showtimes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Showtime'
 *     responses:
 *       201:
 *         description: Función creada exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       404:
 *         description: Película o sala no encontrada
 *       409:
 *         description: Conflicto de horario - la sala ya está ocupada
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  showtimeController.createShowtime
);

/**
 * @swagger
 * /api/showtimes/{id}:
 *   put:
 *     summary: Actualizar función (Solo admin)
 *     tags: [Showtimes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Showtime'
 *     responses:
 *       200:
 *         description: Función actualizada exitosamente
 *       400:
 *         description: No se puede modificar - tiene reservas activas
 *       404:
 *         description: Función no encontrada
 *       409:
 *         description: Conflicto de horario
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  showtimeController.updateShowtime
);

/**
 * @swagger
 * /api/showtimes/{id}:
 *   delete:
 *     summary: Eliminar función (Solo admin)
 *     tags: [Showtimes]
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
 *         description: Función eliminada exitosamente
 *       400:
 *         description: No se puede eliminar - tiene reservas activas
 *       404:
 *         description: Función no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  showtimeController.deleteShowtime
);

module.exports = router;