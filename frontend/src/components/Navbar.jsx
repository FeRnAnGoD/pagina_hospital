import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user, onLogout, telemetry }) {
  const location = useLocation();
  const isFire = telemetry?.fire_alarm_active;
  const userRole = user?.role?.toLowerCase();

  // Enlaces de navegación: Si el usuario es doctor o admin, se oculta '/pacientes' para evitar redundancia con '/fichas'
  const isDoctorOrAdmin = userRole === 'admin' || userRole === 'doctor';
  const publicNavItems = [
    { path: '/', label: 'Inicio', icon: '🏥' },
    ...(!isDoctorOrAdmin ? [{ path: '/pacientes', label: 'Consulta Pacientes', icon: '🔍' }] : []),
  ];

  // Enlaces restringidos según rol autenticado
  const showFichas = isDoctorOrAdmin;
  const showBms = userRole === 'admin' || userRole === 'engineer';
  const showRespaldo = userRole === 'admin';

  return (
    <header className="sticky-top shadow-sm">
      {/* Barra superior de estado de seguridad hospitalaria */}
      <div
        className={`py-1 px-4 text-white text-xs d-flex justify-content-between align-items-center ${
          isFire ? 'bg-pulse-danger' : 'bg-dark'
        }`}
        style={{ fontSize: '0.8rem' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${isFire ? 'bg-warning text-dark' : 'bg-success'}`}>
            {isFire ? '⚠️ ALERTA DE INCENDIO' : '● SISTEMA NOMINAL'}
          </span>
          <span className="d-none d-md-inline">
            Hospital Clínico Metropolitano Ciberlab | Central de Seguridad Sanitaria
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span>SAMU 131</span>
          <span className="font-mono">OT-BMS: {isFire ? 'SCRAM_TRIP' : 'ONLINE'}</span>
        </div>
      </div>

      {/* Barra de navegación principal */}
      <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: '#0A3D62' }}>
        <div className="container-fluid px-4">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-3 text-decoration-none">
            <div
              className="bg-white text-danger rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '42px', height: '42px', fontWeight: 'bold', fontSize: '1.4rem' }}
            >
              ✚
            </div>
            <div>
              <div className="fw-bold tracking-tight text-white fs-5" style={{ lineHeight: '1.1' }}>
                HOSPITAL METROPOLITANO
              </div>
              <div className="text-info small" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                CIBERLAB HEALTH SYSTEM
              </div>
            </div>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#hospitalNavbar"
            aria-controls="hospitalNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="hospitalNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-1">
              {/* Enlaces Públicos */}
              {publicNavItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <li className="nav-item" key={item.path}>
                    <Link
                      to={item.path}
                      className={`nav-link px-3 py-2 rounded-2 d-flex align-items-center gap-2 ${
                        active
                          ? 'bg-white bg-opacity-25 text-white fw-bold'
                          : 'text-white-50 hover-text-white'
                      }`}
                      style={{ transition: 'all 0.15s ease' }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}

              {/* Enlaces Restringidos visibles ÚNICAMENTE al autenticarse */}
              {showFichas && (
                <li className="nav-item">
                  <Link
                    to="/fichas"
                    className={`nav-link px-3 py-2 rounded-2 d-flex align-items-center gap-2 ${
                      location.pathname === '/fichas'
                        ? 'bg-white bg-opacity-25 text-white fw-bold'
                        : 'text-white-50 hover-text-white'
                    }`}
                  >
                    <span>📋</span>
                    <span>Fichas Clínicas (HIS)</span>
                  </Link>
                </li>
              )}

              {showBms && (
                <li className="nav-item">
                  <Link
                    to="/bms"
                    className={`nav-link px-3 py-2 rounded-2 d-flex align-items-center gap-2 ${
                      location.pathname === '/bms'
                        ? 'bg-white bg-opacity-25 text-white fw-bold'
                        : 'text-white-50 hover-text-white'
                    }`}
                  >
                    <span>⚡</span>
                    <span>BMS / Infraestructura OT</span>
                  </Link>
                </li>
              )}

              {showRespaldo && (
                <li className="nav-item">
                  <Link
                    to="/respaldo"
                    className={`nav-link px-3 py-2 rounded-2 d-flex align-items-center gap-2 border border-warning border-opacity-50 ${
                      location.pathname === '/respaldo'
                        ? 'bg-warning text-dark fw-bold'
                        : 'text-warning hover-text-white'
                    }`}
                  >
                    <span>💾</span>
                    <span>Respaldo DB (TI)</span>
                  </Link>
                </li>
              )}
            </ul>

            <div className="d-flex align-items-center gap-3">
              {user ? (
                <div className="d-flex align-items-center gap-2 bg-dark bg-opacity-25 py-1 px-3 rounded-pill border border-info border-opacity-25">
                  <div className="text-end">
                    <div className="text-white small fw-bold" style={{ fontSize: '0.8rem' }}>
                      {user.full_name || user.username}
                    </div>
                    <div className="text-info text-capitalize" style={{ fontSize: '0.7rem' }}>
                      Rol: {user.role} {user.role === 'admin' ? '⭐' : ''}
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="btn btn-sm btn-outline-light ms-2 py-0 px-2"
                    title="Cerrar Sesión"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn btn-info text-white btn-sm px-3 fw-semibold shadow-sm">
                  Acceso Personal Clínico
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
