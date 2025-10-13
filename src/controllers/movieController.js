// src/controllers/movieController.js
const { Movie, Showtime, sequelize } = require('../models');
const { Op } = require('sequelize');

class MovieController {
  // Obtener todas las películas (con filtros)
  async getMovies(req, res) {
    try {
      const { 
        search, 
        genre, 
        status = 'active',
        page = 1, 
        limit = 20 
      } = req.query;

      const whereClause = { status };
      
      // Filtro por búsqueda
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filtro por género
      if (genre && genre !== 'Todos') {
        whereClause.genre = genre;
      }

      const offset = (page - 1) * limit;

      const movies = await Movie.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['release_date', 'DESC']],
        include: [{
          model: Showtime,
          as: 'showtimes',
          attributes: ['id', 'date', 'time', 'price'],
          where: {
            date: { [Op.gte]: new Date() }
          },
          required: false
        }]
      });

      res.json({
        success: true,
        data: {
          movies: movies.rows,
          pagination: {
            total: movies.count,
            page: parseInt(page),
            totalPages: Math.ceil(movies.count / limit),
            hasNext: offset + movies.rows.length < movies.count,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo películas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener película por ID
  async getMovieById(req, res) {
    try {
      const { id } = req.params;

      const movie = await Movie.findByPk(id, {
        include: [{
          model: Showtime,
          as: 'showtimes',
          include: [{
            association: 'room',
            attributes: ['id', 'name', 'location']
          }],
          where: {
            date: { [Op.gte]: new Date() }
          },
          required: false
        }]
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      res.json({
        success: true,
        data: { movie }
      });

    } catch (error) {
      console.error('Error obteniendo película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nueva película (Solo admin)
  async createMovie(req, res) {
    try {
      const {
        title,
        genre,
        duration,
        rating,
        poster,
        description,
        price,
        release_date
      } = req.body;

      // Validaciones
      if (!title || !genre || !duration || !rating || !description || !price || !release_date) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      const movie = await Movie.create({
        title,
        genre,
        duration: parseInt(duration),
        rating: parseFloat(rating),
        poster: poster || '/placeholder.svg',
        description,
        price: parseFloat(price),
        release_date
      });

      res.status(201).json({
        success: true,
        message: 'Película creada exitosamente',
        data: { movie }
      });

    } catch (error) {
      console.error('Error creando película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar película (Solo admin)
  async updateMovie(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const movie = await Movie.findByPk(id);
      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      // Convertir tipos numéricos si están presentes
      if (updateData.duration) updateData.duration = parseInt(updateData.duration);
      if (updateData.rating) updateData.rating = parseFloat(updateData.rating);
      if (updateData.price) updateData.price = parseFloat(updateData.price);

      await movie.update(updateData);

      res.json({
        success: true,
        message: 'Película actualizada exitosamente',
        data: { movie }
      });

    } catch (error) {
      console.error('Error actualizando película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar película (Solo admin)
  async deleteMovie(req, res) {
    try {
      const { id } = req.params;

      const movie = await Movie.findByPk(id);
      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      // Verificar si tiene funciones activas
      const activeShowtimes = await Showtime.count({
        where: { 
          movie_id: id,
          date: { [Op.gte]: new Date() }
        }
      });

      if (activeShowtimes > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar una película con funciones activas'
        });
      }

      await movie.destroy();

      res.json({
        success: true,
        message: 'Película eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener géneros disponibles
  async getGenres(req, res) {
    try {
      const genres = await Movie.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('genre')), 'genre']
        ],
        where: { status: 'active' },
        order: [['genre', 'ASC']]
      });

      const genreList = genres.map(g => g.genre);

      res.json({
        success: true,
        data: { genres: genreList }
      });

    } catch (error) {
      console.error('Error obteniendo géneros:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new MovieController();