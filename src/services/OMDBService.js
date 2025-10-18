// src/services/OMDBService.js
const axios = require('axios');

class OMDBService {
  constructor() {
    this.apiKey = process.env.OMDB_API_KEY;
    this.baseURL = 'http://www.omdbapi.com/';
  }

  /**
   * Obtiene el poster de una película desde OMDB
   * @param {string} title - Título de la película
   * @param {number|null} year - Año de estreno (opcional)
   * @returns {Promise<string|null>} - URL del poster o null si no se encuentra
   */
  async getMoviePoster(title, year = null) {
    try {
      if (!this.apiKey) {
        console.warn('OMDB_API_KEY no está configurada');
        return null;
      }

      const searchTitle = encodeURIComponent(title);
      let url = `${this.baseURL}?apikey=${this.apiKey}&t=${searchTitle}`;
      
      if (year) {
        url += `&y=${year}`;
      }

      console.log(`Buscando poster en OMDB para: "${title}"${year ? ` (${year})` : ''}`);

      const response = await axios.get(url, { timeout: 5000 });
      const data = response.data;

      if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
        console.log(`Poster encontrado para: "${title}" - ${data.Poster}`);
        return data.Poster;
      }

      console.log(`No se encontró poster en OMDB para: "${title}"`);
      return null;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('Timeout al conectar con OMDB:', error.message);
      } else if (error.response) {
        console.error('Error de respuesta de OMDB:', error.response.status, error.response.data);
      } else {
        console.error('Error fetching poster from OMDB:', error.message);
      }
      return null;
    }
  }

  /**
   * Busca información completa de una película en OMDB
   * @param {string} title - Título de la película
   * @param {number|null} year - Año de estreno (opcional)
   * @returns {Promise<object|null>} - Datos completos de la película o null si no se encuentra
   */
  async getMovieData(title, year = null) {
    try {
      if (!this.apiKey) {
        console.warn('OMDB_API_KEY no está configurada');
        return null;
      }

      const searchTitle = encodeURIComponent(title);
      let url = `${this.baseURL}?apikey=${this.apiKey}&t=${searchTitle}`;
      
      if (year) {
        url += `&y=${year}`;
      }

      const response = await axios.get(url, { timeout: 5000 });
      const data = response.data;

      if (data.Response === 'True') {
        return {
          title: data.Title,
          year: data.Year,
          genre: data.Genre,
          director: data.Director,
          actors: data.Actors,
          plot: data.Plot,
          poster: data.Poster !== 'N/A' ? data.Poster : null,
          rating: data.imdbRating !== 'N/A' ? data.imdbRating : null,
          runtime: data.Runtime,
          imdbID: data.imdbID
        };
      }

      return null;

    } catch (error) {
      console.error('Error fetching movie data from OMDB:', error.message);
      return null;
    }
  }

  /**
   * Extrae el año de una fecha en formato string
   * @param {string} dateString - Fecha en formato string
   * @returns {number|null} - Año extraído o null si no se puede obtener
   */
  extractYearFromDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.getFullYear();
    } catch (error) {
      console.error('Error extrayendo año de la fecha:', error);
      return null;
    }
  }
}

module.exports = new OMDBService();