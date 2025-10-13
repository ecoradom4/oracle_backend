// src/models/Room.js
module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('Estándar', 'Premium', 'VIP', 'IMAX', '4DX'),
      defaultValue: 'Estándar'
    },
    status: {
      type: DataTypes.ENUM('active', 'maintenance', 'inactive'),
      defaultValue: 'active'
    },
    location: {
      type: DataTypes.ENUM('Planta Baja', 'Primer Piso', 'Segundo Piso', 'Tercer Piso'),
      allowNull: false
    }
  }, {
    tableName: 'rooms',
    timestamps: true
  });

  return Room;
};