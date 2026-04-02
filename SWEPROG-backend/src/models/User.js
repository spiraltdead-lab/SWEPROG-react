const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'guest'),
    defaultValue: 'guest'
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    field: 'two_factor_secret'
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'two_factor_enabled'
  },
  languagePreference: {
    type: DataTypes.ENUM('sv', 'en', 'ar'),
    defaultValue: 'sv',
    field: 'language_preference'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at'
  },
  lastLoginIp: {
    type: DataTypes.STRING,
    field: 'last_login_ip'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    }
  }
});

// Instansmetod för att jämföra lösenord
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = User;