import os
import shutil
import io
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request, decode_token
from sqlalchemy import text
from app import db
from app.models import Patient, User, SystemConfig, AuditLog
from app.waf import inspect_query_string

patients_bp = Blueprint('patients', __name__)

def check_admin_auth():
    """
    Verifica si la petición cuenta con privilegios de 'admin'.
    Soporta verificación por Header Authorization: Bearer <token>
    o mediante parámetro de consulta ?token=<token>
    """
    # 1. Header Authorization
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if claims and claims.get('role', '').lower() == 'admin':
            return True, claims
    except Exception:
        pass

    # 2. Query param ?token=...
    token_param = request.args.get('token')
    if token_param:
        try:
            decoded = decode_token(token_param)
            role = decoded.get('role', '')
            if not role and isinstance(decoded.get('sub'), dict):
                role = decoded.get('sub', {}).get('role', '')
            if role.lower() == 'admin':
                return True, decoded
        except Exception:
            pass

def check_staff_auth():
    """
    Verifica si la petición cuenta con privilegios de personal clínico ('doctor' o 'admin').
    Soporta verificación por Header Authorization: Bearer <token>
    o mediante parámetro de consulta ?token=<token>
    """
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if claims and claims.get('role', '').lower() in ['admin', 'doctor']:
            return True, claims
    except Exception:
        pass

    token_param = request.args.get('token')
    if token_param:
        try:
            decoded = decode_token(token_param)
            role = decoded.get('role', '')
            if not role and isinstance(decoded.get('sub'), dict):
                role = decoded.get('sub', {}).get('role', '')
            if role.lower() in ['admin', 'doctor']:
                return True, decoded
        except Exception:
            pass

    return False, None

@patients_bp.route('/summary', methods=['GET'])
def get_summary():
    """Estadísticas generales de ocupación y pacientes para el dashboard del hospital"""
    try:
        total_patients = Patient.query.count()
        uci_count = Patient.query.filter_by(status='UCI').count()
        ingresados = Patient.query.filter_by(status='Ingresado').count()
        altas = Patient.query.filter_by(status='Alta Médica').count()

        return jsonify({
            'total_pacientes_registrados': total_patients,
            'camas_uci_ocupadas': uci_count,
            'pacientes_hospitalizados': ingresados,
            'altas_semana': altas,
            'sistema_his': 'Hospital Information System v4.2 - Online (WAF Active)'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patients_bp.route('/recent', methods=['GET'])
def get_recent_patients():
    """Lista de pacientes recientes. Sanitiza y oculta datos sensibles a visitantes anónimos."""
    try:
        is_staff, _ = check_staff_auth()
        patients = Patient.query.order_by(Patient.id.asc()).limit(15).all()
        return jsonify([p.to_dict(include_confidential=False, is_staff=is_staff) for p in patients]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patients_bp.route('/search', methods=['GET'])
def search_patients():
    """
    Búsqueda clínica de pacientes por RUT, Nombre o Diagnóstico.
    
    CAPA 1: CORTAFUEGOS WAF PERIMETRAL (WAF-Guard v2.4)
    Si la búsqueda contiene firmas directas (ej. UNION SELECT, OR 1=1),
    el WAF retorna HTTP 403 Forbidden.
    Bypass:
      - Usar comentarios SQL en vez de espacios: UNION/**/SELECT
      - Cabecera de intranet médica: X-Hospital-Internal: true
      - Parámetro de diagnóstico: ?internal_bypass=1

    CAPA 2: VULNERABILIDAD SQL INJECTION INTENCIONAL
    Una vez evadido el WAF, el parámetro se interpola en la consulta SQL cruda:
      '/**/UNION/**/SELECT/**/id,username,password_hash,full_name,role,department,null,null,null,null/**/FROM/**/users/**/--
    """
    query = request.args.get('query', '').strip()

    if not query:
        return jsonify({'results': [], 'count': 0}), 200

    # 1. Inspección por WAF
    is_blocked, match_info = inspect_query_string(query)
    if is_blocked:
        return jsonify({
            'waf_blocked': True,
            'error': 'WAF-092: Petición bloqueada por Cortafuegos Perimetral Hospitalario (WAF-Guard v2.4)',
            'rule_id': match_info['rule_id'],
            'rule_name': match_info['rule_name'],
            'severity': match_info['severity'],
            'incident_id': 'INC-WAF-84210',
            'client_ip': request.remote_addr,
            'message': 'Firma de inyección SQL detectada en parámetros de entrada. Solicitud registrada en el SIEM.',
            'hint': 'Personal clínico autorizado: Acceda desde la Intranet con cabecera X-Hospital-Internal o revise la sintaxis en el cortafuegos.'
        }), 403

    try:
        # Consulta vulnerable intencional (concatenación directa)
        raw_sql = f"""
            SELECT id, rut, first_name, paternal_last_name, birth_date, blood_type, diagnosis, attending_doctor, room, status 
            FROM patients 
            WHERE rut LIKE '%{query}%' OR first_name LIKE '%{query}%' OR paternal_last_name LIKE '%{query}%'
        """
        
        result_proxy = db.session.execute(text(raw_sql))
        rows = result_proxy.fetchall()

        is_staff, _ = check_staff_auth()
        results = []
        for r in rows:
            rut_val = r[1]
            # Detectar si la fila proviene de una inyección SQL (ej. tabla users donde rut es username)
            is_sqli_row = not (rut_val and ('-' in str(rut_val) or str(rut_val).startswith('PAS-')))

            if not is_staff and not is_sqli_row:
                if rut_val and '-' in str(rut_val):
                    parts = str(rut_val).split('-')
                    if len(parts[0]) >= 6:
                        rut_val = parts[0][:-3] + "***-*"
                diag_val = 'Diagnóstico reservado (Ley 20.584)'
                blood_val = 'Protegido'
                birth_val = 'Protegido'
            else:
                diag_val = r[6]
                blood_val = r[5]
                birth_val = r[4]

            results.append({
                'id': r[0],
                'rut': rut_val,
                'first_name': r[2],
                'last_name': r[3],
                'full_name': f"{r[2]} {r[3]}" if r[2] and r[3] else (r[2] or r[3] or 'N/A'),
                'birth_date': birth_val,
                'blood_type': blood_val,
                'diagnosis': diag_val,
                'attending_doctor': r[7],
                'room': r[8],
                'status': r[9]
            })

        return jsonify({'results': results, 'count': len(results)}), 200

    except Exception as e:
        return jsonify({
            'error': 'Error en el motor SQL de Fichas Clínicas',
            'database_engine': 'SQLite/SQLAlchemy Core',
            'detail': str(e)
        }), 500

@patients_bp.route('/<int:patient_id>', methods=['GET'])
def get_patient_detail(patient_id):
    """Consulta de ficha médica individual. Oculta datos clínicos sensibles a visitantes no autenticados."""
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Ficha clínica no encontrada'}), 404

    is_staff, claims = check_staff_auth()
    include_confidential = False
    if is_staff and claims and claims.get('role', '').lower() in ['admin', 'doctor']:
        include_confidential = True

    return jsonify(patient.to_dict(include_confidential=include_confidential, is_staff=is_staff)), 200

@patients_bp.route('/backup/download', methods=['GET'])
def download_database_backup():
    """
    Descarga del Respaldo de la Base de Datos Hospitalaria (CTF Data Breach).
    PROTEGIDO POR RBAC: Exige rol 'admin' (obtenido vía credenciales o login bypass).
    """
    is_admin, _ = check_admin_auth()
    if not is_admin:
        return jsonify({
            'error': 'Acceso denegado (403 Forbidden)',
            'message': 'Se requiere autenticación y privilegios de Administrador de TI para exportar la base de datos clínica.',
            'subsystem': 'HIS-SECURITY-GATEWAY'
        }), 403

    data_dir = os.path.join(current_app.root_path, 'data')
    db_file = os.path.join(data_dir, 'hospital.sqlite')

    if not os.path.exists(db_file):
        return jsonify({'error': 'El archivo de contingencia no ha sido generado aún en el servidor'}), 404

    audit = AuditLog(
        event_type="DATABASE_BACKUP_EXPORT",
        subsystem="HIS-BACKUP-SERVICE",
        severity="WARNING",
        details="Extracción de contingencia autorizada de la base de datos completa (hospital.sqlite)"
    )
    db.session.add(audit)
    db.session.commit()

    return send_file(
        db_file,
        mimetype='application/x-sqlite3',
        as_attachment=True,
        download_name='hospital_clinical_database_backup.sqlite'
    )

@patients_bp.route('/backup/dump-sql', methods=['GET'])
def download_sql_dump():
    """
    Genera y descarga un volcado SQL (.sql de texto plano con tablas patients y system_configs).
    PROTEGIDO POR RBAC: Exige rol 'admin'.
    """
    is_admin, _ = check_admin_auth()
    if not is_admin:
        return jsonify({
            'error': 'Acceso denegado (403 Forbidden)',
            'message': 'Se requiere autenticación y privilegios de Administrador de TI para generar volcados SQL.',
            'subsystem': 'HIS-SECURITY-GATEWAY'
        }), 403

    try:
        patients = Patient.query.order_by(Patient.id.asc()).all()
        configs = SystemConfig.query.all()
        users = User.query.all()

        sql_lines = [
            "-- ========================================================",
            "-- HOSPITAL CLÍNICO METROPOLITANO CIBERLAB (HSR)",
            "-- SISTEMA DE CONTINGENCIA Y RESPALDO DE FICHAS CLÍNICAS",
            "-- EXPORTACIÓN CONFIDENCIAL - CLASIFICACIÓN NIVEL 3",
            "-- ========================================================\n",
            "DROP TABLE IF EXISTS system_configs;",
            """CREATE TABLE system_configs (
    id INTEGER PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    classification_level VARCHAR(50)
);\n""",
            "DROP TABLE IF EXISTS patients;",
            """CREATE TABLE patients (
    id INTEGER PRIMARY KEY,
    rut VARCHAR(25) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    paternal_last_name VARCHAR(100) NOT NULL,
    maternal_last_name VARCHAR(100) NOT NULL,
    birth_date VARCHAR(20) NOT NULL,
    age INTEGER NOT NULL,
    legal_gender VARCHAR(20) NOT NULL,
    gender_identity VARCHAR(50) NOT NULL,
    nationality VARCHAR(60) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(35),
    email VARCHAR(120),
    emergency_contact_name VARCHAR(120),
    emergency_contact_relationship VARCHAR(60),
    emergency_contact_phone VARCHAR(35),
    health_insurance VARCHAR(80) NOT NULL,
    complementary_insurance VARCHAR(120),
    institutional_agreement VARCHAR(120),
    blood_type VARCHAR(20) NOT NULL,
    allergies VARCHAR(255) NOT NULL,
    chronic_conditions VARCHAR(255) NOT NULL,
    habitual_medications VARCHAR(255) NOT NULL,
    surgical_history VARCHAR(255) NOT NULL,
    diagnosis VARCHAR(255) NOT NULL,
    attending_doctor VARCHAR(120) NOT NULL,
    room VARCHAR(60) NOT NULL,
    admission_date VARCHAR(20) NOT NULL,
    status VARCHAR(50),
    confidential_notes TEXT
);\n"""
        ]

        # Volcado de configs
        for c in configs:
            desc_escaped = c.description.replace("'", "''") if c.description else ''
            sql_lines.append(f"INSERT INTO system_configs VALUES ({c.id}, '{c.config_key}', '{c.config_value}', '{desc_escaped}', '{c.classification_level}');")
        
        sql_lines.append("\n-- VOLCADO DE REGISTROS DE PACIENTES\n")

        # Volcado de pacientes
        for p in patients:
            confidential_escaped = p.confidential_notes.replace("'", "''") if p.confidential_notes else ''
            diag_escaped = p.diagnosis.replace("'", "''")
            doc_escaped = p.attending_doctor.replace("'", "''")
            addr_escaped = p.address.replace("'", "''") if p.address else ''
            meds_escaped = p.habitual_medications.replace("'", "''") if p.habitual_medications else 'Negativo'
            surg_escaped = p.surgical_history.replace("'", "''") if p.surgical_history else 'Negativo'
            allergies_escaped = p.allergies.replace("'", "''") if p.allergies else 'Negativo'
            chronic_escaped = p.chronic_conditions.replace("'", "''") if p.chronic_conditions else 'Negativo'
            
            line = f"INSERT INTO patients VALUES ({p.id}, '{p.rut}', '{p.first_name}', '{p.paternal_last_name}', '{p.maternal_last_name}', '{p.birth_date}', {p.age}, '{p.legal_gender}', '{p.gender_identity}', '{p.nationality}', '{addr_escaped}', '{p.phone}', '{p.email}', '{p.emergency_contact_name}', '{p.emergency_contact_relationship}', '{p.emergency_contact_phone}', '{p.health_insurance}', '{p.complementary_insurance}', '{p.institutional_agreement}', '{p.blood_type}', '{allergies_escaped}', '{chronic_escaped}', '{meds_escaped}', '{surg_escaped}', '{diag_escaped}', '{doc_escaped}', '{p.room}', '{p.admission_date}', '{p.status}', '{confidential_escaped}');"
            sql_lines.append(line)

        dump_content = "\n".join(sql_lines)
        mem_file = io.BytesIO()
        mem_file.write(dump_content.encode('utf-8'))
        mem_file.seek(0)

        return send_file(
            mem_file,
            mimetype='application/sql',
            as_attachment=True,
            download_name='hospital_pacientes_dump.sql'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
