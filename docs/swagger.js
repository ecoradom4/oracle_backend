// docs/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CineConnect API',
      version: '1.0.0',
      description: 'API para sistema de reservas de cine CineConnect',
      contact: {
        name: 'Soporte CineConnect',
        email: 'soporte@cineconnect.com'
      },
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 4000}`,
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.cineconnect.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único del usuario'
            },
            name: {
              type: 'string',
              description: 'Nombre completo del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario'
            },
            role: {
              type: 'string',
              enum: ['admin', 'cliente'],
              description: 'Rol del usuario'
            },
            phone: {
              type: 'string',
              description: 'Teléfono del usuario'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Movie: {
          type: 'object',
          required: ['title', 'genre', 'duration', 'rating', 'description', 'price', 'release_date'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string',
              description: 'Título de la película'
            },
            genre: {
              type: 'string',
              description: 'Género cinematográfico'
            },
            duration: {
              type: 'integer',
              description: 'Duración en minutos'
            },
            rating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 10,
              description: 'Calificación de la película'
            },
            poster: {
              type: 'string',
              description: 'URL del póster'
            },
            description: {
              type: 'string',
              description: 'Descripción de la película'
            },
            price: {
              type: 'number',
              format: 'float',
              description: 'Precio base del boleto'
            },
            release_date: {
              type: 'string',
              format: 'date',
              description: 'Fecha de estreno'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Estado de la película'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Mensaje de error'
            },
            error: {
              type: 'string',
              description: 'Detalles del error'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Mensaje de éxito'
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], // Ruta a los archivos de rutas
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };