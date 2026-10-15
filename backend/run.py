from app import create_app

app = create_app()

if __name__ == '__main__':
    print("[HOSPITAL CIBERLAB] Servidor Backend Flask iniciado en http://localhost:5000")
    print("  -> Endpoints de pacientes en /api/patients")
    print("  -> Endpoints de control OT en /api/ot")
    app.run(host='0.0.0.0', port=5000, debug=True)
