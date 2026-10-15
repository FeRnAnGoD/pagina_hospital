"""
Controlador de Hardware y Simulación OT para Maqueta Hospitalaria
Soporta:
1. Comunicación Serial (Arduino / ESP32 vía USB)
2. Comunicación HTTP / WLED (ESP32 vía Wi-Fi)
3. Modo Simulación / Mock (Hilos de parpadeo de fuego en tiempo real para desarrollo y visualización)
"""

import time
import random
import threading
import os

FLAG_OT_FIRE = "FLAG{h0sp1t4l_s4b0t4g3}"

class HospitalOTController:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(HospitalOTController, cls).__new__(cls)
                cls._instance._init_state()
            return cls._instance

    def _init_state(self):
        # Estados físicos de la planta de infraestructura hospitalaria
        self.oxygen_pressure = 4.2      # bar (normal: 4.0 - 4.5)
        self.boiler_temp = 72.5         # °C (normal: 65 - 80)
        self.oxygen_valve_bypass = False
        self.boiler_overdrive = False
        self.ventilation_damper_closed = False
        self.fire_suppression_offline = False

        # Estado del actuador de luces RGB
        self.fire_effect_active = False
        self.fire_triggered_at = None   # marca de tiempo del último disparo (para cuenta regresiva)
        self.rgb_color = {"r": 0, "g": 200, "b": 255}  # Azul/Celeste clínico normal
        self.rgb_effect_name = "NORMAL_CLINIC_LIGHT"

        # Configuración de hardware externo (opcional)
        self.serial_port = os.getenv("OT_SERIAL_PORT", None) # e.g. 'COM3' o '/dev/ttyUSB0'
        self.serial_baud = int(os.getenv("OT_SERIAL_BAUD", "115200"))
        self.wled_ip = os.getenv("OT_WLED_IP", None)         # e.g. '192.168.1.50'

        # Hilo de simulación continua
        self._simulation_running = True
        self._fire_thread = None
        self._loop_thread = threading.Thread(target=self._telemetry_loop, daemon=True)
        self._loop_thread.start()

    def _telemetry_loop(self):
        """Bucle en segundo plano que simula variaciones físicas continuas"""
        while self._simulation_running:
            if self.fire_effect_active:
                # Simular subida drástica de temperatura y presión por incendio / ignición de O2
                if self.boiler_temp < 480.0:
                    self.boiler_temp += random.uniform(5.0, 12.0)
                if self.oxygen_pressure < 15.0:
                    self.oxygen_pressure += random.uniform(0.3, 0.8)

                # Efecto dinámico de parpadeo de fuego (Rojo vivo, Naranja cálido y chispas amarillas)
                r = random.randint(220, 255)
                g = random.randint(20, 110)
                b = random.randint(0, 15)
                self.rgb_color = {"r": r, "g": g, "b": b}
                self.rgb_effect_name = "FIRE_FLAME_FLICKER"

                # Enviar a hardware físico si está configurado
                self._send_hardware_rgb(r, g, b, effect="FIRE")
            else:
                # Condiciones normales de operación clínica
                # Fluctuación leve natural
                self.boiler_temp = 72.0 + random.uniform(-0.5, 0.8)
                self.oxygen_pressure = 4.2 + random.uniform(-0.05, 0.05)
                self.rgb_color = {"r": 0, "g": 180, "b": 255}
                self.rgb_effect_name = "NORMAL_CLINIC_LIGHT"

            time.sleep(0.3 if self.fire_effect_active else 1.0)

    def _send_hardware_rgb(self, r, g, b, effect="NORMAL"):
        """Envía comandos a la maqueta física si hay conexión serial o HTTP disponible"""
        # 1. Enviar por Serial (Arduino / ESP32)
        if self.serial_port:
            try:
                import serial
                with serial.Serial(self.serial_port, self.serial_baud, timeout=0.1) as ser:
                    packet = f"RGB:{r},{g},{b}:{effect}\n"
                    ser.write(packet.encode('utf-8'))
            except Exception:
                pass  # Si el puerto no está disponible, continuar en modo simulación

        # 2. Enviar por HTTP a WLED (ESP32 Wi-Fi)
        if self.wled_ip and self.fire_effect_active:
            try:
                import requests
                # Efecto 44 en WLED es "Fire 2012"
                payload = {
                    "on": True,
                    "bri": 255,
                    "seg": [{"fx": 44, "sx": 180, "col": [[r, g, b], [255, 60, 0], [255, 200, 0]]}]
                }
                requests.post(f"http://{self.wled_ip}/json/state", json=payload, timeout=0.2)
            except Exception:
                pass

    def trigger_fire_alarm(self, reason="SABOTAJE_BMS_OXIGENO"):
        """Dispara el protocolo de emergencia Código Rojo y el efecto de fuego en luces RGB.
        El sistema se rearma automáticamente tras AUTO_RESET_SECONDS segundos."""
        AUTO_RESET_SECONDS = 10

        self.fire_effect_active = True
        self.oxygen_valve_bypass = True
        self.boiler_overdrive = True
        self.ventilation_damper_closed = True
        self.fire_suppression_offline = True
        self.boiler_temp = 320.0
        self.oxygen_pressure = 9.8
        self.fire_triggered_at = time.time()  # marca de tiempo para cuenta regresiva

        print("="*70)
        print("[OT HARDWARE - MAQUETA HOSPITALARIA] ¡ALARMA DE INCENDIO ACTIVADA!")
        print(f"[OT MOTIVO] {reason}")
        print(f"[OT LUCES RGB] Modo Fuego activado en maqueta (RGB Rojo/Naranja/Amarillo)")
        print(f"[OT CÓDIGO DE AUDITORÍA OT EXTRAPOLADO] {FLAG_OT_FIRE}")
        print(f"[OT AUTO-REARME] Sistema se restablecerá automáticamente en {AUTO_RESET_SECONDS}s")
        print("="*70)

        # Hilo de auto-rearme: espera AUTO_RESET_SECONDS y luego llama a reset_system()
        def _auto_reset():
            time.sleep(AUTO_RESET_SECONDS)
            if self.fire_effect_active:
                print("[OT AUTO-REARME] Tiempo de exposición alcanzado — Sistema rearmado automáticamente.")
                self.reset_system()

        threading.Thread(target=_auto_reset, daemon=True).start()

        return {
            "status": "CÓDIGO ROJO - INCENDIO ACTIVO",
            "flag": FLAG_OT_FIRE,
            "effect": "FIRE_RGB_FLICKER",
            "auto_reset_seconds": AUTO_RESET_SECONDS,
            "message": "Falla catastrófica de ignición por sobrepresión de Oxígeno y sobrecalentamiento. Evacuación inmediata."
        }

    def reset_system(self):
        """Restaura el sistema a parámetros seguros de operación clínica"""
        self.fire_effect_active = False
        self.oxygen_valve_bypass = False
        self.boiler_overdrive = False
        self.ventilation_damper_closed = False
        self.fire_suppression_offline = False
        self.boiler_temp = 72.5
        self.oxygen_pressure = 4.2
        self.rgb_color = {"r": 0, "g": 180, "b": 255}
        self.rgb_effect_name = "NORMAL_CLINIC_LIGHT"

        print("[OT HARDWARE - MAQUETA] Sistema restaurado a condiciones normales.")
        return {"status": "NORMAL", "message": "Infraestructura hospitalaria rearmada y segura."}

    def get_telemetry(self):
        """Retorna el estado actual de los sensores y actuadores"""
        # Calcular segundos restantes para el auto-rearme
        seconds_until_reset = None
        if self.fire_effect_active and self.fire_triggered_at is not None:
            elapsed = time.time() - self.fire_triggered_at
            remaining = max(0, 10 - elapsed)
            seconds_until_reset = round(remaining, 1)

        return {
            "fire_alarm_active": self.fire_effect_active,
            "seconds_until_reset": seconds_until_reset,
            "status_code": "CRITICAL_CODE_RED" if self.fire_effect_active else "NOMINAL_SAFE",
            "oxygen_manifold": {
                "pressure_bar": round(self.oxygen_pressure, 2),
                "threshold_bar": 10.0,
                "valve_bypass": self.oxygen_valve_bypass,
                "status": "PELIGRO DE IGNICIÓN" if self.oxygen_pressure > 8.0 else "ÓPTIMO"
            },
            "boiler_hvac": {
                "temperature_c": round(self.boiler_temp, 1),
                "threshold_c": 350.0,
                "overdrive": self.boiler_overdrive,
                "status": "SOBRECALENTAMIENTO CRÍTICO" if self.boiler_temp > 200.0 else "ESTABLE"
            },
            "safety_systems": {
                "ventilation_dampers_closed": self.ventilation_damper_closed,
                "fire_suppression_offline": self.fire_suppression_offline
            },
            "rgb_lighting_actuator": {
                "active_effect": self.rgb_effect_name,
                "current_rgb": self.rgb_color,
                "hardware_connected": bool(self.serial_port or self.wled_ip),
                "simulation_active": True
            }
        }

# Instancia singleton accesible globalmente
ot_controller = HospitalOTController()
