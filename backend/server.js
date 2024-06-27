const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./db');
const { DataTypes } = require('sequelize');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

const createTableFromData = async (tableName, data) => {
  const columns = {};
  const sample = data[0];
  for (const key in sample) {
    columns[key] = {
      type: DataTypes.STRING,
      allowNull: true,
    };
  }

  const Model = sequelize.define(tableName, columns, {
    freezeTableName: true,
  });

  await Model.sync();
  return Model;
};

app.post('/upload', async (req, res) => {
  const data = req.body.data;
  const tableName = req.body.tableName || 'default_table';

  console.log('Received data:', data);

  try {
    const TableModel = await createTableFromData(tableName, data);

    for (const item of data) {
      await TableModel.create(item);
    }

    res.status(200).send({ message: 'Data received and saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send({ message: 'Error saving data' });
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
