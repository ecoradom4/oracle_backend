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
 * /api/showtimes/schedule:
 *   post:
 *     summary: Programar múltiples funciones automáticamente (Solo admin)
 *     description: 
 *       Crea funciones de cine de forma automática según un rango de fechas, horarios definidos y configuración de sala. 
 *       Evita duplicados y conflictos de horario existentes. 
 *       Puede excluir días específicos de la semana y aplicar precios personalizados.
 *     tags: [Showtimes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movie_id
 *               - room_id
 *               - start_date
 *               - end_date
 *               - times
 *             properties:
 *               movie_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la película.
 *                 example: "3b93c7e2-52f1-4c81-8a4b-85af9a8a78a4"
 *               room_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la sala donde se proyectará la película.
 *                 example: "c1a4b824-908c-4baf-a9c2-9876b813a1b9"
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Fecha inicial de programación (YYYY-MM-DD)
 *                 example: "2025-10-22"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Fecha final de programación (YYYY-MM-DD)
 *                 example: "2025-10-28"
 *               times:
 *                 type: array
 *                 description: Lista de horarios diarios para programar funciones.
 *                 items:
 *                   type: string
 *                   format: time
 *                   example: "14:30"
 *               excluded_days:
 *                 type: array
 *                 description: (Opcional) Días de la semana que deben excluirse de la programación.
 *                 items:
 *                   type: string
 *                   enum: [sunday, monday, tuesday, wednesday, thursday, friday, saturday]
 *                   example: "monday"
 *               price_override:
 *                 type: number
 *                 format: float
 *                 description: (Opcional) Precio personalizado para las funciones.
 *                 example: 35.00
 *     responses:
 *       201:
 *         description: Funciones programadas exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Funciones programadas correctamente."
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_generated:
 *                       type: integer
 *                       example: 12
 *                     total_skipped:
 *                       type: integer
 *                       example: 1
 *                     date_range:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                           example: "2025-10-22"
 *                         end_date:
 *                           type: string
 *                           example: "2025-10-28"
 *                     room:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     movie:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       description: Lista de funciones creadas.
 *                       items:
 *                         $ref: '#/components/schemas/Showtime'
 *                     skipped:
 *                       type: array
 *                       description: Lista de funciones omitidas por conflictos.
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             example: "2025-10-25"
 *                           time:
 *                             type: string
 *                             example: "20:00"
 *                           reason:
 *                             type: string
 *                             example: "Conflicto de horario"
 *       400:
 *         description: Solicitud inválida (datos faltantes o rango incorrecto)
 *       404:
 *         description: Película o sala no encontrada
 *       409:
 *         description: No se crearon funciones (todas las fechas en conflicto o excluidas)
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/schedule',
  authController.authenticateToken,
  authController.authorize(['admin']),
  showtimeController.scheduleShowtimes
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