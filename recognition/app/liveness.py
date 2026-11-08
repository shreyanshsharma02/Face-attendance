"""
Blink-based liveness detection using Eye Aspect Ratio (EAR).

EAR drops sharply when the eye closes. A blink is detected when EAR
falls below the threshold and then recovers. We require at least one
blink within the observed landmark sequence to pass liveness.
"""

import numpy as np

# YuNet returns 5 landmarks: right_eye, left_eye, nose, right_mouth, left_mouth
# Indices: 0=right_eye, 1=left_eye
_RIGHT_EYE_IDX = 0
_LEFT_EYE_IDX = 1

# EAR threshold below which an eye is considered closed
_EAR_CLOSED = 0.20


def _ear_from_single_point(eye_center: np.ndarray) -> float:
    """
    YuNet provides only one point per eye, not the full 6-point contour
    needed for the classic EAR formula. We approximate by comparing the
    vertical distance between consecutive frames using the eye landmark
    position relative to the face bounding box height.

    This function exists as a placeholder; real EAR requires a model
    that returns full eye contour landmarks (e.g. MediaPipe, dlib 68-pt).
    """
    return 1.0  # always open — real implementation below uses motion


def check_blink(landmark_sequence: list[np.ndarray]) -> bool:
    """
    Detect a blink from a sequence of 5-point landmark arrays.

    Strategy: track the vertical position of each eye landmark across
    frames. A rapid downward then upward motion indicates a blink.

    Args:
        landmark_sequence: list of arrays shape (5, 2), one per frame.

    Returns:
        True if at least one blink was detected.
    """
    if len(landmark_sequence) < 4:
        return False

    right_y = np.array([lm[_RIGHT_EYE_IDX][1] for lm in landmark_sequence])
    left_y = np.array([lm[_LEFT_EYE_IDX][1] for lm in landmark_sequence])

    def _has_blink(y_series: np.ndarray) -> bool:
        # Normalise to [0, 1] to be scale-independent
        rng = y_series.max() - y_series.min()
        if rng < 1e-6:
            return False
        norm = (y_series - y_series.min()) / rng
        diff = np.diff(norm)
        # Look for a drop followed by a rise within a short window
        for i in range(len(diff) - 1):
            if diff[i] > 0.15 and diff[i + 1] < -0.10:
                return True
        return False

    return _has_blink(right_y) or _has_blink(left_y)
