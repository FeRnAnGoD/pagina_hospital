from datetime import datetime
from app import db, bcrypt

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(50), default='doctor')  # admin, doctor, nurse, engineer
    department = db.Column(db.String(100), default='Servicio Clínico')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        import hashlib
        # Soporte para MD5 pedagógico en CTF
        if len(self.password_hash) == 32 and all(c in '0123456789abcdefABCDEF' for c in self.password_hash):
            return hashlib.md5(password.encode('utf-8')).hexdigest().lower() == self.password_hash.lower()
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'full_name': self.full_name,
            'role': self.role,
            'department': self.department
        }

class Patient(db.Model):
    __tablename__ = 'patients'

    id = db.Column(db.Integer, primary_key=True)
    # 1. Identificación y Datos Personales
    rut = db.Column(db.String(25), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    paternal_last_name = db.Column(db.String(100), nullable=False)
    maternal_last_name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.String(20), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    legal_gender = db.Column(db.String(20), nullable=False)
    gender_identity = db.Column(db.String(50), nullable=False)
    nationality = db.Column(db.String(60), default='Chilena', nullable=False)

    # 2. Información de Contacto (Paciente y Emergencia)
    address = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(35), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    emergency_contact_name = db.Column(db.String(120), nullable=True)
    emergency_contact_relationship = db.Column(db.String(60), nullable=True)
    emergency_contact_phone = db.Column(db.String(35), nullable=True)

    # 3. Previsión y Financiamiento
    health_insurance = db.Column(db.String(80), nullable=False)  # Fonasa (Tramo A, B, C, D) o Isapre
    complementary_insurance = db.Column(db.String(120), nullable=True)  # Compañía y póliza
    institutional_agreement = db.Column(db.String(120), nullable=True)  # Caja de compensación / Convenio escolar

    # 4. Información Médica Esencial (Ficha Clínica)
    blood_type = db.Column(db.String(20), nullable=False)  # Grupo sanguíneo y factor Rh (ej. A+ Rh Positivo)
    allergies = db.Column(db.String(255), nullable=False, default='Negativo')  # Alergias medicamentos/alimentos o 'Negativo'
    chronic_conditions = db.Column(db.String(255), nullable=False, default='Negativo')  # HTA, DM2, Asma, etc.
    habitual_medications = db.Column(db.String(255), nullable=False, default='Negativo')  # Fármacos con dosis y horarios
    surgical_history = db.Column(db.String(255), nullable=False, default='Negativo')  # Cirugías previas y fechas

    # 5. Internación y Seguimiento
    diagnosis = db.Column(db.String(255), nullable=False)
    attending_doctor = db.Column(db.String(120), nullable=False)
    room = db.Column(db.String(60), nullable=False)
    admission_date = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(50), default='Ingresado')  # Ingresado, Alta Médica, UCI, Observación, Pabellón
    confidential_notes = db.Column(db.Text, nullable=True)  # FLAG en paciente ID 140

    @property
    def full_name(self):
        return f"{self.first_name} {self.paternal_last_name} {self.maternal_last_name}"

    def to_public_dict(self):
        """
        Vista pública básica de paciente (Ley 20.584 de Derechos y Deberes del Paciente).
        Oculta datos de contacto, emergencia, previsión, antecedentes médicos y alergias.
        """
        rut_masked = self.rut
        if '-' in self.rut:
            parts = self.rut.split('-')
            if len(parts[0]) >= 6:
                rut_masked = parts[0][:-3] + "***-*"

        return {
            'id': self.id,
            'rut': rut_masked,
            'first_name': self.first_name,
            'paternal_last_name': self.paternal_last_name,
            'last_name': self.paternal_last_name,
            'full_name': f"{self.first_name} {self.paternal_last_name}",
            'room': self.room,
            'status': self.status,
            'attending_doctor': self.attending_doctor,
            'admission_date': self.admission_date,
            'is_restricted': True,
            'restriction_message': 'Ficha clínica sellada conforme a la Ley N° 20.584. Se requiere autenticación médica (Doctor) o administrativa (Admin) para ver el expediente completo.'
        }

    def to_dict(self, include_confidential=False, is_staff=True):
        if not is_staff:
            return self.to_public_dict()

        data = {
            'id': self.id,
            'rut': self.rut,
            'first_name': self.first_name,
            'paternal_last_name': self.paternal_last_name,
            'maternal_last_name': self.maternal_last_name,
            'last_name': f"{self.paternal_last_name} {self.maternal_last_name}",
            'full_name': self.full_name,
            'birth_date': self.birth_date,
            'age': self.age,
            'legal_gender': self.legal_gender,
            'gender': self.legal_gender,
            'gender_identity': self.gender_identity,
            'nationality': self.nationality,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            'emergency_contact': {
                'name': self.emergency_contact_name,
                'relationship': self.emergency_contact_relationship,
                'phone': self.emergency_contact_phone
            },
            'health_insurance': self.health_insurance,
            'complementary_insurance': self.complementary_insurance,
            'institutional_agreement': self.institutional_agreement,
            'blood_type': self.blood_type,
            'allergies': self.allergies,
            'chronic_conditions': self.chronic_conditions,
            'habitual_medications': self.habitual_medications,
            'surgical_history': self.surgical_history,
            'diagnosis': self.diagnosis,
            'attending_doctor': self.attending_doctor,
            'room': self.room,
            'admission_date': self.admission_date,
            'status': self.status,
            'is_restricted': False
        }
        if include_confidential:
            data['confidential_notes'] = self.confidential_notes
        return data

class SystemConfig(db.Model):
    __tablename__ = 'system_configs'

    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    classification_level = db.Column(db.String(50), default='SECRET')  # PUBLIC, INTERNAL, SECRET, TOP_SECRET

    def to_dict(self):
        return {
            'id': self.id,
            'config_key': self.config_key,
            'config_value': self.config_value,
            'description': self.description,
            'classification_level': self.classification_level
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    event_type = db.Column(db.String(80), nullable=False)
    subsystem = db.Column(db.String(80), default='HIS-CORE')
    severity = db.Column(db.String(30), default='INFO')  # INFO, WARNING, CRITICAL, SCRAM
    details = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'event_type': self.event_type,
            'subsystem': self.subsystem,
            'severity': self.severity,
            'details': self.details
        }
