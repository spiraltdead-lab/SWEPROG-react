const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
);

// Importera modeller
const User = require('./User');
const Session = require('./Session');
const AuditLog = require('./AuditLog');

// Sätt upp relationer
User.hasMany(Session, { foreignKey: 'user_id' });
Session.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Session,
  AuditLog
};