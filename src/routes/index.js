// src/routes/index.js
const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./auth');
const movieRoutes = require('./movies');
const roomRoutes = require('./rooms');
const showtimeRoutes = require('./showtimes');
const bookingRoutes = require('./bookings');
const dashboardRoutes = require('./dashboard');

// Configurar rutas
router.use('/auth', authRoutes);
router.use('/movies', movieRoutes);
router.use('/rooms', roomRoutes);
router.use('/showtimes', showtimeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/dashboard', dashboardRoutes);

// Ruta de health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CineConnect API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;