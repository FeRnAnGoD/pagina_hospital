import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

// Componentes
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FireAlertBanner from './components/FireAlertBanner';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Home from './pages/Home';
import PatientPortal from './pages/PatientPortal';
import AdminRecords from './pages/AdminRecords';
import BmsControl from './pages/BmsControl';
import Login from './pages/Login';

// Estilos
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  // Configurar interceptor de Axios para incluir token JWT en todas las peticiones
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  // Cargar usuario desde localStorage si existe
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Polling de telemetría OT cada 2 segundos
  const fetchTelemetry = () => {
    axios.get('/api/ot/telemetry')
      .then((res) => {
        setTelemetry(res.data);
      })
      .catch((err) => {
        console.error("Error al obtener telemetría:", err);
      });
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const handleResetOT = () => {
    axios.post('/api/ot/reset')
      .then(() => fetchTelemetry())
      .catch((err) => console.error(err));
  };

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        {/* Alerta Global de Incendio / Código Rojo */}
        <FireAlertBanner telemetry={telemetry} onReset={handleResetOT} />

        {/* Barra de Navegación Institucional Dinámica */}
        <Navbar user={user} onLogout={handleLogout} telemetry={telemetry} />

        {/* Contenido Principal con Rutas Públicas y Protegidas */}
        <main className="flex-grow-1">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Home telemetry={telemetry} user={user} />} />
            <Route path="/pacientes" element={<PatientPortal user={user} />} />
            <Route path="/login" element={<Login onLoginSuccess={setUser} />} />

            {/* Rutas Protegidas por Rol (RBAC) */}
            <Route
              path="/fichas"
              element={
                <ProtectedRoute user={user} allowedRoles={['admin', 'doctor']}>
                  <PatientPortal user={user} isInternalView={true} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/bms"
              element={
                <ProtectedRoute user={user} allowedRoles={['admin', 'engineer']}>
                  <BmsControl telemetry={telemetry} onRefreshTelemetry={fetchTelemetry} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/respaldo"
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <AdminRecords />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        {/* Pie de Página */}
        <Footer />
      </div>
    </Router>
  );
}
