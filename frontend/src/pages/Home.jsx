import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Home({ telemetry, user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/patients/summary')
      .then((res) => {
        setSummary(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar resumen hospitalario:", err);
        setLoading(false);
      });
  }, []);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <div className="pb-5">
      {/* Hero Section */}
      <section className="py-5 text-white" style={{ background: 'linear-gradient(135deg, #0A3D62 0%, #0E5A8A 100%)' }}>
        <div className="container py-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="badge bg-info text-dark px-3 py-2 fw-bold text-uppercase mb-3">
                Excelencia Asistencial & Cuidado de Salud
              </span>
              <h1 className="display-4 fw-bold mb-3">
                Hospital Clínico Metropolitano Ciberlab
              </h1>
              <p className="lead text-white-50 mb-4">
                Institución asistencial de alta complejidad dedicada a la atención integral de pacientes, docencia e investigación clínica. 
                Infraestructura hospitalaria monitorizada bajo altos estándares de bioseguridad.
              </p>
              <div className="d-flex flex-wrap gap-3">
                {user?.role?.toLowerCase() === 'doctor' ? (
                  <Link to="/fichas" className="btn btn-info btn-lg fw-bold text-white px-4 shadow-sm">
                    📋 Acceso a Fichas Clínicas (HIS Intranet)
                  </Link>
                ) : user?.role?.toLowerCase() === 'engineer' ? (
                  <Link to="/bms" className="btn btn-warning btn-lg fw-bold text-dark px-4 shadow-sm">
                    ⚡ Central de Control BMS / Infraestructura OT
                  </Link>
                ) : (
                  <Link to="/pacientes" className="btn btn-info btn-lg fw-bold text-white px-4 shadow-sm">
                    🔍 Consulta de Pacientes y Exámenes
                  </Link>
                )}
                {!user ? (
                  <Link to="/login" className="btn btn-outline-light btn-lg px-4">
                    🔒 Acceso Personal / Intranet
                  </Link>
                ) : isAdmin ? (
                  <Link to="/respaldo" className="btn btn-warning btn-lg fw-bold text-dark px-4 shadow-sm">
                    💾 Gestión y Respaldo TI
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card-clinical p-4 text-dark shadow-lg border-0">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <h5 className="fw-bold mb-0 text-primary-ciber">Estado de la Red Asistencial</h5>
                  <span className="badge bg-success">Operativo</span>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="fs-3 fw-bold text-primary-ciber">
                        {loading ? '...' : (summary?.total_pacientes_registrados || 150)}
                      </div>
                      <div className="small text-muted fw-semibold">Pacientes en Registro</div>
                    </div>
                  </div>

                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="fs-3 fw-bold text-danger">
                        {loading ? '...' : (summary?.camas_uci_ocupadas || 32)}
                      </div>
                      <div className="small text-muted fw-semibold">Camas UCI Ocupadas</div>
                    </div>
                  </div>

                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="fs-3 fw-bold text-info">
                        {loading ? '...' : (summary?.pacientes_hospitalizados || 30)}
                      </div>
                      <div className="small text-muted fw-semibold">En Hospitalización</div>
                    </div>
                  </div>

                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="fs-3 fw-bold text-success">
                        {loading ? '...' : (summary?.altas_semana || 23)}
                      </div>
                      <div className="small text-muted fw-semibold">Altas Médicas Semana</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-top text-center text-muted small font-mono">
                  {summary?.sistema_his || 'HIS Clinical Database Core v4.2'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Hospitalarios Públicos */}
      <section className="container mt-5">
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card-clinical p-4 h-100">
              <div className="fs-2 mb-3">🩺</div>
              <h5 className="fw-bold text-primary-ciber">Consulta de Pacientes & Citas</h5>
              <p className="text-muted small">
                Buscador asistencial para consultar resultados de exámenes, turnos de atención y ubicación de pacientes hospitalizados.
              </p>
              <Link to="/pacientes" className="btn btn-outline-primary btn-sm mt-auto fw-semibold">
                Consultar Portal →
              </Link>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card-clinical p-4 h-100">
              <div className="fs-2 mb-3">🏥</div>
              <h5 className="fw-bold text-primary-ciber">Unidad de Paciente Crítico (UPC)</h5>
              <p className="text-muted small">
                Área de cuidados intensivos y tratamiento de alta complejidad con monitoreo biomédico continuo 24 horas.
              </p>
              <div className="small text-muted mt-auto pt-2 border-top">
                Capacidad Máxima: 40 Camas de Monitoreo
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card-clinical p-4 h-100">
              <div className="fs-2 mb-3">🔐</div>
              <h5 className="fw-bold text-primary-ciber">Intranet Personal Clínico & TI</h5>
              <p className="text-muted small">
                Acceso restringido para el cuerpo médico, enfermería e ingenieros de mantenimiento de infraestructura hospitalaria.
              </p>
              <Link to="/login" className="btn btn-outline-dark btn-sm mt-auto fw-semibold">
                Ingreso Intranet →
              </Link>
            </div>
          </div>
        </div>

        {/* Panel Administrativo si el usuario es Admin */}
        {isAdmin && (
          <div className="mt-5 p-4 rounded-3 bg-dark text-white border border-warning shadow-lg">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom border-secondary pb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-warning text-dark font-mono">CONSOLA ADMINISTRATIVA TI</span>
                <span className="small text-muted">Sesión Activa: {user.full_name}</span>
              </div>
              <span className="badge bg-danger">ROL ADMINISTRADOR</span>
            </div>
            <p className="small text-white-50 mb-3">
              Ha iniciado sesión con credenciales de nivel de Administración General. Tiene acceso exclusivo a los módulos restringidos del hospital:
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/fichas" className="btn btn-outline-light btn-sm">
                📋 Fichas Clínicas (HIS Completo)
              </Link>
              <Link to="/bms" className="btn btn-outline-info btn-sm">
                ⚡ Supervisión BMS & Gases Medicinales (OT)
              </Link>
              <Link to="/respaldo" className="btn btn-warning btn-sm text-dark fw-bold">
                💾 Respaldo y Descarga de Base de Datos
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
