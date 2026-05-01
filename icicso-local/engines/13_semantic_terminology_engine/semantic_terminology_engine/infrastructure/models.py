"""
SQLAlchemy models for the Semantic Terminology Engine.
"""

from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class TerminologySet(Base):
    """A set of terminology codes (e.g., SNOMED CT, ICD-10)."""

    __tablename__ = "terminology_sets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    system = Column(String(50), nullable=False, index=True)  # SNOMED_CT, ICD_10, etc.
    version = Column(String(50), nullable=False)
    description = Column(Text)
    is_active = Column(Integer, default=1, nullable=False)  # SQLite boolean

    # Relationships
    mappings = relationship("TerminologyMapping", back_populates="terminology_set")

    def __repr__(self):
        return f"<TerminologySet(id={self.id}, name='{self.name}', system='{self.system}')>"


class TerminologyMapping(Base):
    """Mapping between codes in different terminology systems."""

    __tablename__ = "terminology_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    terminology_set_id = Column(Integer, ForeignKey("terminology_sets.id"), nullable=False)
    source_code = Column(String(100), nullable=False, index=True)
    canonical_code = Column(String(100), nullable=False, index=True)
    display_name = Column(String(500))
    created_at = Column(String(50), nullable=False)  # ISO timestamp

    # Relationships
    terminology_set = relationship("TerminologySet", back_populates="mappings")

    __table_args__ = (
        {"sqlite_autoincrement": True},
    )

    def __repr__(self):
        return f"<TerminologyMapping(source='{self.source_code}', canonical='{self.canonical_code}')>"


class TerminologyCache(Base):
    """Cache for frequently accessed terminology lookups."""

    __tablename__ = "terminology_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String(200), nullable=False, unique=True, index=True)
    cache_value = Column(Text, nullable=False)  # JSON data
    expires_at = Column(String(50), nullable=False)  # ISO timestamp

    def __repr__(self):
        return f"<TerminologyCache(key='{self.cache_key[:50]}...')>"


class TerminologyAudit(Base):
    """Audit log for terminology operations."""

    __tablename__ = "terminology_audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operation = Column(String(50), nullable=False)  # translate, validate, etc.
    input_data = Column(Text, nullable=False)  # JSON input
    output_data = Column(Text)  # JSON output
    success = Column(Integer, nullable=False)  # 1 for success, 0 for failure
    error_message = Column(Text)
    timestamp = Column(String(50), nullable=False)  # ISO timestamp
    user_id = Column(String(100))  # For future authentication

    def __repr__(self):
        return f"<TerminologyAudit(operation='{self.operation}', success={self.success})>"