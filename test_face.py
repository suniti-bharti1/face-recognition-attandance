import cv2
import insightface
import os
import numpy as np
import time
import re
import csv
from datetime import datetime

print("Starting program...")

# 🔥 Enrollment mapping
ENROLLMENT_MAP = {
    "Suniti": "230225",
    "Senorita": "230216",
    "Saumya": "230215"
}

# 🔥 LOAD MODEL (FAST VERSION)
app = insightface.app.FaceAnalysis()
app.prepare(ctx_id=0, det_size=(320, 320))   # ✅ faster

print("Model loaded")

# 📂 LOAD DATASET
dataset_path = "dataset"
known_embeddings = []
known_names = []

for file in os.listdir(dataset_path):
    if file.lower().endswith((".jpg", ".jpeg", ".png")):
        path = os.path.join(dataset_path, file)
        img = cv2.imread(path)

        if img is None:
            continue

        faces = app.get(img)

        if len(faces) > 0:
            emb = faces[0].embedding
            emb = emb / np.linalg.norm(emb)

            # 🔥 CLEAN NAME
            raw = file.split('.')[0].lower()
            name = re.sub(r'\d+', '', raw).capitalize()

            known_embeddings.append(emb)
            known_names.append(name)

            print("Loaded:", name)

known_embeddings = np.array(known_embeddings)

# 📁 ATTENDANCE FILE
ATTENDANCE_FILE = "attendance.csv"
marked_today = set()

def mark_attendance(name):
    today = datetime.now().strftime("%Y-%m-%d")
    time_now = datetime.now().strftime("%H:%M:%S")

    key = f"{name}_{today}"
    if key in marked_today:
        return

    marked_today.add(key)

    enrollment = ENROLLMENT_MAP.get(name, "Unknown")

    file_exists = os.path.isfile(ATTENDANCE_FILE)

    with open(ATTENDANCE_FILE, "a", newline="") as f:
        writer = csv.writer(f)

        if not file_exists:
            writer.writerow(["Enrollment", "Name", "Date", "Time", "Status"])

        writer.writerow([enrollment, name, today, time_now, "Present"])

    print("✅ Marked:", name)

# 🎥 CAMERA
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cap.isOpened():
    print("❌ Camera not opening")
    exit()

cv2.namedWindow("Face Recognition", cv2.WINDOW_NORMAL)

# 🔥 PERFORMANCE SETTINGS
frame_skip = 5
frame_count = 0

while True:
    ret, frame = cap.read()

    if not ret or frame is None:
        continue

    frame_count += 1

    # 🔥 SKIP FRAMES (FASTER)
    if frame_count % frame_skip != 0:
        cv2.imshow("Face Recognition", frame)
        if cv2.waitKey(1) & 0xFF == 27:
            break
        continue

    # 🔆 LIGHT FIX
    frame = cv2.convertScaleAbs(frame, alpha=1.2, beta=20)

    faces = app.get(frame)

    name = "User Not Found"

    if len(faces) > 0:
        face = faces[0]
        emb = face.embedding
        emb = emb / np.linalg.norm(emb)

        distances = np.linalg.norm(known_embeddings - emb, axis=1)
        best_index = np.argmin(distances)

        print("Distance:", distances[best_index])

        # 🔥 FIXED THRESHOLD
        if distances[best_index] < 1.1:
            name = known_names[best_index]

    # 🟩 DRAW RESULT
    if len(faces) > 0:
        box = faces[0].bbox.astype(int)

        cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0,255,0), 2)

        cv2.putText(frame, name, (box[0], box[1]-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

        # ✅ MARK ATTENDANCE
        if name != "User Not Found":
            mark_attendance(name)

    cv2.imshow("Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

    time.sleep(0.005)

cap.release()
cv2.destroyAllWindows()

print("Program ended")