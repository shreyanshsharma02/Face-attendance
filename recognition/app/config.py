from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_key: str = "change-me-in-production"
    match_threshold: float = 0.363  # SFace cosine distance threshold
    liveness_blink_frames: int = 20  # frames to observe for blink
    max_image_bytes: int = 5 * 1024 * 1024  # 5 MB

    model_config = {"env_file": ".env", "env_prefix": "RECOG_"}


settings = Settings()
