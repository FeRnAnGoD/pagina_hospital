# Ciberlab Hospital CTF 2026 — Plataforma HIS & BMS SCADA (Arquitectura Multicapa)

Plataforma de entrenamiento y evaluación CTF para entornos hospitalarios e infraestructura crítica ciberfísica (IT/OT), desarrollada para Ciberlab UC y ejercicios de ciberdefensa.

El entorno modela el **Hospital Clínico Metropolitano Ciberlab (HSR)** con una arquitectura de seguridad por capas que incluye **Cortafuegos Perimetral WAF (WAF-Guard v2.4)**, **Control de Acceso Basado en Roles (RBAC)**, un **esquema clínico chileno completo (norma MINSAL)** y **enclavamiento de seguridad SCADA**.

---

## 🏛️ Arquitectura de Seguridad y Capas Defensivas

1. **Capa 1: Cortafuegos WAF Perimetral (`WAF-Guard v2.4`):**
   * Inspecciona las peticiones al buscador de pacientes. Si detecta inyecciones directas como `' OR '1'='1` o `UNION SELECT` con espacios estándar, responde con **`HTTP 403 Forbidden`** (`WAF-092`).
   * **Técnicas de Evasión (WAF Bypass):**
     * **Evasión Sintáctica:** Reemplazar espacios por comentarios de bloque SQL (`/**/`):
       ```sql
       '/**/UNION/**/SELECT/**/id,username,password_hash,full_name,role,department,null,null,null,null/**/FROM/**/users/**/--
       ```
     * **Cabecera de Intranet Médica:** Enviar la cabecera `X-Hospital-Internal: true` o agregar el parámetro `?internal_bypass=1`.
2. **Capa 2: Base de Datos Clínica Chilena Completa (`Requisitos base de datos.txt`):**
   * 150 expedientes clínicos detallados con nombres y apellidos (paterno y materno), RUT con dígito verificador y pasaportes, edad, sexo e identidad de género, nacionalidad, dirección en comunas de Santiago, teléfono y contacto de emergencia con parentesco y tutor.
   * Previsión de salud real: **Fonasa** (Tramos A, B, C, D) e **Isapres** (Banmédica, Colmena, Consalud, CruzBlanca, Nueva Masvida), seguros complementarios con póliza y convenios institucionales (Caja Los Andes, Seguro Escolar Ley 16.744).
   * Ficha médica: grupo sanguíneo/Rh, alergias farmacológicas, enfermedades crónicas, medicamentos de uso habitual con dosis y antecedentes quirúrgicos.
   * **Flag 1:** Oculta en las notas confidenciales del paciente **ID 140** (*Mateo Valenzuela Morales*).
3. **Capa 3: Enclavamiento SCADA en Desafío OT (Vínculo entre Desafíos):**
   * En el módulo BMS, los actuadores de calderas y oxígeno no permiten sobrecarga a menos que se introduzca la **Clave Maestra de Sobreescritura SCADA**.
   * Dicha clave (`HSR-BMS-SECURE-OVERRIDE-KEY-994`) se encuentra resguardada en la tabla `system_configs` de la base de datos descargada en el Desafío 1, uniendo ambos desafíos en una sola narrativa.
4. **Capa 4: Protección y Privacidad de Datos de Pacientes (Ley N° 20.584):**
   * **Vista Pública Restringida:** Un visitante anónimo o usuario no autenticado en `/pacientes` solo puede ver datos básicos para visitas de familiares: Nombre del paciente, RUT enmascarado (`14.200.***-*`), sala/cama, estado asistencial y médico tratante.
   * **Sellado de Datos Sensibles:** La dirección, teléfono, correo personal, tutor de emergencia, previsión Fonasa/Isapre, alergias, diagnósticos médicos y antecedentes quirúrgicos se encuentran bloqueados bajo candado digital.
   * **Acceso Clínico Exclusivo:** Solo el personal médico acreditado (`dr_morales`) o administrador (`admin`) tiene autorización para ver el expediente clínico completo.
5. **Capa 5: Visibilidad y RBAC:**
   * Las interfaces críticas (`/fichas`, `/bms`, `/respaldo`) están ocultas en la vista pública y protegidas por JWT en backend y frontend.

---

## 🎯 Enunciados Oficiales y Narrativa de Misión (Plataforma CTF)

### 🚩 DESAFÍO 1 (IT): Operación Ficha Oculta — Filtración de Datos Clínicos
* **Título del Desafío:** *"Operación Ficha Oculta: Vulnerando el Secreto Médico (Ley 20.584)"*
* **Dificultad:** Intermedio (300 Puntos)
* **Historia / Enunciado del Desafío:**
  > *"Informes de inteligencia sanitaria alertan sobre una fuga de información clasificada en el Hospital Metropolitano Ciberlab. Se sospecha que la ficha médica del paciente **Mateo Valenzuela Morales** (hijo de un funcionario interno) contiene antecedentes críticos y un informe de auditoría reservado tras un grave incidente en la UCI. La legislación chilena (Ley N° 20.584) y un cortafuegos perimetral (WAF) bloquean el acceso al público general.*
  >
  > *Tu misión: Evade las defensas perimetrales del portal asistencial, vulnera la autenticación médica institucional para hacerte pasar por el facultativo a cargo y extrae la evidencia confidencial resguardada en el expediente de Mateo Valenzuela Morales."*
* **Bandera Objetivo:** `FLAG{h0sp1t4l_d4t4b4s3_l34k}`

---

### 🚩 DESAFÍO 2 (OT): Operación Código Rojo — Sabotaje Físico a la Infraestructura Crítica
* **Título del Desafío:** *"Operación Código Rojo: Sabotaje SCADA y Deflagración Térmica"*
* **Dificultad:** Avanzado (400 Puntos)
* **Historia / Enunciado del Desafío:**
  > *"El Hospital Metropolitano cuenta con un sistema BMS/SCADA que gobierna las redes de soporte vital: la central de calderas de vapor y el suministro de oxígeno criogénico (O2). Dichos enclavamientos están protegidos por segregación de funciones (RBAC) y una clave criptográfica de seguridad industrial almacenada en los parámetros centrales de la infraestructura.*
  >
  > *Tu misión: Con los privilegios de mantenimiento de ingeniería biomédica, recupera la clave de sobreescritura maestra (SCADA Override Key), anula los seguros de presión y fuerza la sobrecarga simultánea de calderas y oxígeno para desatar una alarma de incendio física en la maqueta hospitalaria."*
* **Bandera Objetivo:** `FLAG{h0sp1t4l_s4b0t4g3}`

---

## 🧭 Guía de Ataque Didáctica: La Perspectiva de un Atacante Novato

Esta guía recrea el recorrido paso a paso de un competidor principiante, explicando qué mira, qué prueba, qué errores encuentra y cómo avanza:

### Paso 1: Reconocimiento y Descubrimiento del Terreno
* **Pensamiento del novato:** *"Me dieron una URL (http://localhost:5173) y la misión de inteligencia de encontrar la ficha de Mateo Valenzuela Morales. Voy a entrar a ver qué encuentro."*
* **Lo que hace:**
  1. Abre el navegador y entra a `http://localhost:5173`.
  2. Ve un portal clínico normal: *"Inicio"*, *"Consulta Pacientes"* y *"Acceso Personal Clínico"*. No hay botones de descarga ni de calderas.
  3. Revisa `http://localhost:5173/robots.txt` en la barra de direcciones y descubre rutas restringidas:
     * `Disallow: /fichas`
     * `Disallow: /bms`
     * `Disallow: /respaldo`

---

### Paso 2: Buscador y Tropiezo con el Cortafuegos (WAF)
* **Pensamiento del novato:** *"El enunciado del desafío me dijo que busque a 'Mateo Valenzuela Morales'. Voy a ir a 'Consulta Pacientes' (/pacientes)."*
* **Lo que hace:**
  1. Escribe `Mateo Valenzuela` y ve que los diagnósticos dicen *"Diagnóstico reservado (Ley 20.584)"*, el RUT está enmascarado (`14.205.***-*`) y el modal exige perfil de médico tratante o administrador.
  2. Intenta la inyección básica que vio en un tutorial:
     ```
     ' OR '1'='1
     ```
  3. **¡Bloqueo!** Aparece una tarjeta de advertencia roja:
     > **🛡️ WAF-092: Petición bloqueada por Cortafuegos Perimetral Hospitalario (WAF-Guard v2.4)**
  4. Comprende que el hospital tiene un Firewall (WAF) que filtra espacios y palabras clave.

---

### Paso 3: Evasión del WAF con Comentarios SQL (`/**/`)
* **Pensamiento del novato:** *"El firewall busca espacios entre palabras para atraparme. ¿Cómo escribo comandos SQL sin espacios?"*
* **Lo que hace:**
  1. En SQL, los comentarios de bloque `/**/` equivalen a un espacio para el motor de la base de datos, pero eluden las expresiones regulares del firewall.
  2. Reemplaza los espacios normales por `/**/` y pide la tabla de usuarios:
     ```sql
     '/**/UNION/**/SELECT/**/id,username,password_hash,full_name,role,department,null,null,null,null/**/FROM/**/users/**/--
     ```
  3. Presiona **"Buscar Paciente"**.
  4. **¡Éxito!** El firewall lo deja pasar y la pantalla muestra los usuarios del hospital con sus contraseñas encriptadas:
     * `admin`: Hash Bcrypt largo (`$2b$12$...`) (cuenta fortificada).
     * `dr_morales`: Hash MD5 `9f94025bc3d31a654a6d042033295327`.
     * `ing_valenzuela`: Hash MD5 `aecefaff66a29178e71cf48034bc3dcc`.

---

### Paso 4: Rompiendo Contraseñas (Password Cracking)
* **Pensamiento del novato:** *"Tengo los nombres de usuario, pero las contraseñas son códigos de 32 letras y números (hashes MD5). ¿Cómo sé la contraseña real?"*
* **Lo que hace:**
  1. Copia el hash de `dr_morales`: `9f94025bc3d31a654a6d042033295327`.
  2. Entra a una web gratuita como **crackstation.net** (o busca el hash en Google).
  3. Pega el código y presiona **"Crack Hashes"**.
  4. En 1 segundo la web le revela: **`doctor2026`**.
  5. Repite lo mismo con el hash del ingeniero `aecefaff66a29178e71cf48034bc3dcc`: la web le revela: **`biomedica2026`**.

---

### Paso 5: Desafío 1 — Intrusión Clínica como Dr. Morales (Flag 1)
* **Pensamiento del novato:** *"La historia me encomendó la ficha de Mateo Valenzuela Morales. Mateo está a cargo del Dr. Morales. Con la clave del médico (dr_morales / doctor2026), voy al login institucional."*
* **Lo que hace:**
  1. Va a `http://localhost:5173/login`.
  2. Inicia sesión con `dr_morales` y `doctor2026`.
  3. La barra de navegación se actualiza y muestra: **"📋 Fichas Clínicas (HIS Intranet)"** (`/fichas`).
  4. Al ser médico jefe acreditado, los candados de la Ley 20.584 se abren: ahora sí puede ver diagnósticos reales, camas y antecedentes médicos completos.
  5. Busca al paciente con ID 140 (*Mateo Valenzuela Morales*) y abre su ficha.
  6. Como `dr_morales` es el médico tratante asignado, se le despliega el informe clínico confidencial con la **Flag 1**:
     ```text
     FLAG{h0sp1t4l_d4t4b4s3_l34k}
     ```
  7. En la misma ficha lee una nota de interconsulta técnica:
     > *"El Ing. Roberto Valenzuela reportó incidencias en los sensores de oxígeno del Box 402. La clave de autorización SCADA para maniobras de riesgo se encuentra registrada en los parámetros maestros del sistema (system_configs)."*

---

### Paso 6: Segunda Inyección SQL — Extracción de la Clave Maestra SCADA
* **Pensamiento del novato:** *"La nota médica dijo que la clave de las calderas y el oxígeno está en una tabla llamada system_configs. ¿Puedo consultar esa tabla con la misma inyección SQL de antes?"*
* **Lo que hace:**
  1. Vuelve al buscador de pacientes.
  2. Ejecuta la consulta adaptada a `system_configs`:
     ```sql
     '/**/UNION/**/SELECT/**/id,config_key,config_value,description,null,null,null,null,null,null/**/FROM/**/system_configs/**/--
     ```
  3. En pantalla lee claramente:
     `SCADA_BMS_OVERRIDE_KEY` = **`HSR-BMS-SECURE-OVERRIDE-KEY-994`**.
  4. Copia esa clave en un bloc de notas.

---

### Paso 7: Desafío 2 — Sabotaje Físico OT como Ing. Valenzuela (Flag 2)
* **Pensamiento del novato:** *"Tengo el usuario del ingeniero (ing_valenzuela / biomedica2026) y la clave maestra de sobreescritura. ¡Es hora de provocar el incendio en la maqueta!"*
* **Lo que hace:**
  1. Cierra la sesión del doctor y entra al login con:
     * **Usuario:** `ing_valenzuela`
     * **Contraseña:** `biomedica2026`
  2. Se activa el enlace **"⚡ BMS / Infraestructura OT"** (`http://localhost:5173/bms`).
  3. Entra al panel BMS: ve los controles de calderas y oxígeno.
  4. Enciende los dos interruptores:
     * [ON] Válvula Bypass de Oxígeno Medicinal ($O_2$)
     * [ON] Sobrecalentamiento Forzado de Calderas (Overdrive)
  5. En la casilla **"Clave Maestra de Sobreescritura SCADA"**, pega la clave:
     ```text
     HSR-BMS-SECURE-OVERRIDE-KEY-994
     ```
  6. Presiona **"⚡ Aplicar Sobrecarga a Actuadores de Planta"**.
  7. **¡Efecto en Maqueta y Flag 2!**
     * Las luces RGB de la maqueta parpadean en modo fuego vivo (rojo y naranja).
     * La interfaz web entra en **CÓDIGO ROJO**.
     * Se emite la segunda bandera oficial del CTF:
       ```text
       FLAG{h0sp1t4l_s4b0t4g3}
       ```

---

## 👥 Matriz de Acceso por Roles (RBAC)

| Perfil | Fichas Clínicas (`/fichas`) | BMS OT (`/bms`) | Respaldo DB (`/respaldo`) | Propósito en el CTF |
| :--- | :--- | :--- | :--- | :--- |
| **Visitante Anónimo** | ❌ Bloqueado (Candado Ley 20.584) | ❌ 403 Forbidden | ❌ 403 Forbidden | Punto de inicio (explotar SQLi con evasión WAF) |
| **Dr. Claudio Morales** | ✅ Acceso Completo a Fichas | ❌ 403 Forbidden | ❌ 403 Forbidden | **Desafío 1:** Auditar ficha #140 y extraer Flag 1 |
| **Ing. Roberto Valenzuela** | ❌ 403 Forbidden | ✅ Acceso a Actuadores SCADA | ❌ 403 Forbidden | **Desafío 2:** Sabotaje OT en maqueta y Flag 2 |
| **Administrador TI** | ✅ Acceso a Fichas | ✅ Acceso a BMS | ✅ Respaldo Base de Datos | Cuenta fortificada de supervisión |

---

## 🌐 Configuración de Puertos y Despliegue

* **Hospital Backend (Flask):** Puerto `5000`
* **Hospital Frontend (React/Vite):** Puerto `5173`
* Aislado e independiente de SmartCity en la misma IP de producción.
