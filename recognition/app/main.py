"""
FastAPI recognition service.

Endpoints
---------
GET  /health                     — liveness probe
POST /enroll                     — extract and return face embedding
POST /recognize                  — match probe image against stored embeddings
POST /recognize/liveness         — recognize + blink liveness check (multi-frame)

All mutating endpoints require the X-API-Key header matching RECOG_API_KEY.
"""

from __future__ import annotations

import base64
from typing import Annotated, Optional

import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.face_service import face_service
from app.liveness import check_blink
from app.models import (
    EnrollRequest,
    EnrollResponse,
    HealthResponse,
    RecognizeRequest,
    RecognizeResponse,
)

app = FastAPI(title="Face Recognition Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

def require_api_key(x_api_key: Annotated[Optional[str], Header()] = None) -> None:
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


AuthDep = Annotated[None, Depends(require_api_key)]


# ---------------------------------------------------------------------------
# Request size guard
# ---------------------------------------------------------------------------

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.max_image_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Request body too large",
        )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        yunet_loaded=face_service.yunet_loaded,
        sface_loaded=face_service.sface_loaded,
    )


@app.post("/enroll", response_model=EnrollResponse, dependencies=[Depends(require_api_key)])
def enroll(req: EnrollRequest) -> EnrollResponse:
    """
    Extract a face embedding from the supplied image.

    The caller (Spring Boot) is responsible for storing the returned
    embedding alongside the employee record. Raw images are never stored here.
    """
    try:
        img = face_service.decode_image(req.image_b64)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    face_box, _ = face_service.detect_face(img)
    if face_box is None:
        raise HTTPException(status_code=422, detail="No face detected in image")

    embedding = face_service.get_embedding(img, face_box)
    return EnrollResponse(
        employee_id=req.employee_id,
        embedding=face_service.embedding_to_list(embedding),
    )


class RecognizeWithGalleryRequest(RecognizeRequest):
    """Probe image + gallery of known embeddings from the backend."""
    gallery: dict[str, list[float]]  # {employee_id: embedding}
    require_liveness: bool = False


@app.post("/recognize", response_model=RecognizeResponse, dependencies=[Depends(require_api_key)])
def recognize(req: RecognizeWithGalleryRequest) -> RecognizeResponse:
    """
    Match the probe image against the supplied gallery.

    The Spring Boot backend sends all active employee embeddings so that
    this service never needs its own database. Matching happens in memory.
    """
    if not req.gallery:
        raise HTTPException(status_code=400, detail="Gallery is empty")

    try:
        img = face_service.decode_image(req.image_b64)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    face_box, _ = face_service.detect_face(img)
    if face_box is None:
        return RecognizeResponse(matched=False, liveness_passed=False)

    probe_embedding = face_service.get_embedding(img, face_box)

    best_id: str | None = None
    best_distance = float("inf")

    for employee_id, emb_list in req.gallery.items():
        gallery_embedding = face_service.list_to_embedding(emb_list)
        matched, distance = face_service.match(probe_embedding, gallery_embedding)
        if matched and distance < best_distance:
            best_distance = distance
            best_id = employee_id

    return RecognizeResponse(
        matched=best_id is not None,
        employee_id=best_id,
        distance=round(best_distance, 4) if best_id else None,
        liveness_passed=True,
    )


class LivenessRecognizeRequest(RecognizeRequest):
    """Multi-frame request for blink liveness + recognition."""
    frames_b64: list[str]  # sequence of base64 frames for liveness
    gallery: dict[str, list[float]]


@app.post(
    "/recognize/liveness",
    response_model=RecognizeResponse,
    dependencies=[Depends(require_api_key)],
)
def recognize_with_liveness(req: LivenessRecognizeRequest) -> RecognizeResponse:
    """
    1. Check blink liveness across the supplied frame sequence.
    2. Run recognition on the primary image (image_b64).
    """
    if not req.gallery:
        raise HTTPException(status_code=400, detail="Gallery is empty")

    # --- Liveness check ---
    landmark_sequence: list[np.ndarray] = []
    for frame_b64 in req.frames_b64:
        try:
            frame = face_service.decode_image(frame_b64)
        except ValueError:
            continue
        _, landmarks = face_service.detect_face(frame)
        if landmarks is not None:
            landmark_sequence.append(landmarks)

    liveness_passed = check_blink(landmark_sequence)

    if not liveness_passed:
        return RecognizeResponse(matched=False, liveness_passed=False)

    # --- Recognition on primary frame ---
    try:
        img = face_service.decode_image(req.image_b64)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    face_box, _ = face_service.detect_face(img)
    if face_box is None:
        return RecognizeResponse(matched=False, liveness_passed=True)

    probe_embedding = face_service.get_embedding(img, face_box)

    best_id: str | None = None
    best_distance = float("inf")

    for employee_id, emb_list in req.gallery.items():
        gallery_embedding = face_service.list_to_embedding(emb_list)
        matched, distance = face_service.match(probe_embedding, gallery_embedding)
        if matched and distance < best_distance:
            best_distance = distance
            best_id = employee_id

    return RecognizeResponse(
        matched=best_id is not None,
        employee_id=best_id,
        distance=round(best_distance, 4) if best_id else None,
        liveness_passed=True,
    )
