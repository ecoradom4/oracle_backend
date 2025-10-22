// src/app.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { swaggerUi, specs } = require('../docs/swagger');
const routes = require('./routes');
const { initializeServices } = require('./services');
const { sequelize } = require('./models');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 4000;

    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  // Inicializar base de datos
  async initializeDatabase() {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a la base de datos establecida correctamente');

      // Sincronizar modelos (en desarrollo)
      //if (process.env.NODE_ENV === 'development') {
      //await sequelize.sync({ alter: true });
      //console.log('✅ Modelos sincronizados con la base de datos');
      //}

    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error);
      process.exit(1);
    }
  }

  // Inicializar middlewares
  initializeMiddlewares() {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://frontend-cine-jade.vercel.app',
      'https://frontend-cine.onrender.com',
      process.env.FRONTEND_URL, // opcional desde variables de entorno
    ].filter(Boolean);

    // ✅ CORS Configuration
    this.app.use(cors({
      origin: function (origin, callback) {
        // Permitir requests sin origen (como desde Postman o servidores internos)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          console.warn(`❌ CORS bloqueado para origen no autorizado: ${origin}`);
          return callback(new Error('No autorizado por CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // ✅ Body parsing
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // ✅ Archivos estáticos
    this.app.use('/storage', express.static(path.resolve(__dirname, '../storage'), {
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
      },
    }));

    // ✅ Logging de requests
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });

    // ✅ Cabeceras de seguridad
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      next();
    });
  }


  // Inicializar servicios
  async initializeServices() {
    try {
      await initializeServices();
    } catch (error) {
      console.error('❌ Error inicializando servicios:', error);
    }
  }

  // Inicializar rutas
  initializeRoutes() {
    // API Routes
    this.app.use('/api', routes);

    // Swagger Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'CineConnect API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      }
    }));

    // Serve Swagger JSON
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: '🎬 Bienvenido a CineConnect API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
          auth: '/api/auth',
          movies: '/api/movies',
          rooms: '/api/rooms',
          showtimes: '/api/showtimes',
          bookings: '/api/bookings',
          dashboard: '/api/dashboard'
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  // Manejo de errores
  initializeErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.originalUrl}`,
        suggestion: 'Consulta la documentación en /api-docs'
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('🚨 Error no manejado:', error);

      // Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors
        });
      }

      // Sequelize unique constraint error
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'El recurso ya existe',
          field: error.errors[0]?.path
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
      }

      // Default error
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Error interno del servidor';

      res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  // Iniciar servidor
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`
🎬 CINECONNECT BACKEND INICIADO CORRECTAMENTE

📍 Servidor: http://localhost:${this.port}
📚 Documentación: http://localhost:${this.port}/api-docs
🗄️  Base de datos: ${process.env.DATABASE_URL ? 'Conectada' : 'No configurada'}
🌍 Entorno: ${process.env.NODE_ENV || 'development'}

¡Listo para recibir peticiones! 🚀
      `);
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  // Configurar apagado graceful
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📴 Recibido ${signal}. Cerrando servidor...`);

      this.server.close(async () => {
        console.log('✅ Servidor HTTP cerrado');

        try {
          await sequelize.close();
          console.log('✅ Conexión a la base de datos cerrada');
        } catch (error) {
          console.error('❌ Error cerrando conexión a BD:', error);
        }

        console.log('👋 Servidor apagado correctamente');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('⏰ Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  // Getter para testing
  getApp() {
    return this.app;
  }
}

module.exports = App;