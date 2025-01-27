import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainPage from './components/MainPage';
import LaboratoryPage from './components/LaboratoryPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/laboratory/:id" element={<LaboratoryPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
