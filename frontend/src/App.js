import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ExcelUpload from './components/ExcelUpload';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PrivateRoute from './components/auth/PrivateRoute';
import Logout from './components/auth/Logout';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

function App() {
  return (
    <Router>
      <div className="App">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Excel Upload Tool
            </Typography>
            <Button color="inherit" href="/login">Login</Button>
            <Button color="inherit" href="/register">Register</Button>
            <Button color="inherit" href="/logout">Logout</Button>
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/" element={<PrivateRoute component={ExcelUpload} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
