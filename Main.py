from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import models
from database import SessionLocal, engine
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware # <--- Importante
from sqlalchemy.exc import IntegrityError # Añade esta importación
from fastapi import HTTPException # Añade esta también

app = FastAPI()

# Configuramos quién tiene permiso de entrar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Esto crea el archivo .db si no existe
models.Base.metadata.create_all(bind=engine)

# El molde para recibir datos del usuario (Frontend)
class EntrenadorSchema(BaseModel):
    nombre: str
    ciudad: str
    medalla: bool

# Función para obtener la conexión a la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def inicio():
    return {"mensaje": "API con Base de Datos Real Activa"}


#guardar entrenadores
@app.post("/entrenadores")
def crear_entrenador(entrenador: EntrenadorSchema, db: Session = Depends(get_db)):
    
    # 1. PRIMERO CREAS LA VARIABLE (Asegúrate de que el nombre sea idéntico)
    nuevo_entrenador = models.EntrenadorDB(
        nombre=entrenador.nombre,
        ciudad=entrenador.ciudad,
        medalla=entrenador.medalla,
        poder_total=1000 if entrenador.medalla else 0,
        mensaje_medalla="¡Felicidades!" if entrenador.medalla else "Sigue intentando"
    )
    
    # 2. LUEGO LA AGREGAS (Aquí es donde te daba el error porque no encontraba el nombre)
    try:
        db.add(nuevo_entrenador) # <--- Revisa que esté escrito IGUAL que arriba
        db.commit()
        db.refresh(nuevo_entrenador)
        return nuevo_entrenador
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ese nombre ya existe.")


#ver todos los entrenadores
@app.get("/entrenadores")
def ver_todos(db: Session = Depends(get_db)):
    return db.query(models.EntrenadorDB).all()


#eliminar entrenadores ID
@app.delete("/entrenadores/{entrenador_id}")
def eliminar_entrenador_por_ID(entrenador_id: int, db: Session = Depends(get_db)):
    # 1. Buscamos al entrenador en la base de datos por su ID
    entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()

    # 2. Si no existe, le avisamos al usuario
    if not entrenador:
        return {"error": f"No se encontró ningún entrenador con el ID {entrenador_id}"}

    # 3. Si existe, procedemos a borrarlo
    db.delete(entrenador)
    db.commit() # Confirmamos el cambio en el archivo .db

    return {"mensaje": f"Entrenador {entrenador.nombre} eliminado correctamente!!!"}


#eliminar todos los entrenadores
@app.delete("/eliminar-todo") 
def eliminar_todos_entrenadores(db: Session = Depends(get_db)):
    # 1. En lugar de .all(), usamos directamente .delete()
    filas_borradas = db.query(models.EntrenadorDB).delete()
    # 2. Si no borró nada, es porque estaba vacía
    if filas_borradas == 0:
        return {"error": "No hay entrenadores para eliminar"}
    # 3. Guardamos los cambios
    db.commit()
    return {"mensaje": f"¡Limpieza total! Se eliminaron {filas_borradas} entrenadores."}



#actualizar entrenadores
@app.put("/entrenadores/{entrenador_id}")
def actualizar_entrenador(entrenador_id: int, entrenador: EntrenadorSchema, db: Session = Depends(get_db)):
    # Buscamos al entrenador original
    db_entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    
    if not db_entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")

    # ACTUALIZAMOS CADA CAMPO
    db_entrenador.nombre = entrenador.nombre
    db_entrenador.ciudad = entrenador.ciudad
    db_entrenador.medalla = entrenador.medalla
    
    # Recalculamos el poder si cambió la medalla
    db_entrenador.poder_total = 1000 if entrenador.medalla else 0
    db_entrenador.mensaje_medalla = "¡Felicidades!" if entrenador.medalla else "Sigue intentando"

    db.commit() # 👈 SIN ESTO NO SE GUARDA NADA
    db.refresh(db_entrenador)
    return db_entrenador
