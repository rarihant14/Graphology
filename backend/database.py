import os
import logging
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, Integer, String,
    Text, DateTime, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MySQL connection (appointments) + SQLite connection (users/analyses)
# ---------------------------------------------------------------------------

# SQLite — existing users and analyses
SQLITE_URL = "sqlite:///./graphology.db"
sqlite_engine = create_engine(
    SQLITE_URL, connect_args={"check_same_thread": False}
)
SqliteSession = sessionmaker(bind=sqlite_engine, autoflush=False, autocommit=False)

# MySQL — appointments
MYSQL_HOST     = os.getenv("MYSQL_HOST")
MYSQL_PORT     = os.getenv("MYSQL_PORT")
MYSQL_USER     = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE")

MYSQL_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
)

mysql_engine = create_engine(MYSQL_URL, pool_pre_ping=True)
MySQLSession = sessionmaker(bind=mysql_engine, autoflush=False, autocommit=False)

# ---------------------------------------------------------------------------
# Bases
# ---------------------------------------------------------------------------

SqliteBase = declarative_base()
MySQLBase  = declarative_base()

# ---------------------------------------------------------------------------
# SQLite models — User, Analysis (unchanged)
# ---------------------------------------------------------------------------

class User(SqliteBase):
    __tablename__ = "users"

    id          = Column(Integer, primary_key=True, index=True)
    email       = Column(String(150), unique=True, index=True, nullable=False)
    name        = Column(String(100))
    avatar_url  = Column(String(300))
    provider    = Column(String(30))
    provider_id = Column(String(100))
    created_at  = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("Analysis", back_populates="user")


class Analysis(SqliteBase):
    __tablename__ = "analyses"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    personality_traits = Column(Text)
    disclaimer        = Column(Text)
    created_at        = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="analyses")


# ---------------------------------------------------------------------------
# MySQL model — Appointment
# ---------------------------------------------------------------------------

class Appointment(MySQLBase):
    __tablename__ = "appointments"

    id                 = Column(Integer, primary_key=True, index=True)
    name               = Column(String(100), nullable=False)
    email              = Column(String(150), nullable=False)
    phone              = Column(String(20), nullable=False)
    preferred_datetime = Column(DateTime, nullable=False)
    message            = Column(Text)
    status             = Column(String(20), default="pending")
    created_at         = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Create tables
# ---------------------------------------------------------------------------

SqliteBase.metadata.create_all(bind=sqlite_engine)
MySQLBase.metadata.create_all(bind=mysql_engine)

# ---------------------------------------------------------------------------
# Session dependencies
# ---------------------------------------------------------------------------

def get_db():
    """SQLite session — for users and analyses."""
    db = SqliteSession()
    try:
        yield db
    finally:
        db.close()


def get_mysql_db():
    """MySQL session — for appointments."""
    db = MySQLSession()
    try:
        yield db
    finally:
        db.close()