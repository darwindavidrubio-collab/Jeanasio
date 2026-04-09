from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt

# Importamos todo de tu base de datos
import models
from database import SessionLocal, engine

# 1. CREACIÓN DE LA BASE DE DATOS
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# 2. CONFIGURACIÓN DE SEGURIDAD VIP (NUEVO)
SECRET_KEY = "llave_maestra_hiper_secreta_del_gimnasio" # Sello del guardia
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # El pase dura 30 minutos

# Le decimos a FastAPI dónde está la puerta para pedir el pase
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. MOLDES DE DATOS (SCHEMAS)
class EntrenadorSchema(BaseModel):
    nombre: str
    ciudad: str
    medalla: bool

class UsuarioCrear(BaseModel):
    username: str
    password: str

# 4. FUNCIONES DE APOYO Y SEGURIDAD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def obtener_password_encriptada(password):
    password_bytes = password.encode('utf-8')
    sal = bcrypt.gensalt()
    password_triturada = bcrypt.hashpw(password_bytes, sal)
    return password_triturada.decode('utf-8')

def verificar_password(password_plana, password_triturada):
    password_bytes = password_plana.encode('utf-8')
    hash_bytes = password_triturada.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)

# --- FABRICANTE DE PASES VIP ---
def crear_token_acceso(data: dict):
    a_codificar = data.copy()
    expira = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    a_codificar.update({"exp": expira})
    token_jwt = jwt.encode(a_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt

# --- EL INSPECTOR DE PASES VIP ---
def obtener_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        # Intentamos leer el pase
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Pase VIP inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Pase VIP expirado o falso")
    
    # Verificamos que el usuario aún exista
    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.username == username).first()
    if usuario is None:
        raise HTTPException(status_code=401, detail="El usuario del pase ya no existe")
    return usuario


# 5. RUTAS DE USUARIOS
@app.post("/registro")
def registrar_usuario(usuario: UsuarioCrear, db: Session = Depends(get_db)):
    usuario_existente = db.query(models.UsuarioDB).filter(models.UsuarioDB.username == usuario.username).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Ese nombre de usuario ya está ocupado.")

    password_triturada = obtener_password_encriptada(usuario.password)
    nuevo_usuario = models.UsuarioDB(username=usuario.username, hashed_password=password_triturada)
    
    db.add(nuevo_usuario)
    db.commit()
    return {"mensaje": f"¡Usuario {usuario.username} registrado!"}

# --- LA NUEVA PUERTA DE LOGIN OFICIAL ---
@app.post("/login")
def iniciar_sesion(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Buscamos al usuario
    db_usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.username == form_data.username).first()
    
    # Comparamos contraseñas
    if not db_usuario or not verificar_password(form_data.password, db_usuario.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
        
    # Fabricamos el Pase VIP
    token_real = crear_token_acceso(data={"sub": db_usuario.username})
    return {"access_token": token_real, "token_type": "bearer"}


# 6. RUTAS DEL GIMNASIO (¡AHORA PROTEGIDAS!)
@app.get("/")
def inicio():
    return {"mensaje": "API Segura Activa"}

# Ver entrenadores es público (Cualquiera puede mirar)
@app.get("/entrenadores")
def ver_todos(db: Session = Depends(get_db)):
    return db.query(models.EntrenadorDB).all()

# ¡Crear, actualizar y borrar ahora requieren el PASE VIP!
@app.post("/entrenadores")
def crear_entrenador(entrenador: EntrenadorSchema, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    nuevo_entrenador = models.EntrenadorDB(
        nombre=entrenador.nombre, ciudad=entrenador.ciudad, medalla=entrenador.medalla,
        poder_total=1000 if entrenador.medalla else 0,
        mensaje_medalla="¡Felicidades!" if entrenador.medalla else "Sigue intentando"
    )
    db.add(nuevo_entrenador)
    db.commit()
    db.refresh(nuevo_entrenador)
    return nuevo_entrenador

@app.put("/entrenadores/{entrenador_id}")
def actualizar_entrenador(entrenador_id: int, entrenador: EntrenadorSchema, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    db_entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    db_entrenador.nombre = entrenador.nombre
    db_entrenador.ciudad = entrenador.ciudad
    db_entrenador.medalla = entrenador.medalla
    db_entrenador.poder_total = 1000 if entrenador.medalla else 0
    db.commit()
    db.refresh(db_entrenador)
    return db_entrenador

@app.delete("/entrenadores/{entrenador_id}")
def eliminar_entrenador_por_ID(entrenador_id: int, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    db.delete(entrenador)
    db.commit()
    return {"mensaje": "Entrenador eliminado"}

@app.delete("/eliminar-todo") 
def eliminar_todos_entrenadores(db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    db.query(models.EntrenadorDB).delete()
    db.commit()
    return {"mensaje": "¡Limpieza total!"}