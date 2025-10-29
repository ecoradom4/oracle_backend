module.exports = (sequelize, DataTypes) => {
  const BookingSeat = sequelize.define('BookingSeat', {
    id: {
      type: DataTypes.STRING(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    booking_id: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    seat_id: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
    tableName: 'booking_seats',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['booking_id', 'seat_id']
      }
    ]
  });

  return BookingSeat;
};