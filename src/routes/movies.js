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
 * components:
 *   schemas:
 *     Movie:
 *       type: object
 *       required:
 *         - title
 *         - genre
 *         - duration
 *         - rating
 *         - description
 *         - price
 *         - release_date
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único de la película
 *         title:
 *           type: string
 *           description: Título de la película
 *         genre:
 *           type: string
 *           description: Género de la película
 *         duration:
 *           type: integer
 *           description: Duración en minutos
 *         rating:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 10
 *           description: Calificación de la película
 *         poster:
 *           type: string
 *           description: URL del poster (se obtiene automáticamente de OMDB si no se proporciona)
 *         description:
 *           type: string
 *           description: Descripción de la película
 *         price:
 *           type: number
 *           format: float
 *           description: Precio base de la entrada
 *         release_date:
 *           type: string
 *           format: date
 *           description: Fecha de estreno
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 *           description: Estado de la película
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "123e4567-e89b-12d3-a456-426614174000"
 *         title: "Inception"
 *         genre: "Sci-Fi"
 *         duration: 148
 *         rating: 8.8
 *         poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg"
 *         description: "Un ladrón que roba secretos corporativos..."
 *         price: 12.50
 *         release_date: "2010-07-16"
 *         status: "active"
 * 
 *     MovieInput:
 *       type: object
 *       required:
 *         - title
 *         - genre
 *         - duration
 *         - rating
 *         - description
 *         - price
 *         - release_date
 *       properties:
 *         title:
 *           type: string
 *           description: Título de la película (se usa para buscar el poster en OMDB)
 *         genre:
 *           type: string
 *           description: Género de la película
 *         duration:
 *           type: integer
 *           description: Duración en minutos
 *         rating:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 10
 *         poster:
 *           type: string
 *           description: URL del poster (opcional - si no se proporciona, se busca automáticamente en OMDB)
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           format: float
 *         release_date:
 *           type: string
 *           format: date
 *           description: Fecha de estreno (se usa para mejorar la búsqueda en OMDB)
 * 
 *     Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 * 
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', movieController.getMovieById);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Crear nueva película (Solo admin)
 *     description: |
 *       Crea una nueva película. Si no se proporciona un poster, 
 *       se buscará automáticamente en OMDB usando el título y año de estreno.
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieInput'
 *           examples:
 *             withPoster:
 *               summary: Con poster proporcionado
 *               value:
 *                 title: "The Matrix"
 *                 genre: "Sci-Fi"
 *                 duration: 136
 *                 rating: 8.7
 *                 poster: "https://example.com/poster.jpg"
 *                 description: "Un hacker descubre la verdad sobre su realidad..."
 *                 price: 12.50
 *                 release_date: "1999-03-31"
 *             autoPoster:
 *               summary: Poster automático desde OMDB
 *               value:
 *                 title: "Inception"
 *                 genre: "Sci-Fi"
 *                 duration: 148
 *                 rating: 8.8
 *                 description: "Un ladrón que roba secretos corporativos..."
 *                 price: 13.00
 *                 release_date: "2010-07-16"
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No tiene permisos de administrador
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
 *     description: |
 *       Actualiza una película existente. Si se cambia el título o fecha de estreno 
 *       y no se proporciona un poster, se buscará automáticamente en OMDB.
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
 *         description: ID de la película
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Si se cambia y no se proporciona poster, se busca en OMDB
 *               genre:
 *                 type: string
 *               duration:
 *                 type: integer
 *               rating:
 *                 type: number
 *                 format: float
 *               poster:
 *                 type: string
 *                 description: URL del poster (opcional - si no se proporciona y se cambia título/fecha, se busca en OMDB)
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 format: float
 *               release_date:
 *                 type: string
 *                 format: date
 *                 description: Si se cambia y no se proporciona poster, se busca en OMDB
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *           example:
 *             title: "Inception (Updated)"
 *             genre: "Science Fiction"
 *             rating: 9.0
 *             description: "Nueva descripción de la película"
 *     responses:
 *       200:
 *         description: Película actualizada exitosamente
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No tiene permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Película no encontrada
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
 *         description: ID de la película
 *     responses:
 *       200:
 *         description: Película eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: No se puede eliminar - tiene funciones activas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No tiene permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Película no encontrada
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
router.delete(
  '/:id', 
  authController.authenticateToken, 
  authController.authorize(['admin']), 
  movieController.deleteMovie
);

router.get('/now-playing', movieController.getNowPlaying);

module.exports = router;