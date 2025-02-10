import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainPage from './components/MainPage';
import LaboratoryPage from './components/LaboratoryPage';
import KeycloakService from './KeycloakService';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL;

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [isStaff, setIsStaff] = useState(null);

  useEffect(() => {
    const initializeKeycloak = async () => {
      try {
        const tokenData = await KeycloakService.init();
        setIsAuthenticated(true);
        setUsername(tokenData.fullName);

        // Добавляем интерсептор axios после инициализации Keycloak
        axios.interceptors.request.use(async config => {
          await KeycloakService.updateToken(5);
          const token = KeycloakService.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        });

        // Запрос на получение данных пользователя
        const response = await axios.get(`${API_URL}/api/users/`);
        setIsStaff(response.data.is_staff);
      } catch (error) {
        console.error('Не удалось инициализировать Keycloak:', error);
      }
    };

    initializeKeycloak();
  }, []);

  return (
    <Router>
      <div className="App">
        <Header username={username} />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/laboratory/:id" element={<LaboratoryPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
