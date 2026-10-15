import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation();

  if (!user) {
    // Si no está autenticado, redirigir al login con mensaje explicativo
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          error: 'Acceso Restringido. Se requiere autenticación del personal clínico o técnico para ingresar a esta sección.',
        }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role?.toLowerCase())) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger p-4 shadow-sm border-danger border-2 text-center">
          <div className="fs-1 mb-2">🚫</div>
          <h4 className="fw-bold">403 — Privilegios Insuficientes</h4>
          <p className="mb-2">
            Su usuario actual (<strong>{user.username}</strong>, Rol: <em>{user.role}</em>) no cuenta con el nivel de autorización requerido para esta interfaz.
          </p>
          <span className="small font-mono text-muted">
            Roles autorizados: {allowedRoles.join(', ')}
          </span>
        </div>
      </div>
    );
  }

  return children;
}
