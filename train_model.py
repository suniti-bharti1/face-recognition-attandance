import insightface
import os
import cv2
import numpy as np
import re

DATASET_PATH = "dataset"

app = insightface.app.FaceAnalysis()
app.prepare(ctx_id=0, det_size=(320, 320))


def load_encodings():
    encodings = []
    names = []

    print("🔄 Loading dataset...")

    for filename in os.listdir(DATASET_PATH):
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            path = os.path.join(DATASET_PATH, filename)
            image = cv2.imread(path)

            if image is None:
                print(f"❌ Cannot read {filename}")
                continue

            faces = app.get(image)

            if len(faces) > 0:
                emb = faces[0].embedding
                emb = emb / np.linalg.norm(emb)

                # 🔥 CLEAN NAME (suniti1 → Suniti)
                raw = filename.split('.')[0].lower()
                clean = re.sub(r'\d+', '', raw).strip()
                name = clean.capitalize()

                encodings.append(emb)
                names.append(name)

                print(f"✅ Loaded: {name}")
            else:
                print(f"❌ No face in {filename}")

    return np.array(encodings), names