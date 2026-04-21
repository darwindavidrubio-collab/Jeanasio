from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone 
from jose import JWTError, jwt
import bcrypt
from typing import Optional

import models
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# 2. CONFIGURACIÓN DE SEGURIDAD VIP
SECRET_KEY = "llave_maestra_hiper_secreta_del_gimnasio" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 

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
    pokemon: str 

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

def crear_token_acceso(data: dict):
    a_codificar = data.copy()
    expira = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    a_codificar.update({"exp": expira})
    token_jwt = jwt.encode(a_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt

def obtener_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Pase VIP inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Pase VIP expirado o falso")
    
    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.username == username).first()
    if usuario is None:
        raise HTTPException(status_code=401, detail="El usuario ya no existe")
    return usuario


# 5. RUTAS DE USUARIOS
@app.post("/registro")
def registrar_usuario(usuario: UsuarioCrear, db: Session = Depends(get_db)):
    usuario_existente = db.query(models.UsuarioDB).filter(models.UsuarioDB.username == usuario.username).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Nombre ocupado.")

    password_triturada = obtener_password_encriptada(usuario.password)
    nuevo_usuario = models.UsuarioDB(username=usuario.username, hashed_password=password_triturada)
    
    db.add(nuevo_usuario)
    db.commit()
    return {"mensaje": f"¡Usuario {usuario.username} registrado!"}

@app.post("/login")
def iniciar_sesion(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.username == form_data.username).first()
    
    if not db_usuario or not verificar_password(form_data.password, db_usuario.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
        
    token_real = crear_token_acceso(data={"sub": db_usuario.username})
    return {"access_token": token_real, "token_type": "bearer"}


# 6. RUTAS DEL GIMNASIO PROTEGIDAS
@app.get("/")
def inicio():
    return {"mensaje": "API Segura Activa"}

@app.get("/entrenadores")
def ver_todos(
    skip: int = 0, 
    limit: int = 5, 
    search: Optional[str] = None,
    ciudad: Optional[str] = None,     # Nuevo
    pokemon: Optional[str] = None,   # Nuevo
    medalla: Optional[bool] = None,  # Nuevo
    db: Session = Depends(get_db)
):
    query = db.query(models.EntrenadorDB)
    
    # Filtro por nombre (el que ya tenías)
    if search:
        query = query.filter(models.EntrenadorDB.nombre.ilike(f"%{search}%"))
    
    # Filtro por Ciudad
    if ciudad:
        query = query.filter(models.EntrenadorDB.ciudad == ciudad)
        
    # Filtro por Pokémon
    if pokemon:
        query = query.filter(models.EntrenadorDB.pokemon == pokemon)
        
    # Filtro por Medalla (Novato vs Campeón)
    if medalla is not None:
        query = query.filter(models.EntrenadorDB.medalla == medalla)
        
    total_registros = query.count()
    entrenadores = query.offset(skip).limit(limit).all()
    
    return {"total": total_registros, "entrenadores": entrenadores}

@app.post("/entrenadores")
def crear_entrenador(entrenador: EntrenadorSchema, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    nuevo_entrenador = models.EntrenadorDB(
        nombre=entrenador.nombre, 
        ciudad=entrenador.ciudad, 
        medalla=entrenador.medalla,
        pokemon=entrenador.pokemon, 
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
    
    if not db_entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")

    db_entrenador.nombre = entrenador.nombre
    db_entrenador.ciudad = entrenador.ciudad
    db_entrenador.medalla = entrenador.medalla
    db_entrenador.pokemon = entrenador.pokemon 
    db_entrenador.poder_total = 1000 if entrenador.medalla else 0
    db.commit()
    db.refresh(db_entrenador)
    return db_entrenador

@app.delete("/entrenadores/{entrenador_id}")
def eliminar_entrenador_por_ID(entrenador_id: int, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    
    if not entrenador:
        raise HTTPException(status_code=404, detail="No existe ese ID")

    db.delete(entrenador)
    db.commit()
    return {
        "mensaje": "Entrenador eliminado"
    }

@app.delete("/eliminar-todo") 
def eliminar_todos_entrenadores(db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    db.query(models.EntrenadorDB).delete()
    db.commit()
    return {"mensaje": "¡Limpieza total!"}


# =================================================================
# 7. LA BÓVEDA SECRETA (PANEL DE DIOS)
# =================================================================

class NuevaPasswordSchema(BaseModel):
    nueva_password: str

def verificar_super_admin(usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    if usuario_actual.username != "darwin_admin": 
        raise HTTPException(status_code=403, detail="¡Alerta de intruso! Solo Darwin tiene este poder.")
    return usuario_actual

@app.get("/usuarios-panel")
def ver_todos_los_usuarios(db: Session = Depends(get_db), admin: models.UsuarioDB = Depends(verificar_super_admin)):
    usuarios = db.query(models.UsuarioDB).all()
    lista_segura = [{"id": u.id, "username": u.username} for u in usuarios]
    return lista_segura

@app.delete("/usuarios-panel/{usuario_id}")
def eliminar_usuario_del_sistema(usuario_id: int, db: Session = Depends(get_db), admin: models.UsuarioDB = Depends(verificar_super_admin)):
    usuario_a_borrar = db.query(models.UsuarioDB).filter(models.UsuarioDB.id == usuario_id).first()
    
    if not usuario_a_borrar:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if usuario_a_borrar.username == admin.username:
        raise HTTPException(status_code=400, detail="¡No puedes borrarte a ti mismo, Jefe!")

    db.delete(usuario_a_borrar)
    db.commit()
    return {"mensaje": f"El usuario {usuario_a_borrar.username} ha sido expulsado del sistema." 
    }

@app.put("/usuarios-panel/{usuario_id}/password")
def cambiar_password_usuario(usuario_id: int, datos: NuevaPasswordSchema, db: Session = Depends(get_db), admin: models.UsuarioDB = Depends(verificar_super_admin)):
    usuario_a_editar = db.query(models.UsuarioDB).filter(models.UsuarioDB.id == usuario_id).first()
    
    if not usuario_a_editar:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nueva_password_triturada = obtener_password_encriptada(datos.nueva_password)
    usuario_a_editar.hashed_password = nueva_password_triturada
    db.commit()
    
    return {"mensaje": f"La contraseña de {usuario_a_editar.username} ha sido actualizada con éxito."
    }