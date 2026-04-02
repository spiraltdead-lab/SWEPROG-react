const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_revoked'
  }
}, {
  tableName: 'sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Session;