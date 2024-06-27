import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';

const ExcelUpload = () => {
  const [data, setData] = useState([]);
  const [tableName, setTableName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const binaryStr = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setData(jsonData);
    };

    reader.readAsBinaryString(file);
  };

  const handleUploadToServer = () => {
    axios.post('http://localhost:3001/upload', { data, tableName })
      .then(response => {
        console.log('Data uploaded successfully:', response.data);
      })
      .catch(error => {
        console.error('Error uploading data:', error);
      });
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
      />
      <input
        type="text"
        placeholder="Enter table name"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
      />
      <button onClick={handleUploadToServer}>
        Upload to Server
      </button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default ExcelUpload;
