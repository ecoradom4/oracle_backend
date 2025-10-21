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
    // CORS configuration mejorada para Render
    const corsOptions = {
      origin: (origin, callback) => {
        // Lista de orígenes permitidos
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://cineconnect-frontend.vercel.app',
          'http://10.204.24.130:10000',
          'http://192.168.1.31:3000',
          'http://172.20.10.3:3000',
          process.env.FRONTEND_URL,
          // Dominios de Render
          'https://frontend-cine.onrender.com',
          'https://*.onrender.com',
          'http://*.onrender.com'
        ].filter(Boolean);

        // En desarrollo, permite cualquier origen
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Desarrollo: Permitiendo cualquier origen CORS');
          return callback(null, true);
        }

        // En producción, verifica el origen
        if (!origin || allowedOrigins.some(allowedOrigin => {
          // Permite subdominios wildcard
          if (allowedOrigin.includes('*')) {
            const regex = new RegExp(allowedOrigin.replace('*', '.*'));
            return regex.test(origin);
          }
          return allowedOrigins.includes(origin);
        })) {
          console.log(`✅ Origen permitido: ${origin}`);
          callback(null, true);
        } else {
          console.log(`❌ Origen bloqueado por CORS: ${origin}`);
          callback(new Error('No permitido por CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'X-API-Key'
      ],
      exposedHeaders: [
        'Content-Length',
        'Content-Type',
        'Authorization',
        'X-Powered-By'
      ],
      maxAge: 86400, // 24 horas
      preflightContinue: false,
      optionsSuccessStatus: 204
    };

    this.app.use(cors(corsOptions));

    // Manejar preflight OPTIONS requests explícitamente
    this.app.options('*', cors(corsOptions));

    // Body parsing middleware
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // Archivos estáticos (para servir recibos, QR, imágenes, etc.)
    this.app.use('/storage', express.static(path.resolve(__dirname, '../storage'), {
      maxAge: '7d',
      setHeaders: (res, path) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }));

    // Request logging mejorado
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${req.headers.origin || 'No origin'}`);
      next();
    });

    // Headers adicionales para CORS
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
      
      // Cache para preflight requests
      if (req.method === 'OPTIONS') {
        res.header('Access-Control-Max-Age', '86400');
      }
      
      next();
    });

    // Security headers
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

    // Health check endpoint para Render
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        service: 'CineConnect Backend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: 'Connected',
        allowedOrigins: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://cineconnect-frontend.vercel.app',
          'https://frontend-cine.onrender.com',
          process.env.FRONTEND_URL
        ].filter(Boolean)
      });
    });

    // Root endpoint mejorado
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: '🎬 Bienvenido a CineConnect API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        deployment: 'Render.com',
        documentation: '/api-docs',
        health: '/health',
        endpoints: {
          auth: '/api/auth',
          movies: '/api/movies',
          rooms: '/api/rooms',
          showtimes: '/api/showtimes',
          bookings: '/api/bookings',
          dashboard: '/api/dashboard'
        },
        cors: {
          enabled: true,
          allowedOrigins: [
            'https://frontend-cine.onrender.com',
            'https://cineconnect-frontend.vercel.app',
            'http://localhost:3000'
          ]
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  // Manejo de errores
  initializeErrorHandling() {
    // CORS error handler
    this.app.use((error, req, res, next) => {
      if (error.message === 'No permitido por CORS') {
        return res.status(403).json({
          success: false,
          message: 'Origen no permitido por CORS',
          origin: req.headers.origin,
          allowedOrigins: [
            'https://frontend-cine.onrender.com',
            'https://cineconnect-frontend.vercel.app',
            'http://localhost:3000'
          ]
        });
      }
      next(error);
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.originalUrl}`,
        suggestion: 'Consulta la documentación en /api-docs',
        health: '/health'
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
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        path: req.path,
        method: req.method
      });
    });
  }

  // Iniciar servidor
  start() {
    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`
🎬 CINECONNECT BACKEND INICIADO CORRECTAMENTE

📍 Servidor: http://0.0.0.0:${this.port}
🌐 URL Pública: https://tu-backend.onrender.com (si estás en Render)
📚 Documentación: /api-docs
❤️  Health Check: /health
🗄️  Base de datos: ${process.env.DATABASE_URL ? 'Conectada' : 'No configurada'}
🌍 Entorno: ${process.env.NODE_ENV || 'development'}
🔧 CORS: Habilitado para Render y Vercel

✅ Orígenes permitidos:
   - https://frontend-cine.onrender.com
   - https://cineconnect-frontend.vercel.app
   - http://localhost:3000
   - ${process.env.FRONTEND_URL || 'Variable FRONTEND_URL no configurada'}

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