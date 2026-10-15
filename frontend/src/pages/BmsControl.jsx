import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OtSimulatorWidget from '../components/OtSimulatorWidget';

export default function BmsControl({ telemetry, onRefreshTelemetry }) {
  const [actuators, setActuators] = useState({
    valve_o2_bypass: false,
    boiler_overdrive: false,
    ventilation_damper_close: false,
    disable_suppression: false,
  });
  const [overrideKey, setOverrideKey] = useState('');
  const [logs, setLogs] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Los interruptores reflejan la selección del operador y no se desmarcan con el polling de telemetría

  // Cargar logs
  const fetchLogs = () => {
    axios.get('/api/ot/logs')
      .then((res) => setLogs(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = (key) => {
    setActuators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyOverride = () => {
    setLoading(true);
    setStatusMsg(null);

    axios.post('/api/ot/actuators/override', {
      ...actuators,
      override_key: overrideKey.trim()
    })
      .then((res) => {
        setLoading(false);
        setStatusMsg({
          type: res.data.alert_triggered ? 'danger' : 'success',
          text: res.data.message || 'Actuadores actualizados exitosamente.',
          flag: res.data.flag,
        });
        if (onRefreshTelemetry) onRefreshTelemetry();
        fetchLogs();
        // Scroll al inicio para mostrar el banner de alarma y la flag
        if (res.data.alert_triggered) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      })
      .catch((err) => {
        setLoading(false);
        const data = err.response?.data;
        setStatusMsg({
          type: 'danger',
          text: data?.message || data?.error || 'Error al comunicarse con el controlador OT.',
          requiresKey: data?.requires_override_key
        });
      });
  };

  const handleDirectFireTest = () => {
    setLoading(true);
    axios.post('/api/ot/emergency-fire-test')
      .then((res) => {
        setLoading(false);
        setStatusMsg({
          type: 'danger',
          text: '¡Prueba de incendio iniciada! Luces RGB en maqueta ejecutando patrón de fuego.',
          flag: res.data.flag,
        });
        if (onRefreshTelemetry) onRefreshTelemetry();
        fetchLogs();
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
      });
  };

  const handleReset = () => {
    setLoading(true);
    axios.post('/api/ot/reset')
      .then((res) => {
        setLoading(false);
        setActuators({
          valve_o2_bypass: false,
          boiler_overdrive: false,
          ventilation_damper_close: false,
          disable_suppression: false,
        });
        setOverrideKey('');
        setStatusMsg({
          type: 'success',
          text: 'Sistemas restaurados a parámetros clínicos seguros.',
        });
        if (onRefreshTelemetry) onRefreshTelemetry();
        fetchLogs();
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
      });
  };

  const isFire = telemetry?.fire_alarm_active;
  const o2Pressure = telemetry?.oxygen_manifold?.pressure_bar ?? 4.2;
  const boilerTemp = telemetry?.boiler_hvac?.temperature_c ?? 72.5;

  return (
    <div className="container py-4">
      {/* Encabezado */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge ${isFire ? 'bg-danger animate-pulse' : 'bg-success'}`}>
              {isFire ? 'CÓDIGO ROJO ACTIVO' : 'BMS SCADA ONLINE'}
            </span>
            <span className="font-mono text-muted small">CENTRAL DE CONTROL OT</span>
          </div>
          <h2 className="fw-bold text-primary-ciber mb-0 mt-1">
            Supervisión de Instalaciones Críticas & Gases Medicinales
          </h2>
        </div>

      </div>

      {/* Simulador de Maqueta y Luces RGB */}
      <OtSimulatorWidget telemetry={telemetry} />

      {/* Notificación de Estado */}
      {statusMsg && (
        <div className={`alert alert-${statusMsg.type} shadow-sm mb-4 border-${statusMsg.type}`}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{statusMsg.type === 'danger' ? '⚠️ ALERTA OT: ' : '✓ ÉXITO: '}</strong>
              {statusMsg.text}
            </div>
            {statusMsg.flag && (
              <span className="badge bg-dark text-warning font-mono p-2">
                {statusMsg.flag}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Paneles de Telemetría e Instrumentación */}
      <div className="row g-4 mb-4">
        {/* Manifold de Oxígeno */}
        <div className="col-lg-6">
          <div className="card-clinical p-4 h-100 border-info border-opacity-50">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="badge bg-info text-dark font-mono mb-1">GASES MEDICINALES</span>
                <h5 className="fw-bold text-primary-ciber mb-0">
                  Múltiple Central de Oxígeno ($O_2$)
                </h5>
                <span className="small text-muted">Suministro a UCI y Pabellones Quirúrgicos</span>
              </div>
              <div className="text-end font-mono">
                <div className={`fs-3 fw-bold ${o2Pressure > 8.0 ? 'text-danger animate-pulse' : 'text-primary-ciber'}`}>
                  {o2Pressure} <span className="fs-6">bar</span>
                </div>
                <div className="small text-muted">Nominal: 4.0 - 4.5 bar</div>
              </div>
            </div>

            {/* Barra de progreso / manómetro */}
            <div className="progress mb-3" style={{ height: '14px' }}>
              <div
                className={`progress-bar ${o2Pressure > 8.0 ? 'bg-danger progress-bar-striped progress-bar-animated' : 'bg-info'}`}
                role="progressbar"
                style={{ width: `${Math.min((o2Pressure / 15.0) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="p-3 bg-light rounded-3 border small">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Estado de Válvula de Seguridad:</span>
                <span className={actuators.valve_o2_bypass ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                  {actuators.valve_o2_bypass ? 'BYPASS FORZADO (RIESGO)' : 'ENCLAVAMIENTO ACTIVO'}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Umbral de Ignición:</span>
                <span className="font-mono text-danger fw-semibold">10.0 bar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calderas y Climatización BMS */}
        <div className="col-lg-6">
          <div className="card-clinical p-4 h-100 border-warning border-opacity-50">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="badge bg-warning text-dark font-mono mb-1">SISTEMA TÉRMICO BMS</span>
                <h5 className="fw-bold text-primary-ciber mb-0">
                  Calderas de Vapor & Autoclaves
                </h5>
                <span className="small text-muted">Esterilización y Calefacción Central</span>
              </div>
              <div className="text-end font-mono">
                <div className={`fs-3 fw-bold ${boilerTemp > 200.0 ? 'text-danger animate-pulse' : 'text-primary-ciber'}`}>
                  {boilerTemp} <span className="fs-6">°C</span>
                </div>
                <div className="small text-muted">Nominal: 65 - 80 °C</div>
              </div>
            </div>

            {/* Barra de progreso térmico */}
            <div className="progress mb-3" style={{ height: '14px' }}>
              <div
                className={`progress-bar ${boilerTemp > 200.0 ? 'bg-danger progress-bar-striped progress-bar-animated' : 'bg-warning'}`}
                role="progressbar"
                style={{ width: `${Math.min((boilerTemp / 480.0) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="p-3 bg-light rounded-3 border small">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Protección de Sobretemperatura:</span>
                <span className={actuators.boiler_overdrive ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                  {actuators.boiler_overdrive ? 'OVERDRIVE FORZADO' : 'TERMOSTATO NORMAL'}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Punto Crítico de Ignición:</span>
                <span className="font-mono text-danger fw-semibold">350.0 °C</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Actuadores y Cadena de Ataque OT */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="card-clinical p-4">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h5 className="fw-bold text-primary-ciber mb-0">
                Panel de Control de Actuadores (BMS Override)
              </h5>
              <span className="badge bg-secondary font-mono">ACTUADORES OT</span>
            </div>

            <p className="small text-muted mb-4">
              En condiciones normales los actuadores están protegidos por enclavamientos de seguridad física. 
              Active los interruptores requeridos y presione <strong>"Aplicar Sobrecarga"</strong> para enviar los comandos de campo:
            </p>

            <div className="d-flex flex-column gap-3 mb-4">
              {/* Switch 1: Bypass O2 */}
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 border">
                <div>
                  <div className="fw-bold text-dark">Válvula Bypass de Oxígeno Medicinal ($O_2$)</div>
                  <div className="small text-muted">Abre la descarga directa a alta presión en ductos de ventilación.</div>
                </div>
                <div className="form-check form-switch fs-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={actuators.valve_o2_bypass}
                    onChange={() => handleToggle('valve_o2_bypass')}
                  />
                </div>
              </div>

              {/* Switch 2: Sobrecalentamiento Calderas */}
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 border">
                <div>
                  <div className="fw-bold text-dark">Sobrecalentamiento Forzado de Calderas (Overdrive)</div>
                  <div className="small text-muted">Inhabilita los termostatos y eleva la temperatura por encima de 350 °C.</div>
                </div>
                <div className="form-check form-switch fs-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={actuators.boiler_overdrive}
                    onChange={() => handleToggle('boiler_overdrive')}
                  />
                </div>
              </div>

              {/* Switch 3: Compuertas de humo */}
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 border">
                <div>
                  <div className="fw-bold text-dark">Bloqueo de Compuertas de Ventilación</div>
                  <div className="small text-muted">Cierra la extracción de gases atrapando el oxígeno presurizado.</div>
                </div>
                <div className="form-check form-switch fs-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={actuators.ventilation_damper_close}
                    onChange={() => handleToggle('ventilation_damper_close')}
                  />
                </div>
              </div>
            </div>

            {/* Input para Clave Maestra SCADA (Obtenida desde la Base de Datos) */}
            <div className={`p-3 rounded-3 border mb-3 ${statusMsg?.requiresKey ? 'bg-danger bg-opacity-10 border-danger' : 'bg-light'}`}>
              <label className="form-label small fw-bold text-dark d-flex align-items-center gap-1 mb-1">
                <span>🔐</span>
                <span>Clave Maestra de Sobreescritura SCADA (Master Override Key):</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white font-mono text-muted">KEY</span>
                <input
                  type="text"
                  className="form-control font-mono fs-6"
                  placeholder="Ingrese clave maestra SCADA (ej: HSR-BMS-SECURE-...)"
                  value={overrideKey}
                  onChange={(e) => setOverrideKey(e.target.value)}
                />
              </div>
              <div className="form-text small text-muted mt-1">
                {statusMsg?.requiresKey ? (
                  <span className="text-danger fw-semibold">
                    ⚠️ Enclavamiento activo: Esta clave se encuentra resguardada en la tabla <code>system_configs</code> de la base de datos hospitalaria.
                  </span>
                ) : (
                  <span>Requerida para forzar enclavamientos combinados de calderas y oxígeno medicinal.</span>
                )}
              </div>
            </div>

            <button
              onClick={handleApplyOverride}
              disabled={loading}
              className="btn btn-warning text-dark fw-bold btn-lg w-100 shadow-sm"
            >
              {loading ? 'Transmitiendo a Controlador OT...' : '⚡ Aplicar Sobrecarga a Actuadores de Planta'}
            </button>
          </div>
        </div>

        {/* Terminal de Eventos y Auditoría OT */}
        <div className="col-lg-5">
          <div className="card-scada p-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-50">
              <h6 className="fw-bold text-white mb-0 font-mono">
                REGISTRO DE EVENTOS SCADA / BMS
              </h6>
              <span className="badge bg-dark text-info font-mono small">LIVE</span>
            </div>

            <div className="bg-black p-3 rounded font-mono flex-grow-1 overflow-auto" style={{ maxHeight: '350px', fontSize: '0.75rem' }}>
              {logs.length === 0 ? (
                <div className="text-muted">Esperando telemetría de campo...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="mb-2 pb-2 border-bottom border-secondary border-opacity-25">
                    <div className="d-flex justify-content-between text-muted">
                      <span>[{log.timestamp}]</span>
                      <span className={`badge ${log.severity === 'CRITICAL' ? 'bg-danger text-white' : 'bg-secondary text-light'}`} style={{ fontSize: '0.65rem' }}>
                        {log.severity}
                      </span>
                    </div>
                    <div className="text-info fw-bold">{log.event_type} ({log.subsystem})</div>
                    <div className={log.severity === 'CRITICAL' ? 'text-warning' : 'text-light'}>
                      {log.details}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-2 text-muted small border-top border-secondary border-opacity-25 font-mono">
              Protocolo: MODBUS/TCP & Serial Gateway | Port 502/115200
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
