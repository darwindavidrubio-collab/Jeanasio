from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class EntrenadorDB(Base):
    __tablename__ = "entrenadores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) 
    ciudad = Column(String)
    medalla = Column(Boolean)
    poder_total = Column(Integer)
    mensaje_medalla = Column(String)
    pokemon = Column(String)
    
    # Nuevos campos competitivos
    victorias = Column(Integer, default=0)
    derrotas = Column(Integer, default=0)
    xp = Column(Integer, default=0)
    fecha_registro = Column(String, default="")

class UsuarioDB(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
