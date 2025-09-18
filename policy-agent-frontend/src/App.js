import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Chat from './Chat';

export const AuthContext = React.createContext();

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const login = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      <BrowserRouter>
        <Routes>
          {!token && <Route path="*" element={<Login />} />}
          {token && <Route path="*" element={<Chat />} />}
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
