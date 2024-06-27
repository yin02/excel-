const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./db');
const { DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx'); // 新增

const app = express();
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

const User = sequelize.define('user', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

User.sync();

const createTableFromData = async (tableName, data) => {
  const columns = {};
  const sample = data[0];
  for (const key in sample) {
    if (key === 'id') {
      columns[key] = {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      };
    } else if (key === 'createdAt' || key === 'updatedAt') {
      columns[key] = {
        type: DataTypes.DATE,
        allowNull: true,
      };
    } else {
      columns[key] = {
        type: DataTypes.STRING,
        allowNull: true,
      };
    }
  }

  const Model = sequelize.define(tableName, columns, {
    freezeTableName: true,
  });

  await Model.sync();
  return Model;
};

// User Registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error registering user', error });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token.split(' ')[1], SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Upload data route
app.post('/upload', authenticateToken, async (req, res) => {
  const { data, tableName } = req.body;

  console.log('Received data:', data);
  console.log('Table name:', tableName);

  try {
    const TableModel = await createTableFromData(tableName, data);
    console.log('Table model created:', tableName);

    for (const item of data) {
      await TableModel.create(item);
      console.log('Data inserted:', item);
    }

    res.status(200).send({ message: 'Data received and saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send({ message: 'Error saving data' });
  }
});

// Query data route
app.get('/query', authenticateToken, async (req, res) => {
  const tableName = req.query.tableName;
  const columnName = req.query.columnName;
  const value = req.query.value;
  const limit = parseInt(req.query.limit, 10) || 15;
  const offset = parseInt(req.query.offset, 10) || 0;

  if (!tableName) {
    return res.status(400).send({ message: 'Table name is required' });
  }

  try {
    const TableModel = sequelize.models[tableName];
    if (!TableModel) {
      return res.status(404).send({ message: 'Table not found' });
    }

    let results;
    if (columnName && value) {
      // Query for specific row
      results = await TableModel.findAndCountAll({ where: { [columnName]: value }, limit, offset });
    } else if (columnName) {
      // Query for specific column
      results = await TableModel.findAndCountAll({ attributes: [columnName], limit, offset });
    } else {
      // Query all data
      results = await TableModel.findAndCountAll({ limit, offset });
    }

    res.status(200).send(results);
  } catch (error) {
    console.error('Error querying data:', error);
    res.status(500).send({ message: 'Error querying data' });
  }
});

// Delete data route
app.post('/delete', authenticateToken, async (req, res) => {
  const tableName = req.body.tableName;
  const rowId = req.body.rowId;
  const idColumnName = req.body.idColumnName;

  if (!tableName || !rowId || !idColumnName) {
    return res.status(400).send({ message: 'Table name, row ID, and ID column name are required' });
  }

  try {
    const TableModel = sequelize.models[tableName];
    if (!TableModel) {
      return res.status(404).send({ message: 'Table not found' });
    }

    await TableModel.destroy({ where: { [idColumnName]: rowId } });

    res.status(200).send({ message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).send({ message: 'Error deleting data' });
  }
});

// Update data route
app.post('/update', authenticateToken, async (req, res) => {
  const tableName = req.body.tableName;
  const rowId = req.body.rowId;
  const data = req.body.data;
  const idColumnName = req.body.idColumnName;

  if (!tableName || !rowId || !data || !idColumnName) {
    return res.status(400).send({ message: 'Table name, row ID, data, and ID column name are required' });
  }

  try {
    const TableModel = sequelize.models[tableName];
    if (!TableModel) {
      return res.status(404).send({ message: 'Table not found' });
    }

    await TableModel.update(data, { where: { [idColumnName]: rowId } });

    res.status(200).send({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).send({ message: 'Error updating data' });
  }
});

// 导出数据为 Excel 文件
app.get('/export', authenticateToken, async (req, res) => {
  const tableName = req.query.tableName;

  if (!tableName) {
    return res.status(400).send({ message: 'Table name is required' });
  }

  try {
    const TableModel = sequelize.models[tableName];
    if (!TableModel) {
      return res.status(404).send({ message: 'Table not found' });
    }

    const data = await TableModel.findAll();
    const jsonData = data.map(item => item.get({ plain: true }));

    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', `attachment; filename=${tableName}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).send({ message: 'Error exporting data' });
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
