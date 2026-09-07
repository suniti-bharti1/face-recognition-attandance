import datetime
from sqlalchemy.orm import Session
from models import Attendance, Person, AttendanceSession

def mark_attendance(db: Session, person_id: int, confidence: float):
    """Mark attendance if not already marked today"""
    today = datetime.date.today()
    
    # Check if already marked today
    existing = db.query(Attendance).filter(
        Attendance.person_id == person_id,
        Attendance.date == today
    ).first()
    
    if existing:
        return existing
        
    # Mark new attendance
    new_attendance = Attendance(
        person_id=person_id,
        date=today,
        time=datetime.datetime.now().time(),
        status="Present",
        confidence=confidence
    )
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    
    return new_attendance

def get_today_stats(db: Session):
    """Get total registered, present, and absent for today"""
    today = datetime.date.today()
    
    total_people = db.query(Person).count()
    present_today = db.query(Attendance).filter(Attendance.date == today).count()
    absent_today = max(0, total_people - present_today)
    
    return {
        "total_people": total_people,
        "present_today": present_today,
        "absent_today": absent_today,
        "unknown": 0 # Unknown is tracked via websocket in frontend usually, or we can just send 0
    }
