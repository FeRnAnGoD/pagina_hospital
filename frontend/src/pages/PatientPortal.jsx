import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function PatientPortal({ user, isInternalView = false }) {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wafBlocked, setWafBlocked] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Determinar si el usuario cuenta con credenciales de personal clínico
  const isStaff = isInternalView || (user && ['admin', 'doctor'].includes(user.role?.toLowerCase()));
  const isAdmin = user && user.role?.toLowerCase() === 'admin';

  useEffect(() => {
    setLoading(true);
    axios.get('/api/patients/recent')
      .then((res) => {
        setPatients(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [user, isInternalView]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setWafBlocked(null);

    axios.get(`/api/patients/search?query=${encodeURIComponent(query)}`)
      .then((res) => {
        setPatients(res.data.results || []);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setPatients([]);
        if (err.response?.data?.waf_blocked) {
          setWafBlocked(err.response.data);
        } else {
          setError(err.response?.data?.detail || err.response?.data?.error || 'Error al ejecutar la consulta clínica');
        }
      });
  };

  const handleSelectPatient = (p) => {
    setLoadingDetail(true);
    setSelectedPatient(p);
    axios.get(`/api/patients/${p.id}`)
      .then((res) => {
        setSelectedPatient(res.data);
        setLoadingDetail(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingDetail(false);
      });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'UCI': return 'badge-uci';
      case 'Alta Médica': return 'badge-alta';
      case 'Observación': return 'badge-observacion';
      case 'Pabellón': return 'badge-pabellon';
      default: return 'badge-ingresado';
    }
  };

  return (
    <div className="container py-4">
      {/* Encabezado */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge ${isStaff ? 'bg-success' : 'bg-primary'} text-white`}>
              {isStaff ? 'HIS INTRANET MÉDICA' : 'PORTAL PÚBLICO DE ATENCIÓN'}
            </span>
            <span className="badge bg-dark text-info font-mono">
              🛡️ WAF-GUARD v2.4 ACTIVO
            </span>
            <span className="text-muted small font-mono">
              {isStaff ? 'ACCESO CLÍNICO AUTORIZADO' : 'CUMPLIMIENTO LEY 20.584'}
            </span>
          </div>
          <h2 className="fw-bold text-primary-ciber mb-1 mt-1">
            {isStaff ? 'Expedientes Clínicos de Hospitalización' : 'Portal de Información Asistencial de Pacientes'}
          </h2>
          <p className="text-muted small mb-0">
            {isStaff
              ? 'Módulo médico reservado para seguimiento intrahospitalario, asignación de camas, diagnósticos y fichas completas.'
              : 'Consulte el estado general de admisiones y ubicación de visitas de familiares mediante RUT o Nombre.'}
          </p>
        </div>

        <div className="text-md-end font-mono small text-muted">
          <div>Norma Sanitaria: <strong>MINSAL-CL 2026</strong></div>
          <div>Nivel de Acceso: <span className={isStaff ? 'text-success fw-bold' : 'text-primary fw-bold'}>{isStaff ? (isAdmin ? 'ADMINISTRADOR TI' : 'MÉDICO CLÍNICO') : 'VISITA PÚBLICA (RESTRINGIDO)'}</span></div>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="card-clinical p-4 mb-4">
        <form onSubmit={handleSearch}>
          <div className="row g-2">
            <div className="col-md-9">
              <div className="input-group">
                <span className="input-group-text bg-light text-muted">🔍</span>
                <input
                  type="text"
                  className="form-control form-control-lg fs-6"
                  placeholder={isStaff ? "Buscar por RUT, Nombre del Paciente o Diagnóstico..." : "Ingrese RUT (ej: 14.205.280-K) o Nombre del Paciente para consultar sala..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-info text-white fw-bold btn-lg w-100 fs-6 shadow-sm"
              >
                {loading ? 'Consultando...' : 'Buscar Paciente'}
              </button>
            </div>
          </div>
        </form>

        {/* Notificación de Bloqueo por WAF */}
        {wafBlocked && (
          <div className="mt-3 p-3 bg-danger bg-opacity-10 border border-danger border-opacity-50 rounded text-danger">
            <div className="d-flex align-items-center gap-2 fw-bold fs-6 mb-1">
              <span>🛡️</span>
              <span>{wafBlocked.error}</span>
            </div>
            <div className="small font-mono mb-2">
              <strong>Firma detectada:</strong> {wafBlocked.rule_name} ({wafBlocked.rule_id}) | <strong>Incidente:</strong> {wafBlocked.incident_id}
            </div>
            <div className="small mb-1">
              {wafBlocked.message}
            </div>
            <div className="small text-muted border-top border-danger border-opacity-25 pt-1 mt-1 fst-italic">
              ℹ️ {wafBlocked.hint}
            </div>
          </div>
        )}

        {/* Notificación de Error General */}
        {error && (
          <div className="mt-3 p-3 bg-warning bg-opacity-10 border border-warning border-opacity-50 rounded text-dark small font-mono">
            <strong>⚠️ Excepción del Motor de Datos:</strong> {error}
          </div>
        )}
      </div>

      {/* Resultados de la Búsqueda */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold text-dark mb-0">
          Registros Obtenidos ({patients.length})
        </h5>
        {patients.length >= 100 && (
          <span className="badge bg-danger font-mono animate-pulse">
            🚨 Base de Datos Completa Enumerada ({patients.length} registros)
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando registros...</span>
          </div>
          <div className="mt-2 text-muted small">Consultando motor de datos hospitalario...</div>
        </div>
      ) : patients.length === 0 ? (
        <div className="card-clinical p-5 text-center text-muted">
          <div className="fs-1 mb-2">📁</div>
          <h6>No se encontraron pacientes para el criterio ingresado</h6>
          <p className="small mb-0">Intente buscar por nombre, apellido o ejecute una búsqueda general.</p>
        </div>
      ) : (
        <div className="row g-3">
          {patients.map((p) => (
            <div className="col-md-6 col-lg-4" key={p.id}>
              <div
                className="card-clinical p-3 h-100 d-flex flex-column"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectPatient(p)}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className={`badge-status ${getStatusBadge(p.status)}`}>
                    {p.status}
                  </span>
                  <span className="badge bg-light text-dark border font-mono small">
                    ID #{p.id}
                  </span>
                </div>

                <h6 className="fw-bold text-primary-ciber mb-1">
                  {p.full_name || `${p.first_name} ${p.last_name}`}
                </h6>
                
                {/* Datos según rol: Si es público, oculta grupo y diagnóstico confidencial */}
                {isStaff ? (
                  <>
                    <div className="small font-mono text-muted mb-2">
                      RUT: {p.rut} | Grupo: {p.blood_type}
                    </div>
                    <div className="small text-muted mb-2" style={{ fontSize: '0.82rem' }}>
                      <strong>Diagnóstico:</strong> {p.diagnosis}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="small font-mono text-muted mb-2">
                      RUT: {p.rut}
                    </div>
                    <div className="small text-muted mb-2" style={{ fontSize: '0.82rem' }}>
                      <strong>Médico:</strong> {p.attending_doctor}
                    </div>
                  </>
                )}

                <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center small text-muted" style={{ fontSize: '0.78rem' }}>
                  <span>📍 {p.room}</span>
                  <span className="text-primary fw-semibold">{isStaff ? 'Ver Ficha Completa →' : 'Consultar Estado →'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle de Ficha Clínica */}
      {selectedPatient && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary-ciber text-white">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    {isStaff ? 'Expediente Clínico Oficial: ' : 'Información de Atención: '}
                    {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}
                  </h5>
                  <div className="small text-light opacity-75 font-mono">
                    ID #{selectedPatient.id} | RUT: {selectedPatient.rut}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedPatient(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {loadingDetail && (
                  <div className="text-center py-2 text-muted small">
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Cargando expediente...
                  </div>
                )}

                {/* Vista Pública: Solo datos asistenciales básicos y de visita */}
                {(!isStaff || selectedPatient.is_restricted) ? (
                  <div>
                    {/* Información Pública Autorizada */}
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <h6 className="fw-bold text-primary mb-2">
                        📋 Información Asistencial de Visita
                      </h6>
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <span className="text-muted">Nombre del Paciente:</span>
                          <div className="fw-semibold">{selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}</div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">RUT (Protección de Privacidad):</span>
                          <div className="font-mono fw-bold">{selectedPatient.rut}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Ubicación / Pabellón:</span>
                          <div className="fw-bold text-dark">📍 {selectedPatient.room}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Estado Asistencial:</span>
                          <div>
                            <span className={`badge-status ${getStatusBadge(selectedPatient.status)}`}>
                              {selectedPatient.status}
                            </span>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Médico Tratante:</span>
                          <div>{selectedPatient.attending_doctor}</div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">Fecha de Ingreso:</span>
                          <div>{selectedPatient.admission_date}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bloque de Protección de Datos Sensibles (Ley 20.584) */}
                    <div className="p-4 bg-secondary bg-opacity-10 border border-secondary border-opacity-25 rounded-3 text-center my-3">
                      <div className="fs-1 mb-2">🔒</div>
                      <h6 className="fw-bold text-dark mb-1">
                        Expediente Clínico y Datos Personales Protegidos
                      </h6>
                      <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '520px' }}>
                        En cumplimiento estricto de la <strong>Ley N° 20.584</strong> (Derechos y Deberes de las Personas en Atención de Salud), la información de contacto, previsión, alergias, diagnósticos médicos y antecedentes quirúrgicos se encuentran clasificados y sellados bajo estricta reserva.
                      </p>
                      <div className="d-flex justify-content-center gap-2">
                        <Link to="/login" className="btn btn-primary btn-sm fw-semibold">
                          🔑 Iniciar Sesión Médica / TI
                        </Link>
                      </div>
                      <div className="small text-muted mt-2 font-mono" style={{ fontSize: '0.72rem' }}>
                        Acceso habilitado únicamente para personal clínico acreditado (Rol: Doctor o Administrador).
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Vista Clínica Autorizada (Médicos y Administradores) */
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded text-success small font-mono">
                      <span>✓ ACCESO CLÍNICO AUTORIZADO — ROL: {user?.role?.toUpperCase()}</span>
                      <span>LEGAL MINSAL 2026</span>
                    </div>

                    {/* 1. Identificación y Datos Personales */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-primary border-bottom pb-1 mb-2">
                        📋 Identificación y Datos Personales
                      </h6>
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <span className="text-muted">Nombre Completo:</span>
                          <div className="fw-semibold">{selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}</div>
                        </div>
                        <div className="col-md-3">
                          <span className="text-muted">RUT / Documento:</span>
                          <div className="font-mono fw-bold">{selectedPatient.rut}</div>
                        </div>
                        <div className="col-md-3">
                          <span className="text-muted">Nacionalidad:</span>
                          <div className="fw-semibold">{selectedPatient.nationality || 'Chilena'}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Fecha Nacimiento / Edad:</span>
                          <div>{selectedPatient.birth_date} ({selectedPatient.age ? `${selectedPatient.age} años` : 'N/A'})</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Sexo Registral / Género:</span>
                          <div>{selectedPatient.legal_gender || selectedPatient.gender || 'N/A'} ({selectedPatient.gender_identity || 'N/A'})</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Estado Actual:</span>
                          <div>
                            <span className={`badge-status ${getStatusBadge(selectedPatient.status)}`}>
                              {selectedPatient.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Información de Contacto y Emergencia */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-primary border-bottom pb-1 mb-2">
                        📞 Contacto y Tutor de Emergencia
                      </h6>
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <span className="text-muted">Dirección de Residencia:</span>
                          <div>{selectedPatient.address || 'No registrada'}</div>
                        </div>
                        <div className="col-md-3">
                          <span className="text-muted">Teléfono Móvil:</span>
                          <div className="font-mono">{selectedPatient.phone || 'No registrado'}</div>
                        </div>
                        <div className="col-md-3">
                          <span className="text-muted">Correo Electrónico:</span>
                          <div className="font-mono">{selectedPatient.email || 'No registrado'}</div>
                        </div>
                        {selectedPatient.emergency_contact && (
                          <div className="col-12 mt-2 p-2 bg-light rounded border">
                            <span className="text-muted fw-bold">🚨 Contacto de Emergencia:</span>
                            <div className="d-flex flex-wrap gap-3 mt-1">
                              <span><strong>Nombre:</strong> {selectedPatient.emergency_contact.name || 'Familiar responsable'}</span>
                              <span><strong>Parentesco:</strong> {selectedPatient.emergency_contact.relationship || 'Tutor'}</span>
                              <span><strong>Teléfono:</strong> <span className="font-mono">{selectedPatient.emergency_contact.phone || 'N/A'}</span></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Previsión y Financiamiento */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-primary border-bottom pb-1 mb-2">
                        💰 Previsión de Salud y Financiamiento
                      </h6>
                      <div className="row g-2 small">
                        <div className="col-md-4">
                          <span className="text-muted">Previsión Principal:</span>
                          <div className="fw-bold text-success">{selectedPatient.health_insurance || 'Fonasa'}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Seguro Complementario:</span>
                          <div>{selectedPatient.complementary_insurance || 'Negativo'}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Convenio Institucional:</span>
                          <div>{selectedPatient.institutional_agreement || 'Negativo'}</div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Información Médica Esencial */}
                    <div className="mb-3">
                      <h6 className="fw-bold text-primary border-bottom pb-1 mb-2">
                        🩺 Información Médica Esencial (Ficha Clínica)
                      </h6>
                      <div className="row g-2 small mb-2">
                        <div className="col-md-4">
                          <span className="text-muted">Grupo Sanguíneo y Rh:</span>
                          <div className="fw-bold text-danger">{selectedPatient.blood_type}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Ubicación / Cama:</span>
                          <div className="fw-semibold">{selectedPatient.room}</div>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted">Médico Tratante:</span>
                          <div>{selectedPatient.attending_doctor}</div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">Alergias Conocidas:</span>
                          <div className={selectedPatient.allergies && selectedPatient.allergies !== 'Negativo' ? 'text-danger fw-bold' : ''}>
                            {selectedPatient.allergies || 'Negativo'}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">Enfermedades Crónicas:</span>
                          <div>{selectedPatient.chronic_conditions || 'Negativo'}</div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">Medicamentos de Uso Habitual:</span>
                          <div>{selectedPatient.habitual_medications || 'Negativo'}</div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">Antecedentes Quirúrgicos:</span>
                          <div>{selectedPatient.surgical_history || 'Negativo'}</div>
                        </div>
                      </div>

                      <div className="p-3 bg-light rounded border mb-2">
                        <strong className="small text-muted d-block mb-1">Diagnóstico de Ingreso:</strong>
                        <div className="small fw-semibold text-dark">{selectedPatient.diagnosis}</div>
                      </div>

                      {isStaff && selectedPatient.confidential_notes && (
                        <div className="p-3 bg-danger bg-opacity-10 border border-danger rounded text-danger small font-mono mt-2">
                          <strong className="d-block mb-1">🔒 EXPEDIENTE Y NOTAS CLÍNICAS CONFIDENCIALES (LEY 20.584):</strong>
                          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedPatient.confidential_notes}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
