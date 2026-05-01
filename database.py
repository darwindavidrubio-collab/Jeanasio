from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# El nombre del archivo que aparecerá en tu carpeta
URL_DATABASE = "sqlite:///./entrenadores.db"

# El motor que habla con SQLite
engine = create_engine(URL_DATABASE, connect_args={"check_same_thread": False})

# La fábrica que abre y cierra sesiones de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# La base que usaremos para crear las tablas
Base = declarative_base()