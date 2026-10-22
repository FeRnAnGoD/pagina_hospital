import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor complete todos los campos');
      return;
    }

    setLoading(true);
    setError(null);

    axios.post('/api/auth/login', { username, password })
      .then((res) => {
        setLoading(false);
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (onLoginSuccess) onLoginSuccess(user);
        navigate('/');
      })
      .catch((err) => {
        setLoading(false);
        setError(err.response?.data?.error || 'Credenciales inválidas. Acceso denegado.');
      });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card-clinical p-4 p-md-5 border-0 shadow-lg">
            <div className="text-center mb-4">
              <div className="bg-primary-ciber text-white rounded-circle p-3 d-inline-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '60px', height: '60px' }}>
                <span className="fs-3">🩺</span>
              </div>
              <h3 className="fw-bold text-primary-ciber mb-1">Acceso Institucional</h3>
              <p className="text-muted small">
                Portal de Servicios Clínicos y Mantenimiento OT
              </p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-4 font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">USUARIO INSTITUCIONAL</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">👤</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej: admin o dr_morales"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">CONTRASEÑA</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">🔒</span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-100 fw-bold shadow-sm"
              >
                {loading ? 'Validando...' : 'Iniciar Sesión'}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}
