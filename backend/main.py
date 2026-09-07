import os
import re
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import json
import asyncio
import datetime

import models
from database import engine, get_db
from services.face_recognition import face_service
from services.attendance import mark_attendance, get_today_stats

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Attendance API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP EVENT (Migrate dataset & Load Encodings) ---
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    
    # 1. Migrate existing dataset if not migrated
    dataset_path = "../dataset"
    if os.path.exists(dataset_path):
        for filename in os.listdir(dataset_path):
            if filename.lower().endswith((".jpg", ".jpeg", ".png")):
                # Check if person already exists
                raw = filename.split('.')[0].lower()
                clean = re.sub(r'\d+', '', raw).strip()
                name = clean.capitalize()
                
                existing = db.query(models.Person).filter(models.Person.name == name).first()
                if not existing:
                    print(f"Migrating {name} from dataset...")
                    path = os.path.join(dataset_path, filename)
                    with open(path, "rb") as f:
                        image_bytes = f.read()
                        
                    encoding_json, err = face_service.generate_encoding_from_image(image_bytes)
                    if encoding_json:
                        # Do not guess roll number from filename to avoid UNIQUE constraints
                        roll_num = None
                        
                        new_person = models.Person(
                            name=name,
                            roll_number=roll_num,
                            face_encoding=encoding_json
                        )
                        db.add(new_person)
                        db.commit()
    
    # 2. Load encodings from DB to memory
    people = db.query(models.Person).all()
    face_service.load_encodings(people)


# --- REST API ENDPOINTS ---

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    return get_today_stats(db)

@app.get("/api/people")
def get_people(db: Session = Depends(get_db)):
    people = db.query(models.Person).all()
    # Exclude encodings from the response to save bandwidth
    return [
        {
            "id": p.id,
            "name": p.name,
            "roll_number": p.roll_number,
            "class_or_department": p.class_or_department,
            "created_at": p.created_at
        }
        for p in people
    ]

@app.post("/api/people")
async def register_person(
    name: str = Form(...), 
    roll_number: str = Form(None),
    class_or_department: str = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    image_bytes = await image.read()
    encoding_json, err = face_service.generate_encoding_from_image(image_bytes)
    
    if err:
        raise HTTPException(status_code=400, detail=err)
        
    try:
        new_person = models.Person(
            name=name,
            roll_number=roll_number,
            class_or_department=class_or_department,
            face_encoding=encoding_json
        )
        db.add(new_person)
        db.commit()
        db.refresh(new_person)
        
        # Reload encodings in memory
        people = db.query(models.Person).all()
        face_service.load_encodings(people)
        
        # Mark present automatically upon registration
        mark_attendance(db, new_person.id, confidence=100.0)
        
        return {"status": "success", "message": "Person registered successfully", "id": new_person.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/people/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
        
    db.delete(person)
    db.commit()
    
    # Reload encodings in memory
    people = db.query(models.Person).all()
    face_service.load_encodings(people)
    
    return {"status": "success"}

@app.get("/api/attendance/history")
def get_attendance_history(db: Session = Depends(get_db)):
    attendances = db.query(models.Attendance).order_by(models.Attendance.date.desc(), models.Attendance.time.desc()).all()
    return [
        {
            "id": a.id,
            "date": a.date,
            "time": a.time,
            "status": a.status,
            "confidence": a.confidence,
            "person_name": a.person.name if a.person else "Unknown",
            "roll_number": a.person.roll_number if a.person else None
        }
        for a in attendances
    ]

@app.post("/api/attendance/finalize")
def finalize_attendance(db: Session = Depends(get_db)):
    """Marks everyone who doesn't have an attendance record for today as Absent."""
    today = datetime.date.today()
    people = db.query(models.Person).all()
    
    # Get everyone already marked today
    marked_today = db.query(models.Attendance.person_id).filter(models.Attendance.date == today).all()
    marked_ids = {m[0] for m in marked_today}
    
    absent_count = 0
    for p in people:
        if p.id not in marked_ids:
            new_attendance = models.Attendance(
                person_id=p.id,
                date=today,
                time=datetime.datetime.now().time(),
                status="Absent",
                confidence=0.0
            )
            db.add(new_attendance)
            absent_count += 1
            
    db.commit()
    return {"status": "success", "absent_marked": absent_count}

# --- WEBSOCKET ENDPOINT FOR LIVE CAMERA ---

@app.websocket("/ws/recognize")
async def websocket_recognize(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    print("WebSocket Client Connected")
    
    frame_skip = 1
    frame_count = 0
    
    try:
        while True:
            # Receive frame data (base64 string)
            data = await websocket.receive_text()
            frame_count += 1
            
            if frame_count % frame_skip != 0:
                # Optionally send back empty or previous state, but better to just skip
                # Actually, sending an empty response might clear the boxes too fast.
                # Let's just continue and not send anything, frontend should keep old boxes briefly
                continue
                
            try:
                # Process frame
                results = face_service.process_frame(data)
                
                # Mark attendance for recognized faces
                for result in results:
                    if result["status"] == "PRESENT" and result["person_id"]:
                        # Record attendance in DB
                        mark_attendance(db, result["person_id"], result["confidence"])
                
                # Send results back
                await websocket.send_json({"results": results})
                
                # Small sleep to prevent CPU hogging
                await asyncio.sleep(0.01)
                
            except Exception as e:
                print(f"Error processing frame: {e}")
                await websocket.send_json({"results": []})
                
    except WebSocketDisconnect:
        print("WebSocket Client Disconnected")
