import insightface
import numpy as np
import json
import base64
import cv2

class FaceRecognitionService:
    def __init__(self):
        # Prepare InsightFace
        self.app = insightface.app.FaceAnalysis()
        self.app.prepare(ctx_id=0, det_size=(320, 320))
        self.known_embeddings = []
        self.known_people = [] # List of Person objects/dicts
        
    def load_encodings(self, db_people):
        """Load known encodings into memory from database."""
        self.known_embeddings = []
        self.known_people = []
        for person in db_people:
            if person.face_encoding:
                try:
                    encoding = np.array(json.loads(person.face_encoding))
                    self.known_embeddings.append(encoding)
                    self.known_people.append({
                        "id": person.id,
                        "name": person.name,
                        "roll_number": person.roll_number
                    })
                except Exception as e:
                    print(f"Failed to load encoding for {person.name}: {e}")
        
        if self.known_embeddings:
            self.known_embeddings = np.array(self.known_embeddings)
        print(f"Loaded {len(self.known_people)} encodings from DB.")
        
    def generate_encoding_from_image(self, image_bytes):
        """Generate embedding from an image (used for registration)"""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None, "Invalid image format"
            
        faces = self.app.get(img)
        if not faces:
            return None, "No face detected"
        if len(faces) > 1:
            return None, "Multiple faces detected, please ensure only one face is in the frame"
            
        emb = faces[0].embedding
        emb = emb / np.linalg.norm(emb)
        return json.dumps(emb.tolist()), None
        
    def process_frame(self, frame_data, threshold=1.45):
        """Process a frame for recognition"""
        # Decode base64 frame (usually data:image/jpeg;base64,...)
        if "," in frame_data:
            frame_data = frame_data.split(",")[1]
            
        # Add padding if necessary
        frame_data += "=" * ((4 - len(frame_data) % 4) % 4)
        try:
            nparr = np.frombuffer(base64.b64decode(frame_data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Error decoding base64: {e}")
            return []
            
        if img is None:
            print("imdecode returned None")
            return []
            
        # Light fix from original code - REMOVED for better natural lighting robustness
        img = cv2.convertScaleAbs(img, alpha=1.2, beta=20)
        
        faces = self.app.get(img)
        results = []
        
        for face in faces:
            box = face.bbox.astype(int).tolist()
            emb = face.embedding
            emb = emb / np.linalg.norm(emb)
            
            name = "Unknown"
            status = "NOT FOUND"
            confidence = 0.0
            person_id = None
            
            roll_number = None
            
            if len(self.known_embeddings) > 0:
                distances = np.linalg.norm(self.known_embeddings - emb, axis=1)
                best_index = np.argmin(distances)
                best_dist = distances[best_index]
                
                # Using 1.1 threshold from original code
                if best_dist < threshold:
                    matched = self.known_people[best_index]
                    name = matched["name"]
                    status = "PRESENT"
                    confidence = float(max(0, 100 - (best_dist * 50))) # Roughly map distance to %
                    person_id = matched["id"]
                    roll_number = matched.get("roll_number")
                    
            results.append({
                "box": box,
                "name": name,
                "status": status,
                "confidence": confidence,
                "person_id": person_id,
                "roll_number": roll_number
            })
            
        return results

# Singleton instance
face_service = FaceRecognitionService()
