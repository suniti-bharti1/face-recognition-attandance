from flask import Flask, render_template, jsonify
import cv2
import numpy as np
import threading
import time
from datetime import datetime
import csv
import os
import insightface
from train_model import load_encodings

print("APP STARTED")

app = Flask(__name__)

camera = None
is_camera_running = False
known_face_encodings = []
known_face_names = []
attendance_data = []
latest_detection = {"name": "", "status": ""}

# 🔥 Load InsightFace
face_app = insightface.app.FaceAnalysis()
face_app.prepare(ctx_id=0, det_size=(320, 320))

# 🔧 performance tuning
FRAME_SKIP = 4        # higher = less CPU
frame_count = 0
last_name = ""
stable_count = 0


# ---------------- LOAD DATA ----------------
def load_face_data():
    global known_face_encodings, known_face_names
    print("Loading dataset...")
    known_face_encodings, known_face_names = load_encodings()
    print(f"Loaded {len(known_face_names)} faces")


load_face_data()


# ---------------- ROUTES ----------------
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/start_camera', methods=['POST'])
def start_camera():
    global camera, is_camera_running

    if not is_camera_running:
        camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)

        if not camera.isOpened():
            return jsonify({'status': 'Camera not opening'})

        is_camera_running = True
        threading.Thread(target=camera_thread, daemon=True).start()

    return jsonify({'status': 'Camera started'})


@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    global camera, is_camera_running

    is_camera_running = False

    if camera:
        camera.release()
        camera = None

    return jsonify({'status': 'Camera stopped'})


@app.route('/get_status')
def get_status():
    return jsonify(latest_detection)


@app.route('/get_attendance')
def get_attendance():
    return jsonify(attendance_data)


# ---------------- CAMERA THREAD ----------------
def camera_thread():
    global latest_detection, frame_count, last_name, stable_count

    while is_camera_running:
        ret, frame = camera.read()
        if not ret:
            continue

        frame_count += 1

        # 🔥 skip frames → prevents hanging
        if frame_count % FRAME_SKIP != 0:
            continue

        frame = cv2.convertScaleAbs(frame, alpha=1.2, beta=20)

        faces = face_app.get(frame)

        for face in faces:
            embedding = face.embedding
            embedding = embedding / np.linalg.norm(embedding)

            name = "User Not Found"

            if len(known_face_encodings) > 0:
                distances = np.linalg.norm(known_face_encodings - embedding, axis=1)
                best_index = np.argmin(distances)

                # 🔥 threshold tuned
                if distances[best_index] < 1.5:
                    name = known_face_names[best_index]

            # 🔥 stability (avoid flicker)
            if name == last_name:
                stable_count += 1
            else:
                stable_count = 0
                last_name = name

            if stable_count >= 2:
                if name == "User Not Found":
                    latest_detection = {"name": "", "status": "User Not Found"}
                else:
                    latest_detection = {"name": name, "status": "Student Identified"}
                    mark_attendance(name)

        time.sleep(0.03)  # 🔥 reduces CPU


# ---------------- ATTENDANCE ----------------
def mark_attendance(name):
    today = datetime.now().strftime('%Y-%m-%d')

    if any(r['name'] == name and r['date'] == today for r in attendance_data):
        return

    now = datetime.now()

    record = {
        "name": name,
        "date": today,
        "time": now.strftime('%H:%M:%S')
    }

    attendance_data.append(record)

    file_exists = os.path.isfile("attendance.csv")

    with open("attendance.csv", "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "date", "time"])

        if not file_exists:
            writer.writeheader()

        writer.writerow(record)


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=False)