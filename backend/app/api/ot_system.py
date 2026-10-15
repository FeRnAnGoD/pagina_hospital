from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request, decode_token
from app.hardware.ot_controller import ot_controller, FLAG_OT_FIRE
from app import db
from app.models import AuditLog

ot_bp = Blueprint('ot', __name__)

def check_ot_auth():
    """Verifica si la petición cuenta con rol 'admin' o 'engineer'"""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if claims and claims.get('role', '').lower() in ['admin', 'engineer']:
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
            if role.lower() in ['admin', 'engineer']:
                return True, decoded
        except Exception:
            pass

    return False, None

@ot_bp.route('/telemetry', methods=['GET'])
def get_telemetry():
    """Retorna la telemetría en tiempo real del sistema BMS / OT hospitalario (lectura pública/monitor)"""
    return jsonify(ot_controller.get_telemetry()), 200

@ot_bp.route('/actuators/override', methods=['POST'])
def override_actuators():
    """
    Control de actuadores de infraestructura crítica (Gases Medicinales y Calderas).
    PROTEGIDO POR RBAC: Requiere rol 'admin' o 'engineer'.
    """
    authorized, claims = check_ot_auth()
    if not authorized:
        return jsonify({
            'error': 'Acceso denegado (403 Forbidden)',
            'message': 'Se requieren privilegios técnicos de Ingeniería Biomédica (engineer) o Administración de TI (admin) para comandar actuadores de infraestructura crítica.',
            'subsystem': 'BMS-SAFETY-GATEWAY'
        }), 403

    data = request.get_json() or {}
    
    valve_o2 = data.get('valve_o2_bypass', False)
    boiler_boost = data.get('boiler_overdrive', False)
    vent_closed = data.get('ventilation_damper_close', False)
    suppression_off = data.get('disable_suppression', False)
    override_key = data.get('override_key', '').strip()

    from app.auth_config import HOSPITAL_SYS_KEY

    # Verificación de enclavamiento SCADA para maniobras de alto riesgo
    if valve_o2 and boiler_boost:
        if override_key != HOSPITAL_SYS_KEY:
            return jsonify({
                'success': False,
                'alert_triggered': False,
                'error': 'Enclavamiento de seguridad SCADA activo (BMS-LOCK-403)',
                'message': 'Para maniobras de alto riesgo en calderas y oxígeno se requiere la Clave Maestra de Sobreescritura BMS (Master Override Key). Dicha clave se encuentra resguardada en la base de datos central del hospital.',
                'requires_override_key': True
            }), 403

        ot_controller.oxygen_valve_bypass = True
        ot_controller.boiler_overdrive = True
        ot_controller.ventilation_damper_closed = bool(vent_closed)
        ot_controller.fire_suppression_offline = bool(suppression_off)

        alarm_result = ot_controller.trigger_fire_alarm(
            reason="Sobrecarga combinada de Válvula de Oxígeno Medicinal + Sobrecalentamiento de Calderas (BMS Interlock Overridden)"
        )
        
        audit = AuditLog(
            event_type="OT_SCRAM_FIRE_INCIDENT",
            subsystem="BMS-CRITICAL-GASES",
            severity="CRITICAL",
            details=f"IGNICIÓN EN MAQUETA: Clave de sobreescritura validada. Luces RGB activadas en modo fuego. Código de auditoría de planta: {FLAG_OT_FIRE}"
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({
            'success': True,
            'alert_triggered': True,
            'status': alarm_result['status'],
            'effect': alarm_result['effect'],
            'flag': alarm_result['flag'],
            'message': alarm_result['message']
        }), 200

    ot_controller.oxygen_valve_bypass = bool(valve_o2)
    ot_controller.boiler_overdrive = bool(boiler_boost)
    ot_controller.ventilation_damper_closed = bool(vent_closed)
    ot_controller.fire_suppression_offline = bool(suppression_off)

    return jsonify({
        'success': True,
        'alert_triggered': False,
        'message': 'Parámetros de actuadores actualizados en el sistema BMS.',
        'telemetry': ot_controller.get_telemetry()
    }), 200

@ot_bp.route('/emergency-fire-test', methods=['POST'])
def trigger_fire_direct():
    """
    Endpoint de prueba de incendio.
    PROTEGIDO POR RBAC: Requiere rol 'admin' o 'engineer'.
    """
    authorized, _ = check_ot_auth()
    if not authorized:
        return jsonify({
            'error': 'Acceso denegado (403 Forbidden)',
            'message': 'Se requieren privilegios técnicos de Ingeniería Biomédica o Administración para ejecutar pruebas de incendio en la maqueta.',
            'subsystem': 'BMS-SAFETY-GATEWAY'
        }), 403

    result = ot_controller.trigger_fire_alarm(reason="TEST_DIRECTO_PREPRODUCCION_CTF")
    
    audit = AuditLog(
        event_type="OT_MANUAL_FIRE_TRIGGER",
        subsystem="BMS-SIMULATOR",
        severity="CRITICAL",
        details=f"Disparo manual de prueba de incendio en maqueta RGB. Flag OT: {FLAG_OT_FIRE}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify(result), 200

@ot_bp.route('/reset', methods=['POST'])
def reset_ot():
    """Rearma y restaura los sistemas hospitalarios a estado normal seguro"""
    authorized, _ = check_ot_auth()
    if not authorized:
        return jsonify({
            'error': 'Acceso denegado (403 Forbidden)',
            'message': 'Se requieren privilegios autorizados para rearmar el sistema.',
            'subsystem': 'BMS-SAFETY-GATEWAY'
        }), 403

    result = ot_controller.reset_system()

    audit = AuditLog(
        event_type="OT_SYSTEM_RESET",
        subsystem="BMS-CORE",
        severity="INFO",
        details="Reinicio de sistemas y extinción del efecto de incendio. Retorno a iluminación clínica normal."
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify(result), 200

@ot_bp.route('/logs', methods=['GET'])
def get_ot_logs():
    """Retorna los registros de eventos y alertas de infraestructura del hospital"""
    try:
        logs = AuditLog.query.order_by(AuditLog.id.desc()).limit(20).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
