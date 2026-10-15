from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import text
from app import db, bcrypt
from app.models import User, AuditLog

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'doctor').lower()
    department = data.get('department', 'Servicio Clínico')

    if not username or not password or not full_name:
        return jsonify({'error': 'Todos los campos son obligatorios'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'El nombre de usuario ya se encuentra registrado'}), 409

    # Prevenir que usuarios externos se registren como admin directamente
    if role not in ['doctor', 'nurse']:
        role = 'doctor'

    user = User(username=username, full_name=full_name, role=role, department=department)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Usuario registrado exitosamente', 'user': user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Credenciales requeridas'}), 400

    # Flujo seguro de autenticación (Camino A: Exige contraseñas válidas, no permite bypass de login)
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Credenciales inválidas. Verifique su usuario y contraseña institucional.'}), 401

    access_token = create_access_token(
        identity=user.username,
        additional_claims={
            'role': user.role,
            'full_name': user.full_name,
            'department': user.department
        }
    )

    # Registrar evento de auditoría
    audit = AuditLog(
        event_type="AUTH_LOGIN_SUCCESS",
        subsystem="HIS-AUTH",
        severity="INFO",
        details=f"Inicio de sesión exitoso: {user.username} ({user.role})"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'message': 'Autenticación exitosa',
        'token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_username = get_jwt_identity()
    claims = get_jwt()
    user = User.query.filter_by(username=current_username).first()

    if not user:
        return jsonify({
            'username': current_username,
            'role': claims.get('role', 'doctor'),
            'full_name': claims.get('full_name', 'Personal Clínico'),
            'department': claims.get('department', 'Servicio Clínico')
        }), 200

    return jsonify(user.to_dict()), 200
