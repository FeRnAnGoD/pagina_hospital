"""
Script de inicialización y siembra de base de datos hospitalaria
Hospital Clínico Metropolitano Ciberlab (HSR)
Genera:
- Usuarios institucionales (Admin, Médicos, Ingeniería OT)
- Configuraciones de infraestructura SCADA / WAF (SystemConfig)
- 150 historias clínicas chilenas de acuerdo a Requisitos base de datos.txt:
  * Identificación completa (RUT/Pasaporte, Nombres, Apellidos paterno/materno, Edad, Género, Nacionalidad)
  * Información de Contacto y Emergencia (Dirección, Teléfono, Email, Tutor/Familiar)
  * Previsión y Financiamiento (Fonasa Tramos A-D, Isapres, Seguros Complementarios, Convenios)
  * Ficha Médica Esencial (Grupo/Rh, Alergias, Crónicos, Fármacos habituales con dosis, Cirugías previas)
- Inserción de la FLAG 1 en el paciente ID 140
- Inserción de la Clave Maestra SCADA en system_configs
"""

import random
from datetime import datetime
from app import create_app, db
from app.models import User, Patient, SystemConfig, AuditLog
from app.auth_config import HOSPITAL_SYS_KEY

app = create_app()

NOMBRES_MASC = [
    "Juan", "Carlos", "José", "Luis", "Diego", "Sebastián", "Rodrigo", "Matías", "Felipe", "Nicolás",
    "Benjamín", "Gabriel", "Joaquín", "Cristóbal", "Maximiliano", "Vicente", "Tomás", "Agustín", "Lucas",
    "Álvaro", "Eduardo", "Claudio", "Gonzalo", "Esteban", "Ignacio", "Jorge", "Mauricio", "Pablo"
]

NOMBRES_FEM = [
    "María", "Ana", "Francisca", "Camila", "Javiera", "Constanza", "Ignacia", "Daniela", "Paula",
    "Valentina", "Catalina", "Fernanda", "Sofía", "Antonia", "Isidora", "Florencia", "Martina", "Emilia",
    "Pilar", "Andrea", "Carolina", "Patricia", "Valeria", "Claudia", "Loreto", "Macarena", "Marcela"
]

APELLIDOS_PATERNO = [
    "González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda",
    "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya", "Flores", "Espinoza", "Valenzuela",
    "Castillo", "Tapia", "Reyes", "Gutiérrez", "Castro", "Pizarro", "Álvarez", "Vásquez", "Sánchez", "Fernández"
]

APELLIDOS_MATERNO = [
    "Ramírez", "Carrasco", "Gómez", "Cortés", "Herrera", "Nuñez", "Jara", "Vergara", "Rivera", "Figueroa",
    "Bravo", "Vargas", "Mendoza", "Cáceres", "Guzmán", "Paredes", "Salinas", "Bustos", "Henríquez", "Miranda",
    "Medina", "Navarro", "Aguilera", "Riquelme", "Vera", "Sandoval", "Ponce", "Salazar", "Molina", "Campos"
]

COMUNAS = [
    "Santiago Centro", "Providencia", "Las Condes", "Ñuñoa", "La Florida", "Maipú", "Puente Alto",
    "San Miguel", "Independencia", "Recoleta", "Quinta Normal", "Estación Central", "Peñalolén", "Macul"
]

ISAPRES = ["Isapre Banmédica", "Isapre Colmena Golden Cross", "Isapre Consalud", "Isapre CruzBlanca", "Isapre Nueva Masvida"]
FONASA_TRAMOS = ["Fonasa Tramo A", "Fonasa Tramo B", "Fonasa Tramo C", "Fonasa Tramo D"]

COMPLEMENTARIOS = [
    "MetLife Seguros (Póliza #ML-{num})",
    "BICE Vida Compañía de Seguros (Póliza #BV-{num})",
    "Chilena Consolidada - Zurich (Póliza #CC-{num})",
    "Consorcio Nacional de Seguros (Póliza #CN-{num})",
    "Seguros Vida Security (Póliza #VS-{num})",
    "Negativo"
]

CONVENIOS = [
    "Caja de Compensación Los Andes",
    "Caja de Compensación La Araucana",
    "Caja de Compensación 18 de Septiembre",
    "Seguro Escolar Obligatorio Ley 16.744",
    "Convenio Colectivo Empresa Codelco",
    "Negativo"
]

GRUPOS_SANGUINEOS = ["A+ (Rh Positivo)", "A- (Rh Negativo)", "B+ (Rh Positivo)", "B- (Rh Negativo)", "AB+ (Rh Positivo)", "AB- (Rh Negativo)", "O+ (Rh Positivo)", "O- (Rh Negativo)"]

ALERGIAS_LISTA = [
    "Penicilina y derivados betalactámicos",
    "AINEs (Ibuprofeno, Ketorolaco, Ketoprofeno)",
    "Sulfamidas y Trimetoprim",
    "Mariscos y pescados",
    "Látex natural",
    "Medios de contraste yodados",
    "Dipirona (Metamizol sódico)",
    "Negativo",
    "Negativo",
    "Negativo"
]

CRONICOS_LISTA = [
    "Hipertensión Arterial (HTA) Grado II",
    "Diabetes Mellitus Tipo 2 (DM2)",
    "Asma Bronquial moderada persistente",
    "Hipotiroidismo primario en tratamiento",
    "Dislipidemia mixta",
    "Enfermedad Pulmonar Obstructiva Crónica (EPOC)",
    "Insuficiencia Renal Crónica Etapa 3",
    "Cardiopatía Isquémica crónica",
    "Negativo",
    "Negativo"
]

MEDICAMENTOS_LISTA = [
    "Losartán 50mg (1 comprimido c/12 hrs) + Amlodipino 5mg",
    "Metformina 850mg (1 comp c/8 hrs post comidas) + Glibenclamida 5mg",
    "Levotiroxina sódica 100mcg (1 comp en ayunas)",
    "Salbutamol aerosol 100mcg (2 puff en caso de disnea)",
    "Atorvastatina 20mg (1 comp en la noche)",
    "Enalapril 10mg (1 comp c/12 hrs) + Hidroclorotiazida 12.5mg",
    "Aspirina protect 100mg (1 comp al día tras almuerzo)",
    "Omeprazol 20mg (1 cápsula en ayunas)",
    "Negativo",
    "Negativo"
]

CIRUGIAS_LISTA = [
    "Apendicectomía laparoscópica (Marzo 2018)",
    "Colecistectomía por laparoscopía (Noviembre 2021)",
    "Cesárea electiva con salpingoligadura (Agosto 2019)",
    "Artroscopía de rodilla derecha por rotura meniscal (Junio 2022)",
    "Hernioplastía inguinal derecha (Mayo 2017)",
    "Osteosíntesis de fémur izquierdo post-accidente (Octubre 2020)",
    "Negativo",
    "Negativo",
    "Negativo"
]

DIAGNOSTICOS = [
    ("Hipertensión Arterial Grado II descompensada con cefalea", "Cardiología"),
    ("Fractura conminuta de tibia derecha post-accidente vial", "Traumatología"),
    ("Neumonía bacteriana multifocal adquirida en la comunidad", "Medicina Interna"),
    ("Apendicitis aguda fase flegmonosa en observación", "Cirugía General"),
    ("Diabetes Mellitus Tipo 2 con cetoacidosis moderada", "Endocrinología"),
    ("Insuficiencia respiratoria aguda por bronquiolitis viral", "Pediatría"),
    ("Accidente cerebrovascular isquémico en ventana terapéutica", "Neurología"),
    ("Colecistitis litiásica aguda con cólico biliar refractario", "Gastroenterología"),
    ("Quemadura de segundo grado superficial en extremidad superior", "Urgencias"),
    ("Crisis asmática severa refractaria a broncodilatadores", "Broncopulmonar"),
    ("Insuficiencia cardíaca congestiva descompensada clase III", "Cardiología"),
    ("Traumatismo encéfalo craneano cerrado con pérdida de conciencia", "Neurocirugía")
]

MEDICOS = [
    "Dr. Fernando Soto (Jefe Cirugía)",
    "Dra. Carolina Alarcón (UCI Adultos)",
    "Dr. Marcelo Vivanco (Cardiología)",
    "Dra. Patricia Henríquez (Medicina Interna)",
    "Dr. Claudio Navarro (Traumatología)",
    "Dra. Andrea Morales (Urgencias)",
    "Dr. Gonzalo Carrasco (Neurología)",
    "Dra. Valeria Quintana (Comité de Auditoría Clínica)"
]

def generar_rut(numero):
    s = str(numero)
    multiplicadores = [2, 3, 4, 5, 6, 7, 2, 3]
    suma = sum(int(dig) * mult for dig, mult in zip(reversed(s), multiplicadores))
    resto = suma % 11
    dv = 11 - resto
    dv_str = 'K' if dv == 10 else ('0' if dv == 11 else str(dv))
    return f"{s[:2]}.{s[2:5]}.{s[5:]}-{dv_str}"

def seed():
    with app.app_context():
        print("[SEEK/INIT] Recreando tablas de la base de datos...")
        db.drop_all()
        db.create_all()

        # 1. Crear usuarios institucionales (Camino A: Admin robusto en bcrypt, empleados en MD5 crackeable)
        print("[SEEK/USERS] Creando usuarios del personal clínico y de TI...")
        users = [
            User(
                username="admin",
                full_name="Administrador General de Sistemas",
                role="admin",
                department="Dirección y TI Hospitalaria"
            ),
            User(
                username="dr_morales",
                full_name="Dr. Claudio Morales",
                role="doctor",
                department="Medicina Interna y UCI"
            ),
            User(
                username="ing_valenzuela",
                full_name="Ing. Roberto Valenzuela",
                role="engineer",
                department="Ingeniería Biomédica & Mantenimiento OT"
            )
        ]
        # Admin: Contraseña robusta no incluida en diccionarios comunes (bcrypt)
        users[0].set_password("Hosp!tal_Adm!n_Tr0p1c@l_2026#SecOps")
        
        # dr_morales: MD5('doctor2026') = 9f94025bc3d31a654a6d042033295327
        import hashlib
        users[1].password_hash = hashlib.md5(b"doctor2026").hexdigest()
        
        # ing_valenzuela: MD5('biomedica2026') = aecefaff66a29178e71cf48034bc3dcc
        users[2].password_hash = hashlib.md5(b"biomedica2026").hexdigest()

        for u in users:
            db.session.add(u)

        # 2. Configuraciones de infraestructura SCADA / WAF (SystemConfig)
        print("[SEEK/CONFIG] Configurando parámetros maestros de infraestructura SCADA...")
        configs = [
            SystemConfig(
                config_key="SCADA_BMS_OVERRIDE_KEY",
                config_value=HOSPITAL_SYS_KEY,
                description="Clave maestra de sobreescritura de enclavamientos SCADA para calderas y oxígeno medicinal",
                classification_level="SECRET"
            ),
            SystemConfig(
                config_key="WAF_PROTECTION_PROFILE",
                config_value="WAF-Guard-Hospitalario-v2.4-Strict",
                description="Perfil activo del cortafuegos perimetral para inspección de firmas SQLi",
                classification_level="INTERNAL"
            ),
            SystemConfig(
                config_key="INTRANET_TRUSTED_HEADER",
                config_value="X-Hospital-Internal",
                description="Cabecera HTTP autorizada para estaciones clínicas en red LAN",
                classification_level="INTERNAL"
            ),
            SystemConfig(
                config_key="HIS_DATABASE_VERSION",
                config_value="HIS-MINSAL-CL-v4.2.8-PROD",
                description="Versión del esquema clínico hospitalario",
                classification_level="PUBLIC"
            )
        ]
        for c in configs:
            db.session.add(c)

        # 3. Generar 150 pacientes chilenos detallados
        print("[SEEK/PATIENTS] Sembrando 150 historias clínicas chilenas detalladas...")
        rut_base = 14200100

        for i in range(1, 151):
            es_masc = random.random() < 0.5
            nom = random.choice(NOMBRES_MASC) if es_masc else random.choice(NOMBRES_FEM)
            ape_pat = random.choice(APELLIDOS_PATERNO)
            ape_mat = random.choice(APELLIDOS_MATERNO)
            genero_legal = "Masculino" if es_masc else "Femenino"
            
            # Edad y Fecha de Nacimiento
            edad = random.randint(18, 85)
            anio_nac = 2026 - edad
            mes_nac = random.randint(1, 12)
            dia_nac = random.randint(1, 28)
            f_nac = f"{anio_nac}-{mes_nac:02d}-{dia_nac:02d}"

            # Identificación y Nacionalidad
            nacionalidad = "Chilena"
            if i % 15 == 0:
                nacionalidad = random.choice(["Venezolana", "Peruana", "Colombiana", "Haitiana"])
                rut_str = f"PAS-{random.randint(10000000, 99999999)}"
            else:
                rut_str = generar_rut(rut_base + i * 37)

            # Contacto
            comuna = random.choice(COMUNAS)
            direccion = f"Calle {random.choice(['Los Alerces', 'Las Condes', 'Providencia', 'San Diego', 'Alameda', 'Vicuña Mackenna', 'Gran Avenida', 'Pajaritos'])} #{random.randint(100, 6800)}, {comuna}"
            telefono = f"+56 9 {random.randint(4000, 9999)} {random.randint(1000, 9999)}"
            email = f"{nom.lower()}.{ape_pat.lower()}@pacientes.ciberlab.cl"

            # Contacto de Emergencia
            parentesco = random.choice(["Cónyuge", "Madre", "Padre", "Hijo/a", "Hermano/a"])
            tutor_nom = f"{random.choice(NOMBRES_FEM if parentesco in ['Madre', 'Hijo/a'] else NOMBRES_MASC)} {ape_pat}"
            tutor_tel = f"+56 9 {random.randint(4000, 9999)} {random.randint(1000, 9999)}"

            # Previsión y Financiamiento
            if random.random() < 0.70:
                prevision = random.choice(FONASA_TRAMOS)
            else:
                prevision = random.choice(ISAPRES)

            compl_template = random.choice(COMPLEMENTARIOS)
            complementario = compl_template.replace("{num}", str(random.randint(10000, 99999)))
            convenio = random.choice(CONVENIOS)

            # Ficha Médica
            sangre = random.choice(GRUPOS_SANGUINEOS)
            alergias = random.choice(ALERGIAS_LISTA)
            cronicos = random.choice(CRONICOS_LISTA)
            medicamentos = random.choice(MEDICAMENTOS_LISTA)
            cirugias = random.choice(CIRUGIAS_LISTA)

            # Admisión
            diag, depto = random.choice(DIAGNOSTICOS)
            doc = random.choice(MEDICOS)
            estado = random.choice(["Ingresado", "Alta Médica", "UCI", "Observación", "Pabellón"])
            sala = f"Pabellón {random.randint(1, 4)} - Cama {random.randint(101, 499)}"
            f_ingreso = f"2026-08-{random.randint(10, 28):02d}"

            confidential = f"Evolución clínica estándar en {depto}. Signos vitales estables. Paciente bajo seguimiento asistencial de rutina."

            # FLAG 1: REGISTRO CON ID 140
            if i == 140:
                nom = "Mateo"
                ape_pat = "Valenzuela"
                ape_mat = "Morales"
                genero_legal = "Masculino"
                edad = 35
                f_nac = "1991-04-12"
                nacionalidad = "Chilena"
                rut_str = "14.205.280-K"
                prevision = "Isapre Banmédica"
                complementario = "MetLife Seguros (Póliza #ML-99412)"
                convenio = "Convenio Colectivo Empresa Codelco"
                sangre = "O- (Rh Negativo)"
                alergias = "Penicilina y derivados betalactámicos (Shock anafiláctico previo)"
                cronicos = "Hipertensión Arterial Grado II en tratamiento"
                medicamentos = "Losartán 50mg c/12h"
                cirugias = "Apendicectomía (2018), Politraumatismo UCI con fijación quirúrgica (2025)"
                diag = "Politraumatismo de alta energía en UCI - Protocolo de Seguridad Restringida"
                doc = "Dr. Claudio Morales (Medicina Interna y UCI)"
                sala = "Unidad Cuidados Intensivos (UCI) - Box Aislado 402"
                estado = "UCI"
                confidential = (
                    "===================================================================\n"
                    "HOSPITAL CLÍNICO METROPOLITANO CIBERLAB - CLASIFICACIÓN RESTRINGIDA\n"
                    "REGISTRO DE AUDITORÍA FORENSE Y CIBERDEFENSA HOSPITALARIA 2026\n"
                    "-------------------------------------------------------------------\n"
                    "CASO CLÍNICO ESPECIAL: PACIENTE MATEO VALENZUELA MORALES\n"
                    "MÉDICO TRATANTE ASIGNADO: Dr. Claudio Morales (Medicina Interna y UCI)\n"
                    "VINCULACIÓN FUNCIONARIA: Familiar directo personal biomédico (Ing. Roberto Valenzuela)\n"
                    "OBJETIVO DE ALTO PERFIL VULNERADO EXITOSAMENTE (DATA BREACH EXPOSURE)\n"
                    "INTEGRIDAD DE BASE DE DATOS: COMPROMETIDA\n"
                    "FLAG_DESAFIO_1: FLAG{h0sp1t4l_d4t4b4s3_l34k}\n"
                    "-------------------------------------------------------------------\n"
                    "NOTA TÉCNICA INTERCONSULTA BIOMÉDICA (Ing. Roberto Valenzuela):\n"
                    "«Se constató sobrepresión y fluctuaciones anómalas en los ductos de oxígeno\n"
                    "medicinal del Box 402. La clave de autorización SCADA para maniobras de riesgo\n"
                    "y sobreescritura fue respaldada en los parámetros centrales (tabla system_configs).»\n"
                    "==================================================================="
                )

            paciente = Patient(
                id=i,
                rut=rut_str,
                first_name=nom,
                paternal_last_name=ape_pat,
                maternal_last_name=ape_mat,
                birth_date=f_nac,
                age=edad,
                legal_gender=genero_legal,
                gender_identity=genero_legal,
                nationality=nacionalidad,
                address=direccion,
                phone=telefono,
                email=email,
                emergency_contact_name=tutor_nom,
                emergency_contact_relationship=parentesco,
                emergency_contact_phone=tutor_tel,
                health_insurance=prevision,
                complementary_insurance=complementario,
                institutional_agreement=convenio,
                blood_type=sangre,
                allergies=alergias,
                chronic_conditions=cronicos,
                habitual_medications=medicamentos,
                surgical_history=cirugias,
                diagnosis=diag,
                attending_doctor=doc,
                room=sala,
                admission_date=f_ingreso,
                status=estado,
                confidential_notes=confidential
            )
            db.session.add(paciente)

        # 4. Logs de auditoría iniciales
        audit1 = AuditLog(
            event_type="SYSTEM_INITIALIZATION",
            subsystem="HIS-CORE",
            severity="INFO",
            details="Sistema hospitalario iniciado. 150 expedientes clínicos chilenos cargados con cumplimiento ministerial."
        )
        audit2 = AuditLog(
            event_type="WAF_PERIMETER_ONLINE",
            subsystem="WAF-GUARD-V2.4",
            severity="INFO",
            details="Cortafuegos WAF perimetral activo. Inspección de firmas SQLi habilitada en modo BLOCKING."
        )
        audit3 = AuditLog(
            event_type="OT_SCADA_LINKED",
            subsystem="BMS-OT-SUPERVISOR",
            severity="INFO",
            details="Conexión establecida con PLC de Calderas y Oxígeno. Enclavamiento de seguridad SCADA activo."
        )
        db.session.add(audit1)
        db.session.add(audit2)
        db.session.add(audit3)

        db.session.commit()
        print("[SEEK/SUCCESS] Base de datos hospitalaria inicializada exitosamente.")
        print(f"  -> Total pacientes sembrados: 150")
        print(f"  -> Paciente ID 140 (Mateo Valenzuela Morales) configurado con FLAG 1")
        print(f"  -> SystemConfig configurado con Clave Maestra SCADA: {HOSPITAL_SYS_KEY}")

if __name__ == '__main__':
    seed()
