"""
Módulo de Simulación WAF (Web Application Firewall) Perimetral
Hospital Clínico Metropolitano Ciberlab (WAF-Guard v2.4 Enterprise)

Diseñado para simular cortafuegos de aplicaciones web de infraestructura crítica.
Intercepta firmas de inyección SQL estándar y proporciona vectores de evasión realistas:
1. Evasión Sintáctica (WAF Bypass vía comentarios SQL /**/ en vez de espacios)
2. Cabecera de Confianza de Intranet (X-Hospital-Internal: true / X-Forwarded-For: 127.0.0.1)
3. Parámetro de diagnóstico: ?internal_bypass=1
"""

import re
from flask import Blueprint, request, jsonify

waf_bp = Blueprint('waf', __name__)

WAF_RULES = [
    {
        "id": "WAF-RULE-101",
        "name": "SQLi.UnionSelect.Signature",
        "pattern": re.compile(r"(?i)\bunion\s+select\b"),
        "severity": "CRITICAL",
        "description": "Detección de cláusula UNION SELECT con espacios en blanco tradicionales."
    },
    {
        "id": "WAF-RULE-102",
        "name": "SQLi.Tautology.OrEquals",
        "pattern": re.compile(r"(?i)\bor\s+['\"]?1['\"]?\s*=\s*['\"]?1"),
        "severity": "HIGH",
        "description": "Detección de tautología booleana OR '1'='1' en texto plano."
    },
    {
        "id": "WAF-RULE-103",
        "name": "SQLi.Tautology.OrTrue",
        "pattern": re.compile(r"(?i)\bor\s+true\b"),
        "severity": "HIGH",
        "description": "Detección de operador booleano OR TRUE con espacios."
    },
    {
        "id": "WAF-RULE-104",
        "name": "SQLi.Destructive.Drop",
        "pattern": re.compile(r"(?i)\bdrop\s+table\b"),
        "severity": "EMERGENCY",
        "description": "Comando destructivo DROP TABLE."
    }
]

WAF_STATE = {
    "enabled": True,
    "mode": "BLOCKING",
    "version": "WAF-Guard Hospitalario Enterprise v2.4.1",
    "blocked_count": 0,
    "bypassed_count": 0
}

def inspect_query_string(input_str):
    """
    Inspecciona una cadena de texto contra las firmas de ataque registradas.
    Retorna (is_blocked, match_info).
    """
    if not WAF_STATE["enabled"] or not input_str:
        return False, None

    # Verificación de bypass por Cabecera de Intranet Médica o IP Local
    is_internal_header = request.headers.get('X-Hospital-Internal', '').lower() in ['true', '1', 'yes']
    is_forwarded_local = request.headers.get('X-Forwarded-For', '') in ['127.0.0.1', 'localhost', '10.0.0.1']
    is_param_bypass = request.args.get('internal_bypass', '') in ['1', 'true']

    if is_internal_header or is_forwarded_local or is_param_bypass:
        WAF_STATE["bypassed_count"] += 1
        return False, {"bypassed": True, "reason": "Cabecera o Red Intranet Médica Autorizada"}

    # Evaluación de reglas de filtrado
    for rule in WAF_RULES:
        if rule["pattern"].search(input_str):
            WAF_STATE["blocked_count"] += 1
            return True, {
                "rule_id": rule["id"],
                "rule_name": rule["name"],
                "severity": rule["severity"],
                "description": rule["description"]
            }

    return False, None

@waf_bp.route('/status', methods=['GET'])
def get_waf_status():
    """Estado y telemetría de seguridad del WAF"""
    return jsonify({
        "status": "OPERATIONAL" if WAF_STATE["enabled"] else "BYPASSED",
        "firewall": WAF_STATE["version"],
        "mode": WAF_STATE["mode"],
        "total_attacks_blocked": WAF_STATE["blocked_count"],
        "intranet_bypasses": WAF_STATE["bypassed_count"],
        "rules_active": len(WAF_RULES),
        "security_policy": "Strict Health Information Protection Policy (MINSAL-CERT 2026)"
    }), 200

@waf_bp.route('/rules', methods=['GET'])
def get_waf_rules():
    """Inspección de firmas activas (útil para auditoría y testing pedagógico)"""
    return jsonify({
        "firewall": WAF_STATE["version"],
        "rules": [
            {
                "id": r["id"],
                "name": r["name"],
                "severity": r["severity"],
                "description": r["description"]
            }
            for r in WAF_RULES
        ],
        "allowed_exceptions": [
            "Estaciones de la Intranet con cabecera 'X-Hospital-Internal: true'",
            "Tráfico local de auditoría '127.0.0.1'",
            "Sintaxis SQL encapsulada con comentarios de bloque estándar (ej. /**/)"
        ]
    }), 200
