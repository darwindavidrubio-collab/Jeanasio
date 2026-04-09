from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class EntrenadorDB(Base):
    __tablename__ = "entrenadores"

    id = Column(Integer, primary_key=True, index=True)
    # Añadimos unique=True para que la DB no acepte nombres repetidos
    nombre = Column(String, unique=True, index=True) 
    ciudad = Column(String)
    medalla = Column(Boolean)
    poder_total = Column(Integer)
    mensaje_medalla = Column(String)
    