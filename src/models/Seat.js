// src/models/Seat.js
module.exports = (sequelize, DataTypes) => {
  const Seat = sequelize.define('Seat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    room_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    row: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('standard', 'premium', 'vip'),
      defaultValue: 'standard'
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
      defaultValue: 'available'
    }
  }, {
    tableName: 'seats',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['room_id', 'row', 'number']
      }
    ]
  });

  return Seat;
};