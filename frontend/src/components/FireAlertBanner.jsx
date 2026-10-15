import React, { useState, useEffect, useRef } from 'react';

export default function FireAlertBanner({ telemetry, onReset }) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const intervalRef = useRef(null);

  // Arrancar/detener countdown según estado de la alarma
  useEffect(() => {
    if (!telemetry?.fire_alarm_active) {
      // Alarma apagada → limpiar todo
      if (intervalRef.current) clearInterval(intervalRef.current);
      setCountdown(null);
      return;
    }

    // Alarma activa → iniciar cuenta regresiva
    const initial = Math.ceil(telemetry.seconds_until_reset ?? 10);
    setCountdown(initial);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          // El backend ya se reseteó; refrescamos el estado del frontend
          if (onReset) onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [telemetry?.fire_alarm_active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!telemetry?.fire_alarm_active) return null;

  const flag = 'FLAG{h0sp1t4l_s4b0t4g3}';

  const copyFlag = () => {
    navigator.clipboard.writeText(flag);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="bg-danger text-white p-3 p-md-4 shadow-lg border-bottom border-warning border-3 fire-alert-active position-relative"
      style={{ zIndex: 1050 }}
    >
      <div className="container">
        <div className="row align-items-center g-3">
          {/* Columna izquierda — descripción del incidente */}
          <div className="col-lg-8">
            <div className="d-flex align-items-center gap-3">
              <div className="fs-1 animate-pulse">🔥</div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-warning text-dark fw-bold">CÓDIGO ROJO</span>
                  <span className="badge bg-black text-warning font-mono">SCRAM BMS OVERRIDE</span>
                </div>
                <h4 className="fw-black mb-1 text-white">
                  ¡INCENDIO ACTIVO EN CENTRAL DE GASES Y MAQUETA HOSPITALARIA!
                </h4>
                <p className="mb-1 small text-white-50">
                  La ignición térmica de oxígeno medicinal ha disparado la secuencia de fuego en las
                  luces RGB de la maqueta. Compuertas corta-fuego bloqueadas y sistema de evacuación
                  general activado.
                </p>
                {/* Cuenta regresiva */}
                {countdown !== null && countdown > 0 && (
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="badge bg-warning text-dark font-mono" style={{ fontSize: '1rem' }}>
                      ⏱️ {countdown}s
                    </span>
                    <span className="small text-white-50">
                      Sistema se rearma automáticamente en{' '}
                      <strong className="text-warning">{countdown} segundo{countdown !== 1 ? 's' : ''}</strong>...
                    </span>
                  </div>
                )}
                {countdown === 0 && (
                  <div className="small text-warning fw-bold mt-1">
                    🔄 Rearme completado — sistema OT restaurado.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha — flag + botón manual */}
          <div className="col-lg-4">
            <div className="bg-black bg-opacity-75 p-3 rounded-3 border border-warning border-opacity-50">
              <div className="small text-warning fw-bold mb-1 d-flex justify-content-between">
                <span>FLAG OT (DESAFÍO 2):</span>
                {copied && <span className="text-success">¡Copiado!</span>}
              </div>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={flag}
                  className="form-control form-control-sm font-mono bg-dark text-warning border-secondary"
                  style={{ fontSize: '0.85rem' }}
                />
                <button onClick={copyFlag} className="btn btn-warning btn-sm fw-bold px-3">
                  Copiar
                </button>
              </div>
              <div className="mt-2 text-end">
                <button
                  onClick={onReset}
                  className="btn btn-sm btn-outline-light py-0 px-2 small text-decoration-none"
                  style={{ fontSize: '0.75rem' }}
                >
                  🔄 Rearmar Sistema OT (Restablecer)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
