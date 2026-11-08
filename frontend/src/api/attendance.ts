import { apiFetch, recognitionFetch } from './client'

export interface AttendanceRecord {
  id: number
  employeeId: number
  employeeCode: string
  employeeName: string
  attendanceDate: string
  checkInAt: string
  late: boolean
  minutesLate: number
}

export interface RecognizeResponse {
  matched: boolean
  employee_id: string | null
  distance: number | null
  liveness_passed: boolean
}

export interface GalleryEntry {
  [employeeId: string]: number[]
}

export function listAttendance(date?: string): Promise<AttendanceRecord[]> {
  const query = date ? `?date=${date}` : ''
  return apiFetch(`/api/attendance${query}`)
}

export function markAttendance(employeeId: number): Promise<AttendanceRecord> {
  return apiFetch('/api/internal/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ employeeId }),
  })
}

export function recognizeFace(
  image_b64: string,
  gallery: GalleryEntry,
): Promise<RecognizeResponse> {
  return recognitionFetch('/recognize', { image_b64, gallery })
}

export function recognizeWithLiveness(
  image_b64: string,
  frames_b64: string[],
  gallery: GalleryEntry,
): Promise<RecognizeResponse> {
  return recognitionFetch('/recognize/liveness', { image_b64, frames_b64, gallery })
}

export function getEmbeddingGallery(): Promise<GalleryEntry> {
  return apiFetch('/api/employees/embeddings')
}

export async function exportAttendanceCsv(date?: string): Promise<void> {
  const query = date ? `?date=${date}` : ''
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? ''}/api/attendance/export${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`)

  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance${date ? `-${date}` : ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
