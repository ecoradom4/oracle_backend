// src/models/Showtime.js
module.exports = (sequelize, DataTypes) => {
  const Showtime = sequelize.define('Showtime', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    movie_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    room_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    available_seats: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    total_seats: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'showtimes',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['room_id', 'date', 'time']
      }
    ]
  });

  return Showtime;
};