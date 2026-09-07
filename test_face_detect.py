import base64
import cv2
import sys
import os

# Add backend directory to sys.path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from services.face_recognition import face_service

# Load image and convert to base64 string like the frontend does
img_path = r"dataset/Suniti.jpeg"
with open(img_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
    
# Process the frame
print("Testing with det_size=(320, 320)...")
results = face_service.process_frame(encoded_string)
print(f"Results: {results}")

# Let's also try with det_size=(640, 640)
print("Setting det_size=(640, 640)...")
face_service.app.prepare(ctx_id=0, det_size=(640, 640))
results_640 = face_service.process_frame(encoded_string)
print(f"Results 640: {results_640}")

