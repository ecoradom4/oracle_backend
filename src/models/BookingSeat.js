// src/models/BookingSeat.js
module.exports = (sequelize, DataTypes) => {
  const BookingSeat = sequelize.define('BookingSeat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    seat_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    tableName: 'booking_seats',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['booking_id', 'seat_id']
      }
    ]
  });

  return BookingSeat;
};