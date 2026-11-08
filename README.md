# FaceTrack

Face-recognition attendance for small teams. Employees walk up to a kiosk, look at the camera, and are checked in. Admins manage employees, review daily attendance, spot late arrivals and export CSV reports.

## What it does

- **Kiosk** – live camera, face detection and recognition, with an optional blink-based liveness check (eye aspect ratio) to defeat static photos.
- **Admin dashboard** – attendance by date, search, pagination, present / late counts.
- **Late flags** – check-ins after the configured start time (plus a grace period) are shown as "Late by N min".
- **CSV export** – authenticated download of any day (or all records) with `on_time` / `late` status. Cells that start with `= + - @` are neutralised against spreadsheet formula injection.
- **Employee management** – add employees, activate / deactivate them and enrol faces from the camera.

## Architecture

```
frontend (React + Vite + Tailwind)  ──►  backend (Spring Boot 3, Java 21, PostgreSQL)
        │
        └──────────────────────────────►  recognition (FastAPI + OpenCV, YuNet + SFace ONNX models)
```

| Folder | Stack | Role |
| --- | --- | --- |
| `frontend/` | React 18, TypeScript, Tailwind | Kiosk and admin UI |
| `backend/` | Spring Boot, JPA, JWT | Employees, attendance, auth, CSV export |
| `recognition/` | FastAPI, OpenCV | Face detection, embedding, matching, liveness |

## Running locally

**Backend** (needs Java 21 and PostgreSQL)

```bash
cd backend
export DATABASE_URL=jdbc:postgresql://localhost:5432/attendance_db
export DATABASE_USERNAME=attendance_user DATABASE_PASSWORD=<your-password>
export JWT_SECRET=<random string, 32+ chars>
export ADMIN_SEED_PASSWORD=<admin password>
# Hibernate is set to `validate`; on the very first run let it create the tables:
export SPRING_JPA_HIBERNATE_DDL_AUTO=update
./mvnw spring-boot:run
```

**Recognition service**

```bash
cd recognition
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001
```

**Frontend**

```bash
cd frontend
cp .env.example .env     # then set VITE_RECOG_API_KEY
npm install
npm run dev
```

Kiosk is at `/`, admin login at `/admin/login`.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `WORK_START` | `09:30` | Official start time (local timezone) |
| `LATE_GRACE_MINUTES` | `10` | Minutes after start that still count as on time |
| `JWT_SECRET` | placeholder | **Set this in production** |
| `ADMIN_SEED_USERNAME` / `ADMIN_SEED_PASSWORD` | `admin` / placeholder | **Change before deploying** |
| `CORS_ALLOWED_ORIGINS` | localhost dev origins | Comma-separated list |

Timezone is `Asia/Kolkata` (`app.timezone` in `application.yml`).

## API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | – | Returns a JWT |
| GET | `/api/attendance?date=YYYY-MM-DD` | admin | Includes `late` and `minutesLate` |
| GET | `/api/attendance/export?date=YYYY-MM-DD` | admin | CSV download |
| POST | `/api/internal/attendance/mark` | – | Called by the kiosk |
| GET | `/api/employees/embeddings` | – | Face gallery for the kiosk |

## Known limitations

- The kiosk endpoints (`/api/internal/attendance/mark`, `/api/employees/embeddings`) are unauthenticated, so anyone who can reach the backend can read face embeddings or mark attendance. Put the backend behind a private network or add a kiosk token before using this with real people.
- `VITE_RECOG_API_KEY` is bundled into the frontend, so it is not a real secret.
- No SQL migrations yet; schema creation relies on Hibernate.
