const express = require('express');
const router = express.Router();
const bookingSeatController = require('../controllers/bookingSeatController');

/**
 * @swagger
 * /api/booking-seats:
 *   get:
 *     summary: Obtener asientos reservados para una función específica
 *     description: |
 *       Consulta todos los asientos que están reservados (con estado 'confirmed') 
 *       para una función de cine específica (showtime).
 *       
 *       **Uso principal:** Marcar asientos como ocupados en la interfaz de selección de asientos.
 *     tags:
 *       - Booking Seats
 *     parameters:
 *       - in: query
 *         name: showtimeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: ID único de la función (showtime)
 *     responses:
 *       200:
 *         description: Lista de asientos reservados obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookedSeatsResponse'
 *             examples:
 *               successWithSeats:
 *                 summary: Respuesta exitosa con asientos reservados
 *                 value:
 *                   success: true
 *                   data:
 *                     - seat_id: "62f02ebb-4741-4b72-a5f1-3f6568e02240"
 *                       row: "A"
 *                       number: 1
 *                       type: "standard"
 *                     - seat_id: "edc98f18-c8a6-4a75-b6b9-b7c1eecbd6d2"
 *                       row: "B"
 *                       number: 5
 *                       type: "premium"
 *               successEmpty:
 *                 summary: Respuesta exitosa sin asientos reservados
 *                 value:
 *                   success: true
 *                   data: []
 *       400:
 *         description: Parámetro showtimeId faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookedSeatsError'
 *             example:
 *               success: false
 *               message: "Parámetro showtimeId es requerido"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookedSeatsError'
 *             example:
 *               success: false
 *               message: "Error interno del servidor"
 */
router.get('/', bookingSeatController.getBookedSeatsByShowtime);

router.post('/check-availability', bookingSeatController.checkSeatsAvailability);

module.exports = router;