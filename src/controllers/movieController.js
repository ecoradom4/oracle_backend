// src/controllers/movieController.js
const { Movie, Showtime, sequelize } = require('../models');
const { Op } = require('sequelize');
const omdbService = require('../services/OMDBService');

class MovieController {
  // Obtener todas las películas (con filtros) - ACTUALIZADO PARA ORACLE
  async getMovies(req, res) {
    try {
      const { 
        search, 
        genre, 
        status = 'active',
        page = 1, 
        limit = 50 
      } = req.query;

      const whereClause = { status };
      
      // Filtro por búsqueda - ACTUALIZADO PARA ORACLE (sin iLike)
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } }, // Cambiado iLike por like
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filtro por género
      if (genre && genre !== 'Todos') {
        whereClause.genre = { [Op.like]: `%${genre}%` }; // Búsqueda parcial
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Obtener fecha actual en formato Oracle
      const today = new Date().toISOString().split('T')[0];

      const movies = await Movie.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [['release_date', 'DESC']],
        include: [{
          model: Showtime,
          as: 'showtimes',
          attributes: ['id', 'date', 'time', 'price', 'available_seats'],
          where: {
            date: { [Op.gte]: today } // Usar formato date string
          },
          required: false
        }]
      });

      // Enriquecer datos de películas
      const moviesWithDetails = movies.rows.map(movie => {
        const movieData = movie.toJSON();
        const activeShowtimes = movieData.showtimes || [];
        
        return {
          ...movieData,
          stats: {
            total_showtimes: activeShowtimes.length,
            available_showtimes: activeShowtimes.filter(st => st.available_seats > 0).length,
            next_showtime: activeShowtimes.length > 0 ? activeShowtimes[0] : null
          },
          // Asegurar tipos numéricos
          duration: parseInt(movieData.duration),
          rating: parseFloat(movieData.rating),
          price: parseFloat(movieData.price)
        };
      });

      res.json({
        success: true,
        data: {
          movies: moviesWithDetails,
          pagination: {
            total: movies.count,
            page: parseInt(page),
            limit: parseInt(limit),
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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener película por ID - ACTUALIZADO
  async getMovieById(req, res) {
    try {
      const { id } = req.params;

      // Validar formato UUID
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de película inválido'
        });
      }

      const today = new Date().toISOString().split('T')[0];

      const movie = await Movie.findByPk(id, {
        include: [{
          model: Showtime,
          as: 'showtimes',
          include: [{
            association: 'room',
            attributes: ['id', 'name', 'location', 'type']
          }],
          where: {
            date: { [Op.gte]: today }
          },
          required: false,
          order: [
            ['date', 'ASC'],
            ['time', 'ASC']
          ]
        }]
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      // Verificar estado de la película
      if (movie.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Esta película no está disponible actualmente'
        });
      }

      const movieData = movie.toJSON();
      
      // Calcular estadísticas
      const activeShowtimes = movieData.showtimes || [];
      const availableShowtimes = activeShowtimes.filter(st => st.available_seats > 0);

      const response = {
        ...movieData,
        // Asegurar tipos numéricos
        duration: parseInt(movieData.duration),
        rating: parseFloat(movieData.rating),
        price: parseFloat(movieData.price),
        stats: {
          total_showtimes: activeShowtimes.length,
          available_showtimes: availableShowtimes.length,
          total_available_seats: availableShowtimes.reduce((sum, st) => sum + st.available_seats, 0),
          locations: [...new Set(activeShowtimes.map(st => st.room?.location).filter(Boolean))]
        }
      };

      res.json({
        success: true,
        data: { movie: response }
      });

    } catch (error) {
      console.error('Error obteniendo película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Crear nueva película (Solo admin) - ACTUALIZADO
  async createMovie(req, res) {
    const transaction = await sequelize.transaction();
    
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
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Validar tipos numéricos
      const durationNum = parseInt(duration);
      const ratingNum = parseFloat(rating);
      const priceNum = parseFloat(price);

      if (isNaN(durationNum) || isNaN(ratingNum) || isNaN(priceNum)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Duración, rating y precio deben ser valores numéricos válidos'
        });
      }

      // Validar rango de rating
      if (ratingNum < 0 || ratingNum > 10) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'El rating debe estar entre 0 y 10'
        });
      }

      let finalPoster = poster;

      // Si no se proporciona un poster, buscar en OMDB
      if (!poster || poster === '/placeholder.svg') {
        try {
          const year = omdbService.extractYearFromDate(release_date);
          const omdbPoster = await omdbService.getMoviePoster(title, year);
          
          if (omdbPoster && omdbPoster !== '/placeholder.svg') {
            finalPoster = omdbPoster;
          } else {
            finalPoster = '/placeholder.svg';
          }
        } catch (omdbError) {
          console.warn('Error obteniendo poster de OMDB:', omdbError.message);
          finalPoster = '/placeholder.svg';
        }
      }

      const movie = await Movie.create({
        title: title.trim(),
        genre: genre.trim(),
        duration: durationNum,
        rating: ratingNum,
        poster: finalPoster,
        description: description.trim(),
        price: priceNum,
        release_date: new Date(release_date).toISOString().split('T')[0],
        status: 'active'
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Película creada exitosamente',
        data: { 
          movie: {
            ...movie.toJSON(),
            duration: parseInt(movie.duration),
            rating: parseFloat(movie.rating),
            price: parseFloat(movie.price)
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creando película:', error);
      
      // Manejar errores específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una película con ese título'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Actualizar película (Solo admin) - ACTUALIZADO
  async updateMovie(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const updateData = req.body;

      const movie = await Movie.findByPk(id, { transaction });
      if (!movie) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      // Preparar datos para actualización
      const updateFields = { ...updateData };

      // Convertir tipos numéricos si están presentes
      if (updateFields.duration) updateFields.duration = parseInt(updateFields.duration);
      if (updateFields.rating) updateFields.rating = parseFloat(updateFields.rating);
      if (updateFields.price) updateFields.price = parseFloat(updateFields.price);

      // Validar rating si se actualiza
      if (updateFields.rating && (updateFields.rating < 0 || updateFields.rating > 10)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'El rating debe estar entre 0 y 10'
        });
      }

      // Si se actualiza el título o la fecha, y no se proporciona un poster, buscar en OMDB
      if ((updateFields.title || updateFields.release_date) && !updateFields.poster) {
        try {
          const title = updateFields.title || movie.title;
          const releaseDate = updateFields.release_date || movie.release_date;
          const year = omdbService.extractYearFromDate(releaseDate);
          
          const omdbPoster = await omdbService.getMoviePoster(title, year);
          
          if (omdbPoster && omdbPoster !== '/placeholder.svg') {
            updateFields.poster = omdbPoster;
          }
        } catch (omdbError) {
          console.warn('Error obteniendo poster de OMDB:', omdbError.message);
          // Continuar sin actualizar el poster
        }
      }

      // Limpiar campos de texto
      if (updateFields.title) updateFields.title = updateFields.title.trim();
      if (updateFields.genre) updateFields.genre = updateFields.genre.trim();
      if (updateFields.description) updateFields.description = updateFields.description.trim();

      await movie.update(updateFields, { transaction });
      await transaction.commit();

      const updatedMovie = await Movie.findByPk(id);

      res.json({
        success: true,
        message: 'Película actualizada exitosamente',
        data: { 
          movie: {
            ...updatedMovie.toJSON(),
            duration: parseInt(updatedMovie.duration),
            rating: parseFloat(updatedMovie.rating),
            price: parseFloat(updatedMovie.price)
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error actualizando película:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una película con ese título'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Eliminar película (Solo admin) - ACTUALIZADO
  async deleteMovie(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;

      const movie = await Movie.findByPk(id, { transaction });
      if (!movie) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Película no encontrada'
        });
      }

      const today = new Date().toISOString().split('T')[0];

      // Verificar si tiene funciones activas futuras
      const activeShowtimes = await Showtime.count({
        where: { 
          movie_id: id,
          date: { [Op.gte]: today }
        },
        transaction
      });

      if (activeShowtimes > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la película. Tiene ${activeShowtimes} función(es) activa(s) programadas.`
        });
      }

      // Cambiar estado a inactive en lugar de eliminar (soft delete)
      await movie.update({ status: 'inactive' }, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: 'Película desactivada exitosamente'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error eliminando película:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener géneros disponibles - ACTUALIZADO PARA ORACLE
  async getGenres(req, res) {
    try {
      // Consulta optimizada para Oracle
      const genres = await Movie.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('genre')), 'genre']
        ],
        where: { status: 'active' },
        order: [['genre', 'ASC']],
        raw: true
      });

      const genreList = genres.map(g => g.genre).filter(Boolean);

      // Estadísticas por género
      const genreStats = await Movie.findAll({
        attributes: [
          'genre',
          [sequelize.fn('COUNT', sequelize.col('id')), 'movie_count']
        ],
        where: { status: 'active' },
        group: ['genre'],
        order: [['genre', 'ASC']],
        raw: true
      });

      res.json({
        success: true,
        data: { 
          genres: genreList,
          statistics: genreStats
        }
      });

    } catch (error) {
      console.error('Error obteniendo géneros:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Nuevo método: Obtener películas en cartelera
  async getNowPlaying(req, res) {
    try {
      const { limit = 10 } = req.query;
      const today = new Date().toISOString().split('T')[0];

      const movies = await Movie.findAll({
        where: { status: 'active' },
        include: [{
          model: Showtime,
          as: 'showtimes',
          where: {
            date: { [Op.gte]: today }
          },
          required: true,
          attributes: ['id'] // Solo necesitamos saber que tiene funciones
        }],
        limit: parseInt(limit),
        order: [['release_date', 'DESC']]
      });

      res.json({
        success: true,
        data: { 
          movies,
          total: movies.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo películas en cartelera:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }
}

module.exports = new MovieController();