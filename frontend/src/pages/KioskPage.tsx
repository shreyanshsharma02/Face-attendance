import { useRef, useState, useEffect, useCallback } from 'react'
import { getEmbeddingGallery, recognizeWithLiveness, markAttendance } from '../api/attendance'
import { GalleryEntry } from '../api/attendance'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

type KioskState =
  | 'idle'
  | 'camera'
  | 'liveness'
  | 'processing'
  | 'success'
  | 'unknown'
  | 'duplicate'
  | 'error'

const LIVENESS_FRAME_COUNT = 15
const RESET_DELAY_MS = 5000

function formatTime(utcIso: string) {
  return new Date(utcIso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [state, setState] = useState<KioskState>('idle')
  const [message, setMessage] = useState('')
  const [subMessage, setSubMessage] = useState('')
  const [livenessFrames, setLivenessFrames] = useState<string[]>([])
  const [gallery, setGallery] = useState<GalleryEntry>({})

  // Load gallery on mount
  useEffect(() => {
    getEmbeddingGallery()
      .then(setGallery)
      .catch(() => setGallery({}))
  }, [])

  const stopStream = useCallback(() => {
    if (frameTimerRef.current) clearInterval(frameTimerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  function captureFrame(): string {
    const video = videoRef.current!
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  }

  async function startCamera() {
    setState('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setState('error')
      setMessage('Camera access denied')
      setSubMessage('Please allow camera access and try again.')
    }
  }

  async function startLiveness() {
    setState('liveness')
    setSubMessage('Please blink slowly…')
    const frames: string[] = []
    setLivenessFrames([])

    frameTimerRef.current = setInterval(() => {
      if (!videoRef.current) return
      frames.push(captureFrame())
      setLivenessFrames([...frames])
      if (frames.length >= LIVENESS_FRAME_COUNT) {
        clearInterval(frameTimerRef.current!)
        processRecognition(frames)
      }
    }, 120)
  }

  async function processRecognition(frames: string[]) {
    setState('processing')
    setSubMessage('Identifying…')
    stopStream()

    const primaryFrame = frames[Math.floor(frames.length / 2)]

    try {
      if (Object.keys(gallery).length === 0) {
        setState('error')
        setMessage('No employees enrolled yet')
        setSubMessage('Please enroll employees from the admin dashboard first.')
        scheduleReset()
        return
      }

      const result = await recognizeWithLiveness(primaryFrame, frames, gallery)

      if (!result.liveness_passed) {
        setState('unknown')
        setMessage('Liveness check failed')
        setSubMessage('Please blink clearly and try again.')
        scheduleReset()
        return
      }

      // result.employee_id is the numeric DB id (gallery key)
      const numericId = result.employee_id ? Number(result.employee_id) : NaN
      if (!result.matched || !result.employee_id || isNaN(numericId)) {
        setState('unknown')
        setMessage('Face not recognized')
        setSubMessage('Please try again or contact your administrator.')
        scheduleReset()
        return
      }

      // Mark attendance via backend using the numeric employee id
      // The gallery key is the employeeCode; we need the backend to accept it
      const record = await markAttendance(numericId)
      setState('success')
      setMessage(`Welcome, ${record.employeeName}!`)
      setSubMessage(`Attendance marked at ${formatTime(record.checkInAt)}`)
      scheduleReset()
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      if (e?.status === 409) {
        setState('duplicate')
        setMessage('Already marked today')
        setSubMessage('Your attendance has already been recorded for today.')
      } else {
        setState('error')
        setMessage('Something went wrong')
        setSubMessage(e?.message ?? 'Please try again.')
      }
      scheduleReset()
    }
  }

  function scheduleReset() {
    setTimeout(() => {
      setState('idle')
      setMessage('')
      setSubMessage('')
      setLivenessFrames([])
    }, RESET_DELAY_MS)
  }

  function handleReset() {
    stopStream()
    setState('idle')
    setMessage('')
    setSubMessage('')
    setLivenessFrames([])
  }

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [stopStream])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-white">FaceTrack</h1>
        <p className="mt-1 text-sm text-slate-400">Employee Attendance Kiosk</p>
      </div>

      <Card className="w-full max-w-sm bg-slate-800 border-slate-700">
        <CardContent className="flex flex-col items-center gap-4 py-6">

          {/* Camera preview */}
          <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              style={{ display: state === 'camera' || state === 'liveness' ? 'block' : 'none' }}
            />

            {/* Liveness progress overlay */}
            {state === 'liveness' && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <div className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {livenessFrames.length}/{LIVENESS_FRAME_COUNT} frames
                </div>
              </div>
            )}

            {/* Idle placeholder */}
            {(state === 'idle' || state === 'processing') && (
              <div className="flex h-full items-center justify-center">
                <Camera className="h-16 w-16 text-slate-600" />
              </div>
            )}

            {/* Result icon */}
            {state === 'success' && (
              <div className="flex h-full items-center justify-center">
                <CheckCircle className="h-24 w-24 text-green-400" />
              </div>
            )}
            {(state === 'unknown' || state === 'error') && (
              <div className="flex h-full items-center justify-center">
                <XCircle className="h-24 w-24 text-red-400" />
              </div>
            )}
            {state === 'duplicate' && (
              <div className="flex h-full items-center justify-center">
                <AlertCircle className="h-24 w-24 text-yellow-400" />
              </div>
            )}
          </div>

          {/* Status text */}
          {message && (
            <div className="text-center">
              <p className={`text-lg font-semibold ${
                state === 'success' ? 'text-green-400' :
                state === 'duplicate' ? 'text-yellow-400' :
                state === 'error' || state === 'unknown' ? 'text-red-400' :
                'text-white'
              }`}>{message}</p>
              {subMessage && <p className="mt-1 text-sm text-slate-400">{subMessage}</p>}
            </div>
          )}

          {/* Action buttons */}
          {state === 'idle' && (
            <Button size="lg" className="w-full" onClick={startCamera}>
              <Camera className="h-5 w-5" />
              Start Attendance
            </Button>
          )}

          {state === 'camera' && (
            <div className="flex w-full gap-2">
              <Button size="lg" className="flex-1" onClick={startLiveness}>
                Scan Face
              </Button>
              <Button size="md" variant="secondary" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          )}

          {state === 'processing' && (
            <Button size="lg" className="w-full" loading disabled>
              Processing…
            </Button>
          )}

          {(state === 'success' || state === 'unknown' || state === 'duplicate' || state === 'error') && (
            <p className="text-xs text-slate-500">Resetting automatically…</p>
          )}

        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-slate-600">
        Look directly at the camera and blink when prompted.
      </p>
    </div>
  )
}
