from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone 
from jose import JWTError, jwt
import bcrypt
from typing import Optional
import random

import models
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

# ==========================================
# 0. MIGRACIÓN AUTOMÁTICA DE BASE DE DATOS
# ==========================================
from sqlalchemy import text

def migrar_db():
    columnas_nuevas = [
        ("victorias", "INTEGER DEFAULT 0"),
        ("derrotas", "INTEGER DEFAULT 0"),
        ("xp", "INTEGER DEFAULT 0"),
        ("fecha_registro", "VARCHAR DEFAULT ''")
    ]
    with engine.connect() as conn:
        for col, tipo in columnas_nuevas:
            try:
                conn.execute(text(f"ALTER TABLE entrenadores ADD COLUMN {col} {tipo}"))
                conn.commit()
                print(f"Columna {col} añadida exitosamente.")
            except Exception as e:
                # Si falla (ej. la columna ya existe), ignoramos
                pass

migrar_db()

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

class ResultadoCombateSchema(BaseModel):
    id_ganador: Optional[int] = None
    id_perdedor: Optional[int] = None
    empate: Optional[bool] = False
    id_a: Optional[int] = None
    id_b: Optional[int] = None

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
    return FileResponse("index.html")


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

# 1. Definimos los rangos de poder por especie y evolución
# Escala de Poder Centralizada (Min: 10 - Max: 10.000)
POKEMON_POWER_DATA = {
    # --- INICIALES CLÁSICOS ---
    "bulbasaur": {"min": 10, "max": 3000, "label": "Básico"},
    "ivysaur": {"min": 3001, "max": 7000, "label": "Evolución 1"},
    "venusaur": {"min": 7001, "max": 10000, "label": "Evolución Final"},
    
    "charmander": {"min": 10, "max": 3000, "label": "Básico"},
    "charmeleon": {"min": 3001, "max": 7000, "label": "Evolución 1"},
    "charizard": {"min": 7001, "max": 10000, "label": "Evolución Final"},
    
    "squirtle": {"min": 10, "max": 3000, "label": "Básico"},
    "wartortle": {"min": 3001, "max": 7000, "label": "Evolución 1"},
    "blastoise": {"min": 7001, "max": 10000, "label": "Evolución Final"},

    # --- POKÉMON ANTIGUOS Y ESPECIALES ---
    "pikachu": {"min": 10, "max": 5000, "label": "Básico"},
    "raichu": {"min": 5001, "max": 10000, "label": "Evolución Final"},
    
    "eevee": {"min": 10, "max": 4000, "label": "Básico"},
    "vaporeon": {"min": 4001, "max": 10000, "label": "Evolución Final"},
    "jolteon": {"min": 4001, "max": 10000, "label": "Evolución Final"},
    "flareon": {"min": 4001, "max": 10000, "label": "Evolución Final"},

    "zubat": {"min": 10, "max": 3000, "label": "Básico"},
    "golbat": {"min": 3001, "max": 7000, "label": "Evolución 1"},
    "crobat": {"min": 7001, "max": 10000, "label": "Evolución Final"},

    "gastly": {"min": 10, "max": 3000, "label": "Básico"},
    "haunter": {"min": 3001, "max": 7000, "label": "Evolución 1"},
    "gengar": {"min": 7001, "max": 10000, "label": "Evolución Final"},

    "dratini": {"min": 10, "max": 3000, "label": "Básico"},
    "dragonair": {"min": 3001, "max": 7000, "label": "Evolución 1"},
    "dragonite": {"min": 7001, "max": 10000, "label": "Evolución Final"}
}

# Mapa Evolutivo para determinar la siguiente forma del Pokémon
MAPA_EVOLUTIVO = {
    "bulbasaur": "ivysaur",   "ivysaur": "venusaur",
    "charmander": "charmeleon", "charmeleon": "charizard",
    "squirtle": "wartortle",  "wartortle": "blastoise",
    "pikachu": "raichu",
    "eevee": "vaporeon",  # Por defecto en backend; UI enviará el específico si es posible
    "zubat": "golbat",    "golbat": "crobat",
    "gastly": "haunter",  "haunter": "gengar",
    "dratini": "dragonair", "dragonair": "dragonite",
}

@app.post("/entrenadores")
def crear_entrenador(entrenador: EntrenadorSchema, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    # Lógica de poder basada en evolución (como definimos antes)
    pokemon_key = entrenador.pokemon.lower()
    stats = POKEMON_POWER_DATA.get(pokemon_key, {"min": 10, "max": 10000, "label": "Desconocido"})
    poder_calculado = random.randint(stats["min"], stats["max"])
    
    fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    nuevo_entrenador = models.EntrenadorDB(
        nombre=entrenador.nombre, 
        ciudad=entrenador.ciudad, 
        medalla=entrenador.medalla,
        pokemon=entrenador.pokemon, 
        poder_total=poder_calculado,
        mensaje_medalla=f"Nivel de poder: {stats['label']}",
        victorias=0,
        derrotas=0,
        xp=0,
        fecha_registro=fecha_actual
    )
    
    try:
        db.add(nuevo_entrenador)
        db.commit()
        db.refresh(nuevo_entrenador)
        return nuevo_entrenador
    except IntegrityError:
        db.rollback()
        # Mensaje de error amigable y más temático/descriptivo
        raise HTTPException(status_code=400, detail="Firma digital duplicada: Entrenador ya registrado")

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
def eliminar_entrenador(entrenador_id: int, db: Session = Depends(get_db), usuario_actual: models.UsuarioDB = Depends(obtener_usuario_actual)):
    db_entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    
    if not db_entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")
    
    db.delete(db_entrenador)
    db.commit()
    
    return {"mensaje": f"Entrenador {db_entrenador.nombre} eliminado exitosamente."}

# ==========================================
# RUTAS LIBRES (No requieren token VIP)
# ==========================================

@app.put("/entrenadores/{entrenador_id}/entrenar")
def entrenar_entrenador(entrenador_id: int, db: Session = Depends(get_db)):
    db_entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    if not db_entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")
        
    stats = POKEMON_POWER_DATA.get(db_entrenador.pokemon.lower())
    if not stats:
        raise HTTPException(status_code=400, detail="Datos del Pokémon no encontrados")
        
    if db_entrenador.poder_total >= stats["max"]:
        raise HTTPException(status_code=400, detail="¡El Pokémon ha alcanzado su límite de poder en esta etapa! Necesita evolucionar.")
        
    # Incremento de entrenamiento entre +100 y +500
    incremento = random.randint(100, 500)
    nuevo_poder = min(db_entrenador.poder_total + incremento, stats["max"])
    
    db_entrenador.poder_total = nuevo_poder
    db.commit()
    db.refresh(db_entrenador)
    
    return {"mensaje": f"¡Entrenamiento exitoso! +{incremento} poder.", "entrenador": db_entrenador}

class EvolucionRequest(BaseModel):
    evolucion_forzada: Optional[str] = None

@app.put("/entrenadores/{entrenador_id}/evolucionar")
def evolucionar_entrenador(entrenador_id: int, req: EvolucionRequest = None, db: Session = Depends(get_db)):
    db_entrenador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == entrenador_id).first()
    if not db_entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")
        
    pokemon_actual = db_entrenador.pokemon.lower()
    
    # Eevee es un caso especial porque tiene múltiples evoluciones que escoge el UI
    if req and req.evolucion_forzada and pokemon_actual == "eevee":
        nueva_especie = req.evolucion_forzada.lower()
        if nueva_especie not in ["vaporeon", "jolteon", "flareon"]:
            raise HTTPException(status_code=400, detail="Evolución de Eevee no válida")
    else:
        nueva_especie = MAPA_EVOLUTIVO.get(pokemon_actual)
        
    if not nueva_especie:
        raise HTTPException(status_code=400, detail="¡Este Pokémon ya ha alcanzado su evolución final!")
        
    stats_actual = POKEMON_POWER_DATA.get(pokemon_actual)
    
    # Validar que tiene el nivel máximo para evolucionar
    if db_entrenador.poder_total < stats_actual["max"]:
        faltante = stats_actual["max"] - db_entrenador.poder_total
        raise HTTPException(status_code=400, detail=f"Falta poder para evolucionar. Necesita {stats_actual['max']} de poder (faltan {faltante}). ¡Sigue entrenando!")
        
    stats_nuevo = POKEMON_POWER_DATA.get(nueva_especie)
    
    db_entrenador.pokemon = nueva_especie
    db_entrenador.poder_total = stats_nuevo["min"]
    db_entrenador.mensaje_medalla = f"Nivel de poder: {stats_nuevo['label']}"
    
    db.commit()
    db.refresh(db_entrenador)
    
    return {"mensaje": f"¡Increíble! Tu Pokémon evolucionó a {nueva_especie.capitalize()}.", "entrenador": db_entrenador}

# ==========================================
# RUTAS COMPETITIVAS (Leaderboard y Duelos)
# ==========================================

class ResultadoCombateSchema(BaseModel):
    id_a: Optional[int] = None
    id_b: Optional[int] = None
    id_ganador: Optional[int] = None
    id_perdedor: Optional[int] = None
    empate: bool = False

@app.put("/resultado-combate")
def actualizar_resultado_combate(resultado: ResultadoCombateSchema, db: Session = Depends(get_db)):
    if resultado.empate:
        if resultado.id_a:
            entrenador_a = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == resultado.id_a).first()
            if entrenador_a:
                entrenador_a.xp = (entrenador_a.xp or 0) + 50
        if resultado.id_b:
            entrenador_b = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == resultado.id_b).first()
            if entrenador_b:
                entrenador_b.xp = (entrenador_b.xp or 0) + 50
    else:
        if resultado.id_ganador:
            ganador = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == resultado.id_ganador).first()
            if ganador:
                ganador.victorias = (ganador.victorias or 0) + 1
                ganador.xp = (ganador.xp or 0) + 150
                
        if resultado.id_perdedor:
            perdedor = db.query(models.EntrenadorDB).filter(models.EntrenadorDB.id == resultado.id_perdedor).first()
            if perdedor:
                perdedor.derrotas = (perdedor.derrotas or 0) + 1
                perdedor.xp = (perdedor.xp or 0) + 30
                
    db.commit()
    return {"mensaje": "Resultados de combate registrados exitosamente."}

@app.get("/ranking")
def obtener_ranking(db: Session = Depends(get_db)):
    # Trae el Top 10 ordenado por victorias DESC, luego por XP DESC
    top_entrenadores = db.query(models.EntrenadorDB).order_by(
        models.EntrenadorDB.victorias.desc(), 
        models.EntrenadorDB.xp.desc()
    ).limit(10).all()
    
    return {"ranking": top_entrenadores}

# ==========================================
# RUTAS ADMINISTRATIVAS
# ==========================================

@app.delete("/entrenadores/admin/borrar_todos") 
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


# 8. LA SEMILLA DE DATOS (Para pruebas)
import random

@app.post("/entrenadores/seed")
def sembrar_entrenadores(db: Session = Depends(get_db)):
    ciudades = ["Pueblo Paleta", "Ciudad Verde", "Ciudad Plateada", "Ciudad Celeste"]
    basicos = [k for k, v in POKEMON_POWER_DATA.items() if v["label"] == "Básico"]
    evolucionados = [k for k, v in POKEMON_POWER_DATA.items() if v["label"] != "Básico"]
    
    entrenadores_creados = []
    
    # Garantizar exactamente 10% evolucionados (2 de 20)
    cantidad_total = 20
    cantidad_evolucionados = int(cantidad_total * 0.10)
    cantidad_basicos = cantidad_total - cantidad_evolucionados
    
    seleccionados = random.choices(evolucionados, k=cantidad_evolucionados) + random.choices(basicos, k=cantidad_basicos)
    # No mezclamos (shuffle) para asegurar que los 2 evolucionados queden 
    # de primeros en la base de datos y aparezcan INMEDIATAMENTE en la página 1.
    
    for pokemon_elegido in seleccionados:
        stats = POKEMON_POWER_DATA[pokemon_elegido]
        poder_calculado = random.randint(stats["min"], stats["max"])
        
        nuevo_entrenador = models.EntrenadorDB(
            nombre=f"Entrenador de Prueba {random.randint(1000, 9999)}", # Nombre único
            ciudad=random.choice(ciudades),
            pokemon=pokemon_elegido,
            medalla=random.choice([True, False]),
            poder_total=poder_calculado,
            mensaje_medalla=f"Nivel de poder: {stats['label']}"
        )
        db.add(nuevo_entrenador)
        entrenadores_creados.append(nuevo_entrenador)
    
    db.commit()
    return {"mensaje": f"¡Bóveda sembrada! Se crearon {len(entrenadores_creados)} entrenadores de prueba."}

# Servir archivos estáticos (CSS, JS, Imágenes, Música)
# IMPORTANTE: Debe estar AL FINAL, después de todas las rutas de API
app.mount("/", StaticFiles(directory=".", html=True), name="static")
