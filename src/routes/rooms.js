// src/routes/rooms.js
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authController = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Gestión de salas de cine
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       required:
 *         - name
 *         - capacity
 *         - type
 *         - location
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Sala 1"
 *         capacity:
 *           type: integer
 *           example: 150
 *         type:
 *           type: string
 *           enum: [Estándar, Premium, VIP, IMAX, 4DX]
 *           example: "Estándar"
 *         status:
 *           type: string
 *           enum: [active, maintenance, inactive]
 *           default: active
 *         location:
 *           type: string
 *           enum: [Planta Baja, Primer Piso, Segundo Piso, Tercer Piso]
 *           example: "Planta Baja"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Obtener lista de salas
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o ubicación
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, maintenance, inactive]
 *         description: Filtrar por estado
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Estándar, Premium, VIP, IMAX, 4DX]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *           enum: [Planta Baja, Primer Piso, Segundo Piso, Tercer Piso]
 *         description: Filtrar por ubicación
 *     responses:
 *       200:
 *         description: Lista de salas obtenida exitosamente
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
 *                         rooms:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Room'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', roomController.getRooms);

/**
 * @swagger
 * /api/rooms/locations:
 *   get:
 *     summary: Obtener lista de ubicaciones disponibles
 *     tags: [Rooms]
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
 *       500:
 *         description: Error interno del servidor
 */
router.get('/locations', roomController.getLocations);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Crear nueva sala (Solo admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Sala creada exitosamente
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
 *                         room:
 *                           $ref: '#/components/schemas/Room'
 *       400:
 *         description: Datos de entrada inválidos
 *       409:
 *         description: Ya existe una sala con ese nombre
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  roomController.createRoom
);

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Actualizar sala (Solo admin)
 *     tags: [Rooms]
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
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       200:
 *         description: Sala actualizada exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       404:
 *         description: Sala no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  roomController.updateRoom
);

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Eliminar sala (Solo admin)
 *     tags: [Rooms]
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
 *         description: Sala eliminada exitosamente
 *       400:
 *         description: No se puede eliminar - tiene funciones programadas
 *       404:
 *         description: Sala no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  roomController.deleteRoom
);

router.get('/:id/details', roomController.getRoomDetails);

module.exports = router;