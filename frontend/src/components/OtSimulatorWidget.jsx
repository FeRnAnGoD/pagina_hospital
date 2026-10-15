import React from 'react';

export default function OtSimulatorWidget({ telemetry }) {
  const isFire = telemetry?.fire_alarm_active;
  const rgb = telemetry?.rgb_lighting_actuator?.current_rgb || { r: 0, g: 180, b: 255 };
  const effect = telemetry?.rgb_lighting_actuator?.active_effect || 'NORMAL_CLINIC_LIGHT';

  const rgbColorString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const shadowGlow = isFire
    ? `0 0 35px rgba(255, 69, 0, 0.9), 0 0 70px rgba(255, 140, 0, 0.7)`
    : `0 0 20px rgba(0, 180, 255, 0.6)`;

  return (
    <div className="card-scada p-4 mb-4 border border-secondary border-opacity-50">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 pb-3 border-bottom border-secondary border-opacity-25 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge ${isFire ? 'bg-danger animate-pulse' : 'bg-success'}`}>
              {isFire ? 'INCENDIO EN MAQUETA' : 'ILUMINACIÓN NOMINAL'}
            </span>
            <span className="font-mono text-muted small">ACTUADOR DE LUCES RGB OT</span>
          </div>
          <h5 className="fw-bold text-white mb-0 mt-1">
            Simulador / Estado Físico de la Maqueta Hospitalaria
          </h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end font-mono small text-muted">
            <div>Color Actual: <span className="text-white">{rgbColorString}</span></div>
            <div className="text-info">{effect}</div>
          </div>
          {/* Bombilla visual del LED RGB */}
          <div
            className="rgb-light-bulb"
            style={{
              backgroundColor: rgbColorString,
              boxShadow: shadowGlow,
              border: isFire ? '2px solid #fff' : '2px solid rgba(255,255,255,0.3)',
            }}
            title={`Luces RGB: ${rgbColorString}`}
          />
        </div>
      </div>

      {/* Representación Arquitectónica de la Maqueta del Hospital */}
      <div className="row g-3 align-items-center">
        <div className="col-lg-7">
          <div className="p-3 bg-dark bg-opacity-75 rounded-3 border border-secondary border-opacity-25">
            <div className="text-uppercase font-mono small text-muted mb-2 d-flex justify-content-between">
              <span>Sección Estructural del Hospital</span>
              <span className={isFire ? 'text-danger fw-bold' : 'text-success'}>
                {isFire ? '🔥 EVACUACIÓN EN CURSO' : '✓ ÁREAS DESPEJADAS'}
              </span>
            </div>

            <div className="d-flex flex-column gap-2">
              {/* Piso 3 */}
              <div
                className="p-2 rounded d-flex justify-content-between align-items-center transition-all"
                style={{
                  backgroundColor: isFire ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                  borderLeft: `4px solid ${isFire ? '#ef4444' : '#0ea5e9'}`,
                }}
              >
                <div>
                  <span className="fw-bold small text-white">NIVEL 3:</span>{' '}
                  <span className="small text-white-50">Pabellones Quirúrgicos & Esterilización Autoclave</span>
                </div>
                <span className="badge bg-secondary font-mono" style={{ fontSize: '0.65rem' }}>
                  {isFire ? 'ALTA TEMP' : 'ESTABLE'}
                </span>
              </div>

              {/* Piso 2 */}
              <div
                className="p-2 rounded d-flex justify-content-between align-items-center transition-all"
                style={{
                  backgroundColor: isFire ? 'rgba(249, 115, 22, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                  borderLeft: `4px solid ${isFire ? '#f97316' : '#0ea5e9'}`,
                }}
              >
                <div>
                  <span className="fw-bold small text-white">NIVEL 2:</span>{' '}
                  <span className="small text-white-50">Unidad de Paciente Crítico (UCI) & Habitación 402</span>
                </div>
                <span className="badge bg-secondary font-mono" style={{ fontSize: '0.65rem' }}>
                  {isFire ? 'HUMO DETECTADO' : 'NORMAL'}
                </span>
              </div>

              {/* Piso 1 */}
              <div
                className="p-2 rounded d-flex justify-content-between align-items-center transition-all"
                style={{
                  backgroundColor: isFire ? 'rgba(234, 179, 8, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                  borderLeft: `4px solid ${isFire ? '#eab308' : '#0ea5e9'}`,
                }}
              >
                <div>
                  <span className="fw-bold small text-white">NIVEL 1:</span>{' '}
                  <span className="small text-white-50">Admisión, Urgencias & Consulta de Pacientes</span>
                </div>
                <span className="badge bg-secondary font-mono" style={{ fontSize: '0.65rem' }}>
                  {isFire ? 'ALARMA ACTIVA' : 'OPERATIVO'}
                </span>
              </div>

              {/* Subterráneo */}
              <div
                className="p-2 rounded d-flex justify-content-between align-items-center transition-all"
                style={{
                  backgroundColor: isFire ? 'rgba(220, 38, 38, 0.45)' : 'rgba(15, 23, 42, 0.6)',
                  borderLeft: `4px solid ${isFire ? '#dc2626' : '#0ea5e9'}`,
                }}
              >
                <div>
                  <span className="fw-bold small text-white">SUBTERRÁNEO:</span>{' '}
                  <span className="small text-white-50">Múltiple Central de Oxígeno ($O_2$) & Calderas</span>
                </div>
                <span className={`badge ${isFire ? 'bg-danger font-mono' : 'bg-secondary font-mono'}`} style={{ fontSize: '0.65rem' }}>
                  {isFire ? 'FOCO DE IGNICIÓN' : '4.2 BAR'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="p-3 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="small text-muted font-mono mb-2">INTERFAZ DE CONTROL FÍSICO</div>
              <ul className="list-unstyled small text-white-50 mb-3 d-flex flex-column gap-1">
                <li>• <strong>Puerto Serial USB:</strong> <span className="font-mono text-info">COM3 / Auto-detect</span></li>
                <li>• <strong>Controlador RGB:</strong> <span className="font-mono text-info">Arduino / ESP32 NeoPixel WS2812B</span></li>
                <li>• <strong>Efecto en Maqueta:</strong> <span className="font-mono text-warning">{isFire ? 'Parpadeo Llama (Fuego)' : 'Luz Clínica Fija'}</span></li>
                <li>• <strong>Modo Mock:</strong> <span className="badge bg-success font-mono" style={{ fontSize: '0.65rem' }}>Activo (PC + Hardware)</span></li>
              </ul>
            </div>

            <div className="small text-muted border-top border-secondary border-opacity-25 pt-2">
              💡 <em>En la maqueta física los LEDs RGB reproducen en tiempo real el color y efecto desplegados arriba.</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
