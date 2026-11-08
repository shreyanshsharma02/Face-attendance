"""
Face detection (YuNet) and embedding (SFace) service.

Both models ship with opencv-contrib-python — no separate downloads needed.
"""

import base64
import urllib.request
from pathlib import Path

import cv2
import numpy as np

from app.config import settings

_MODEL_DIR = Path(__file__).parent / "models"
_MODEL_DIR.mkdir(exist_ok=True)

_YUNET_PATH = _MODEL_DIR / "face_detection_yunet_2023mar.onnx"
_SFACE_PATH = _MODEL_DIR / "face_recognition_sface_2021dec.onnx"

_YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
_SFACE_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_recognition_sface/face_recognition_sface_2021dec.onnx"
)


def _download_if_missing(path: Path, url: str) -> None:
    if not path.exists():
        print(f"Downloading {path.name} ...")
        urllib.request.urlretrieve(url, path)
        print(f"Saved to {path}")


class FaceService:
    def __init__(self) -> None:
        _download_if_missing(_YUNET_PATH, _YUNET_URL)
        _download_if_missing(_SFACE_PATH, _SFACE_URL)

        self._detector = cv2.FaceDetectorYN.create(
            str(_YUNET_PATH),
            "",
            (320, 320),
            score_threshold=0.85,
            nms_threshold=0.3,
            top_k=1,
        )
        self._recognizer = cv2.FaceRecognizerSF.create(
            str(_SFACE_PATH), ""
        )
        self.yunet_loaded = True
        self.sface_loaded = True

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def decode_image(self, image_b64: str) -> np.ndarray:
        """Decode a base64 image string to a BGR numpy array."""
        data = base64.b64decode(image_b64)
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
        return img

    def detect_face(self, img: np.ndarray) -> tuple:
        """
        Detect the largest face in the image.

        Returns:
            (face_box, landmarks) or (None, None) if no face found.
            face_box shape: (1, 15)  — YuNet output row
            landmarks shape: (5, 2)
        """
        h, w = img.shape[:2]
        self._detector.setInputSize((w, h))
        _, faces = self._detector.detect(img)

        if faces is None or len(faces) == 0:
            return None, None

        # Take the highest-confidence detection
        best = faces[np.argmax(faces[:, 14])]
        landmarks = best[4:14].reshape(5, 2)
        return best[np.newaxis, :], landmarks

    def get_embedding(self, img: np.ndarray, face_box: np.ndarray) -> np.ndarray:
        """Extract a 128-d SFace embedding for the detected face."""
        aligned = self._recognizer.alignCrop(img, face_box[0])
        embedding = self._recognizer.feature(aligned)
        return embedding.flatten()

    def embedding_to_list(self, embedding: np.ndarray) -> list[float]:
        return embedding.tolist()

    def list_to_embedding(self, values: list[float]) -> np.ndarray:
        return np.array(values, dtype=np.float32).reshape(1, -1)

    def match(
        self,
        probe: np.ndarray,
        gallery: np.ndarray,
    ) -> tuple[bool, float]:
        """
        Compare two embeddings using cosine distance.

        Args:
            probe:   shape (128,) or (1, 128)
            gallery: shape (128,) or (1, 128)

        Returns:
            (matched, cosine_distance)
            Lower distance = more similar. Threshold default: 0.363
        """
        p = probe.reshape(1, -1).astype(np.float32)
        g = gallery.reshape(1, -1).astype(np.float32)
        score = self._recognizer.match(p, g, cv2.FaceRecognizerSF_FR_COSINE)
        # cv2 returns similarity (higher = more similar); convert to distance
        distance = float(1.0 - score)
        matched = distance < settings.match_threshold
        return matched, distance


# Singleton — loaded once at startup
face_service = FaceService()
