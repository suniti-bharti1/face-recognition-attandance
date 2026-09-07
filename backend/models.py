from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Time, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    roll_number = Column(String, unique=True, index=True, nullable=True)
    class_or_department = Column(String, nullable=True)
    face_encoding = Column(Text, nullable=True) # Storing JSON array as text
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attendances = relationship("Attendance", back_populates="person")

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=datetime.date.today)
    start_time = Column(Time, default=datetime.datetime.now().time)
    end_time = Column(Time, nullable=True)
    status = Column(String, default="active") # active, closed

    attendances = relationship("Attendance", back_populates="session")

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id"))
    date = Column(Date, default=datetime.date.today)
    time = Column(Time, default=datetime.datetime.now().time)
    status = Column(String) # Present, Absent
    confidence = Column(Float, nullable=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    person = relationship("Person", back_populates="attendances")
    session = relationship("AttendanceSession", back_populates="attendances")
