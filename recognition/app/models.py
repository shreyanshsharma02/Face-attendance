from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class EnrollRequest(BaseModel):
    employee_id: str
    image_b64: str


class RecognizeRequest(BaseModel):
    image_b64: str


class EnrollResponse(BaseModel):
    employee_id: str
    embedding: list[float]


class RecognizeResponse(BaseModel):
    matched: bool
    employee_id: Optional[str] = None
    distance: Optional[float] = None
    liveness_passed: bool = False


class HealthResponse(BaseModel):
    status: str
    yunet_loaded: bool
    sface_loaded: bool
