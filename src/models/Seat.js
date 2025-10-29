// src/models/Seat.js - Oracle Compatible
module.exports = (sequelize, DataTypes) => {
  const Seat = sequelize.define('Seat', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    room_id: {
      type: DataTypes.STRING(36),
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
      type: DataTypes.STRING(20),
      defaultValue: 'standard',
      validate: {
        isIn: [['standard', 'premium', 'vip']]
      }
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'available',
      validate: {
        isIn: [['available', 'occupied', 'maintenance']]
      }
    },
    created_at: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'seats',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['room_id', 'row', 'number']
      }
    ]
  });

  return Seat;
};