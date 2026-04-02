const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
    allowNull: true
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.INTEGER,
    field: 'entity_id'
  },
  oldValues: {
    type: DataTypes.JSON,
    field: 'old_values'
  },
  newValues: {
    type: DataTypes.JSON,
    field: 'new_values'
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = AuditLog;