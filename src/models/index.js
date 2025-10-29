// src/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  username: dbConfig.username,
  password: dbConfig.password,
  dialectOptions: dbConfig.dialectOptions,
  pool: dbConfig.pool,
  logging: dbConfig.logging,
  define: dbConfig.define
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a Oracle Cloud establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con Oracle:', error.message);
    return false;
  }
};

const models = {
  User: require('./User')(sequelize, Sequelize.DataTypes),
  Movie: require('./Movie')(sequelize, Sequelize.DataTypes),
  Room: require('./Room')(sequelize, Sequelize.DataTypes),
  Showtime: require('./Showtime')(sequelize, Sequelize.DataTypes),
  Seat: require('./Seat')(sequelize, Sequelize.DataTypes),
  Booking: require('./Booking')(sequelize, Sequelize.DataTypes),
  BookingSeat: require('./BookingSeat')(sequelize, Sequelize.DataTypes)
};

// Definir relaciones
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Relaciones
models.User.hasMany(models.Booking, { foreignKey: 'user_id', as: 'bookings' });
models.Booking.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

models.Movie.hasMany(models.Showtime, { foreignKey: 'movie_id', as: 'showtimes' });
models.Showtime.belongsTo(models.Movie, { foreignKey: 'movie_id', as: 'movie' });

models.Room.hasMany(models.Showtime, { foreignKey: 'room_id', as: 'showtimes' });
models.Showtime.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });

models.Room.hasMany(models.Seat, { foreignKey: 'room_id', as: 'seats' });
models.Seat.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });

models.Showtime.hasMany(models.Booking, { foreignKey: 'showtime_id', as: 'bookings' });
models.Booking.belongsTo(models.Showtime, { foreignKey: 'showtime_id', as: 'showtime' });

models.Booking.hasMany(models.BookingSeat, { foreignKey: 'booking_id', as: 'bookingSeats' });
models.BookingSeat.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });

models.Seat.hasMany(models.BookingSeat, { foreignKey: 'seat_id', as: 'bookingSeats' });
models.BookingSeat.belongsTo(models.Seat, { foreignKey: 'seat_id', as: 'seat' });

models.sequelize = sequelize;
models.Sequelize = Sequelize;
models.testConnection = testConnection;

module.exports = models;