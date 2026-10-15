import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminRecords() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/patients/summary')
      .then((res) => {
        setSummary(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar resumen:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container py-4">
      {/* Encabezado */}
      <div className="mb-4 pb-3 border-bottom">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="badge bg-secondary text-white font-mono">DISASTER RECOVERY & HIS EXPORT</span>
          <span className="badge bg-danger">CLASIFICACIÓN RESERVADA</span>
        </div>
        <h2 className="fw-bold text-primary-ciber mb-1">
          Respaldo y Contingencia de Base de Datos Hospitalaria
        </h2>
        <p className="text-muted small mb-0">
          Módulo central para la exportación íntegra de expedientes clínicos ante auditorías ministeriales o fallas mayores de infraestructura.
        </p>
      </div>

      <div className="row g-4 mb-4">
        {/* Tarjeta de Descarga de Base de Datos (Objetivo Desafío 1) */}
        <div className="col-lg-7">
          <div className="card-clinical p-4 h-100 border-primary border-opacity-25">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="fs-3">💾</span>
              <div>
                <h5 className="fw-bold text-primary-ciber mb-0">
                  Exportación de Base de Datos Clínica Completa
                </h5>
                <span className="small text-muted font-mono">Motor de Almacenamiento: SQLite / HL7 FHIR Compatible</span>
              </div>
            </div>

            <p className="small text-muted mb-4">
              La base de datos contiene los <strong>150 expedientes clínicos activos</strong> del hospital, incluyendo datos filiatorios, diagnósticos reservados y notas médicas confidenciales.
              Al descargar la base de datos, el participante puede explorar las tablas y consultar el registro de paciente con <strong>ID 140</strong> para extraer la bandera de auditoría.
            </p>

            {/* Botones de Descarga */}
            <div className="d-flex flex-column flex-sm-row gap-3 mb-4">
              <a
                href={`/api/patients/backup/download?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                download="hospital_clinical_database_backup.sqlite"
                className="btn btn-primary btn-lg fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
              >
                <span>📦</span>
                <span>Descargar Base de Datos (.sqlite)</span>
              </a>

              <a
                href={`/api/patients/backup/dump-sql?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                download="hospital_pacientes_dump.sql"
                className="btn btn-outline-primary btn-lg fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
              >
                <span>📄</span>
                <span>Descargar Volcado SQL (.sql)</span>
              </a>
            </div>

            {/* Guía de Análisis para el CTF */}
            <div className="p-3 bg-light rounded-3 border">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-dark text-warning font-mono">GUÍA DE PRUEBA CTF</span>
                <span className="small fw-bold text-dark">¿Cómo inspeccionar el registro 140 tras la descarga?</span>
              </div>
              <ul className="small text-muted mb-0 ps-3">
                <li>
                  <strong>Opción A (Terminal con SQLite):</strong>
                  <div className="font-mono bg-dark text-light p-2 rounded my-1" style={{ fontSize: '0.78rem' }}>
                    sqlite3 hospital_clinical_database_backup.sqlite "SELECT id, first_name, last_name, confidential_notes FROM patients WHERE id=140;"
                  </div>
                </li>
                <li>
                  <strong>Opción B (Herramienta gráfica):</strong> Abrir el archivo descargado en <em>DB Browser for SQLite</em> o <em>DBeaver</em> y filtrar en la tabla <code>patients</code> por <code>id = 140</code>.
                </li>
                <li>
                  <strong>Opción C (Volcado .sql):</strong> Abrir <code>hospital_pacientes_dump.sql</code> con un editor de texto o ejecutar <code>grep "FLAG" hospital_pacientes_dump.sql</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Panel de Metadatos y Esquema */}
        <div className="col-lg-5">
          <div className="card-clinical p-4 h-100">
            <h5 className="fw-bold text-primary-ciber mb-3">
              Metadatos del Repositorio Clínico
            </h5>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded border">
                <span className="small text-muted">Total de Pacientes:</span>
                <span className="fw-bold font-mono text-primary-ciber">
                  {loading ? '...' : (summary?.total_pacientes_registrados || 150)} Fichas
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded border">
                <span className="small text-muted">Registro con Flag Oculta:</span>
                <span className="badge bg-warning text-dark font-mono">Paciente ID #140</span>
              </div>

              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded border">
                <span className="small text-muted">Estado del Servicio HIS:</span>
                <span className="badge bg-success font-mono">EN LÍNEA (v4.2)</span>
              </div>

              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded border">
                <span className="small text-muted">Algoritmo de Integridad:</span>
                <span className="small font-mono text-muted">SHA256 Checksum OK</span>
              </div>
            </div>

            <div className="p-3 bg-dark text-white rounded-3">
              <div className="small font-mono text-muted mb-1">ESQUEMA DE TABLA (patients):</div>
              <pre className="font-mono text-info mb-0" style={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>
{`id INTEGER PRIMARY KEY,
rut VARCHAR(20),
first_name VARCHAR(100),
last_name VARCHAR(100),
diagnosis VARCHAR(255),
attending_doctor VARCHAR(120),
room VARCHAR(50),
status VARCHAR(50),
confidential_notes TEXT -- [FLAG HERE]`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
