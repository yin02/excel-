const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Data = sequelize.define('Data', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Data;
