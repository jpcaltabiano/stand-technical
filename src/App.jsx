import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Underwriter from './pages/Underwriter';
import Science from './pages/Science';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/underwriter" element={<Underwriter />} />
      <Route path="/science" element={<Science />} />
    </Routes>
  );
}
