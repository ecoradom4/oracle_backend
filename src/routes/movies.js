// src/routes/movies.js
const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const authController = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Gestión de películas
 */

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Obtener lista de películas
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título o descripción
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filtrar por género
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 *         description: Estado de la película
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Límite de resultados por página
 *     responses:
 *       200:
 *         description: Lista de películas obtenida exitosamente
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
 *                         movies:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Movie'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             page:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             hasNext:
 *                               type: boolean
 *                             hasPrev:
 *                               type: boolean
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', movieController.getMovies);

/**
 * @swagger
 * /api/movies/genres:
 *   get:
 *     summary: Obtener lista de géneros disponibles
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: Lista de géneros obtenida exitosamente
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
 *                         genres:
 *                           type: array
 *                           items:
 *                             type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/genres', movieController.getGenres);

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Obtener película por ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la película
 *     responses:
 *       200:
 *         description: Película obtenida exitosamente
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
 *                         movie:
 *                           $ref: '#/components/schemas/Movie'
 *       404:
 *         description: Película no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', movieController.getMovieById);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Crear nueva película (Solo admin)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Movie'
 *     responses:
 *       201:
 *         description: Película creada exitosamente
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
 *                         movie:
 *                           $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  movieController.createMovie
);

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Actualizar película (Solo admin)
 *     tags: [Movies]
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
 *             $ref: '#/components/schemas/Movie'
 *     responses:
 *       200:
 *         description: Película actualizada exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       404:
 *         description: Película no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  movieController.updateMovie
);

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Eliminar película (Solo admin)
 *     tags: [Movies]
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
 *         description: Película eliminada exitosamente
 *       400:
 *         description: No se puede eliminar - tiene funciones activas
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       404:
 *         description: Película no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  movieController.deleteMovie
);

module.exports = router;