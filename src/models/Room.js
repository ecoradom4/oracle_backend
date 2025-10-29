// src/models/Room.js - Oracle Compatible
module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'Estándar',
      validate: {
        isIn: [['Estándar', 'Premium', 'VIP', 'IMAX', '4DX']]
      }
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'maintenance', 'inactive']]
      }
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: [['Miraflores', 'Antigua Telares', 'Cayala', 'Oakland Mall']]
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
    tableName: 'rooms',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Room;
};