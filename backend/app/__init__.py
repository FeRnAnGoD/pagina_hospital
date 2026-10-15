import os
from datetime import timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    from app.auth_config import JWT_SECRET_KEY

    # Directorio de datos
    data_dir = os.path.join(app.root_path, 'data')
    os.makedirs(data_dir, exist_ok=True)
    db_path = os.path.join(data_dir, 'hospital.sqlite')

    # Configuración de base de datos y seguridad
    app.config['SECRET_KEY'] = 'ciberlab_hospital_secret_key_2026'
    app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', f'sqlite:///{db_path}')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Inicialización de extensiones
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Registrar Blueprints
    from app.api.auth import auth_bp
    from app.api.patients import patients_bp
    from app.api.ot_system import ot_bp
    from app.waf import waf_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(ot_bp, url_prefix='/api/ot')
    app.register_blueprint(waf_bp, url_prefix='/api/waf')

    # Crear tablas si no existen
    with app.app_context():
        db.create_all()

    return app
