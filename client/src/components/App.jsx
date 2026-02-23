// src/components/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import Ingreso from '../pages/Ingreso.jsx';
import Principal from '../pages/Principal.jsx';
import Inventario from '../pages/Inventario.jsx';
import RegistroVentas from '../pages/RegistroVentas';
import Reportes from '../pages/Reportes.jsx';
import Registro from '../pages/Registro.jsx';
import Administracion from '../pages/Administracion.jsx';
import Auditoria from '../pages/Auditoria.jsx';
import '../styles/index.css';
import '../styles/reset.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Ingreso />} />
      <Route path="/ingreso" element={<Ingreso />} />

      {/* Rutas Protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/principal" element={<Principal />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/ventas" element={<RegistroVentas />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/administracion" element={<Administracion />} />
        <Route path="/auditoria" element={<Auditoria />} />
      </Route>
    </Routes>
  );
}

export default App;