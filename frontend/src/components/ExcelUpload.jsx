import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Container,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
} from '@mui/material';

const ExcelUpload = () => {
  const [data, setData] = useState([]);
  const [tableName, setTableName] = useState('');
  const [queryColumnName, setQueryColumnName] = useState('');
  const [queryValue, setQueryValue] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [newRowData, setNewRowData] = useState({});
  const [pageSize, setPageSize] = useState(15);
  const [isAdding, setIsAdding] = useState(false);
  const idColumnName = 'id';

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setData(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadToServer = () => {
    axios.post('http://localhost:3001/upload', { data, tableName }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
      console.log('Data uploaded successfully:', response.data);
      handleQuery(0); // Refresh the data after upload
    })
    .catch(error => {
      console.error('Error uploading data:', error);
      if (error.response) {
        console.error('Server responded with:', error.response.data);
      }
    });
  };

  const handleQuery = (newOffset = 0) => {
    axios.get('http://localhost:3001/query', {
      params: { tableName, columnName: queryColumnName, value: queryValue, limit: pageSize, offset: newOffset },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
      setQueryResults(response.data.rows || []);
      setTotalCount(response.data.count || 0);
      setOffset(newOffset);
    })
    .catch(error => {
      console.error('Error querying data:', error);
    });
  };

  const handleDelete = (rowId) => {
    axios.post('http://localhost:3001/delete', {
      tableName,
      rowId,
      idColumnName
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
      console.log('Data deleted successfully:', response.data);
      handleQuery(offset); // Refresh the data
    })
    .catch(error => {
      console.error('Error deleting data:', error);
    });
  };

  const handleEdit = (row) => {
    setEditRowId(row[idColumnName]);
    setEditRowData(row);
  };

  const handleSaveEdit = () => {
    axios.post('http://localhost:3001/update', {
      tableName,
      rowId: editRowId,
      data: editRowData,
      idColumnName
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
      console.log('Data updated successfully:', response.data);
      setEditRowId(null);
      handleQuery(offset); // Refresh the data
    })
    .catch(error => {
      console.error('Error updating data:', error);
    });
  };

  const handleAddNewRow = () => {
    const completeNewRowData = {};
    if (queryResults.length > 0) {
      Object.keys(queryResults[0]).forEach(key => {
        completeNewRowData[key] = newRowData[key] !== undefined ? newRowData[key] : null;
      });
    }

    completeNewRowData['createdAt'] = null;
    completeNewRowData['updatedAt'] = null;

    setQueryResults(prevResults => [...prevResults, completeNewRowData]);
    setNewRowData({});
    setIsAdding(false); // 关闭新增状态
    axios.post('http://localhost:3001/upload', {
      data: [completeNewRowData],
      tableName
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
      console.log('New data added successfully:', response.data);
      handleQuery(offset); // Refresh the data
    })
    .catch(error => {
      console.error('Error adding new data:', error);
    });
  };

  const handleChange = (e, key) => {
    setEditRowData({
      ...editRowData,
      [key]: e.target.value
    });
  };

  const handleNewRowChange = (e, key) => {
    setNewRowData({
      ...newRowData,
      [key]: e.target.value
    });
  };

  const handleNextPage = () => {
    if (offset + pageSize < totalCount) {
      handleQuery(offset + pageSize);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      handleQuery(offset - pageSize);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    handleQuery(0); // Reset to the first page with the new page size
  };

  const handleExport = () => {
    axios.get('http://localhost:3001/export', {
      params: { tableName },
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tableName}.xlsx`);
      document.body.appendChild(link);
      link.click();
    })
    .catch(error => {
      console.error('Error exporting data:', error);
    });
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Excel Upload Tool
      </Typography>
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button variant="contained" color="primary" onClick={() => setIsAdding(true)}>
              Add New Row
            </Button>
          </Grid>
          <Grid item>
            <Typography variant="body1">
              Total Records: {totalCount}
            </Typography>
          </Grid>
          <Grid item>
            <Button variant="contained" color="secondary" onClick={handleExport}>
              Export to Excel
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField
              type="file"
              inputProps={{ accept: ".xlsx, .xls" }}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="contained" component="span">
                Upload Excel File
              </Button>
            </label>
          </Grid>
          <Grid item>
            <TextField
              label="Table Name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={handleUploadToServer}>
              Upload to Server
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField
              label="Column Name for Query"
              value={queryColumnName}
              onChange={(e) => setQueryColumnName(e.target.value)}
            />
          </Grid>
          <Grid item>
            <TextField
              label="Value for Query"
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={() => handleQuery(0)}>
              Query
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Box mb={3}>
        <FormControl>
          <InputLabel>Page Size</InputLabel>
          <Select value={pageSize} onChange={handlePageSizeChange}>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={15}>15</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" onClick={() => setIsAdding(true)} style={{ marginLeft: '10px' }}>
          Add New Row
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {queryResults.length > 0 && Object.keys(queryResults[0]).map((key) => (
                <TableCell key={key}>{key}</TableCell>
              ))}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <TableRow>
                {queryResults.length > 0 && Object.keys(queryResults[0]).map((key) => (
                  <TableCell key={key}>
                    <TextField
                      value={newRowData[key] || ''}
                      onChange={(e) => handleNewRowChange(e, key)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button variant="contained" color="primary" onClick={handleAddNewRow}>
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {Array.isArray(queryResults) && queryResults.map((row, index) => (
              <TableRow key={index}>
                {Object.keys(row).map((key, i) => (
                  <TableCell key={i} data-label={key}>
                    {editRowId === row[idColumnName] ? (
                      <TextField
                        value={editRowData[key]}
                        onChange={(e) => handleChange(e, key)}
                      />
                    ) : (
                      row[key]
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {editRowId === row[idColumnName] ? (
                    <Button variant="contained" color="primary" onClick={handleSaveEdit}>
                      Save
                    </Button>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="flex-start">
                      <Button variant="contained" color="primary" onClick={() => handleEdit(row)} style={{ marginBottom: '5px' }}>
                        Edit
                      </Button>
                      <Button variant="contained" color="secondary" onClick={() => handleDelete(row[idColumnName])}>
                        Delete
                      </Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box mt={3}>
        <Button variant="contained" onClick={handlePrevPage} disabled={offset === 0}>
          Previous
        </Button>
        <Button variant="contained" onClick={handleNextPage} disabled={offset + pageSize >= totalCount} style={{ marginLeft: '10px' }}>
          Next
        </Button>
      </Box>
    </Container>
  );
};

export default ExcelUpload;
