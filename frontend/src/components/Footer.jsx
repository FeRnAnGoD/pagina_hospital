import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-dark text-white-50 py-5 mt-auto border-top border-secondary border-opacity-25">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="text-danger fs-4 fw-bold">✚</span>
              <span className="text-white fw-bold fs-5">Hospital Metropolitano</span>
            </div>
            <p className="small mb-2">
              Institución asistencial docente de alta complejidad. Monitoreo constante de soporte vital y sistemas de gases medicinales.
            </p>
            <div className="badge bg-secondary text-white small p-2 font-mono">
              Plataforma HIS v4.2 & BMS SCADA Core
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="text-white fw-bold mb-3">Servicios Clínicos</h6>
            <ul className="list-unstyled small d-flex flex-column gap-1">
              <li>• Unidad de Paciente Crítico (UCI / UTI)</li>
              <li>• Pabellones de Cirugía Mayor Ambulatoria</li>
              <li>• Central de Oxígeno y Gases Medicinales</li>
              <li>• Imagenología y Resonancia Magnética</li>
            </ul>
          </div>

          <div className="col-lg-2 col-md-6">
            <h6 className="text-white fw-bold mb-3">Emergencias 24/7</h6>
            <div className="small">
              <div className="text-danger fw-bold fs-6">SAMU: 131</div>
              <div>Central Hospital: +56 2 2999 4000</div>
              <div>Código Rojo BMS: Anexo 8800</div>
            </div>
          </div>

          <div className="col-lg-3">
            <h6 className="text-white fw-bold mb-3">Entorno CTF / Ciberlab</h6>
            <p className="small text-muted mb-1">
              Laboratorio de Ciberdefensa Hospitalaria y Seguridad en Sistemas Ciberfísicos OT.
            </p>
            <span className="badge bg-info text-dark font-mono">
              CIBERLAB UC — EJÉRCITO DE CHILE 2026
            </span>
          </div>
        </div>

        <hr className="my-4 border-secondary border-opacity-25" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small text-muted">
          <div>
            © 2026 Hospital Clínico Metropolitano Ciberlab. Todos los derechos reservados.
          </div>
          <div className="font-mono mt-2 mt-md-0">
            Seguridad Clínica & Automatización Industrial
          </div>
        </div>
      </div>
    </footer>
  );
}
