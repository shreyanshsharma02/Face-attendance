import { useState, useEffect, useRef, FormEvent } from 'react'
import {
  listEmployees,
  createEmployee,
  setEmployeeActive,
  enrollFace,
  saveEmbedding,
  Employee,
} from '../api/employees'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { UserPlus, Camera } from 'lucide-react'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Register form
  const [showForm, setShowForm] = useState(false)
  const [empCode, setEmpCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Enroll state
  const [enrollingId, setEnrollingId] = useState<number | null>(null)
  const [enrollStatus, setEnrollStatus] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function load() {
    setLoading(true)
    try {
      setEmployees(await listEmployees())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const emp = await createEmployee({ employeeCode: empCode.trim(), fullName: fullName.trim() })
      setEmployees(prev => [...prev, emp])
      setShowForm(false)
      setEmpCode('')
      setFullName('')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to register')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(emp: Employee) {
    try {
      const updated = await setEmployeeActive(emp.id, !emp.active)
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch {
      alert('Failed to update employee status.')
    }
  }

  async function startEnroll(emp: Employee) {
    setEnrollingId(emp.id)
    setEnrollStatus('Opening camera…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setEnrollStatus('Position your face and click Capture.')
    } catch {
      setEnrollStatus('Camera access denied.')
      setEnrollingId(null)
    }
  }

  async function captureAndEnroll(emp: Employee) {
    if (!videoRef.current) return
    setEnrollStatus('Processing…')

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const image_b64 = dataUrl.split(',')[1]

    stopStream()

    try {
      const result = await enrollFace({ employee_id: emp.employeeCode, image_b64 })
      await saveEmbedding(emp.id, result.embedding)
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, faceEnrolled: true } : e))
      setEnrollStatus('Face enrolled successfully!')
    } catch (err: unknown) {
      setEnrollStatus(err instanceof Error ? err.message : 'Enrollment failed.')
    } finally {
      setTimeout(() => { setEnrollingId(null); setEnrollStatus('') }, 2500)
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function cancelEnroll() {
    stopStream()
    setEnrollingId(null)
    setEnrollStatus('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <Button onClick={() => setShowForm(v => !v)}>
          <UserPlus className="h-4 w-4" />
          Register Employee
        </Button>
      </div>

      {/* Register form */}
      {showForm && (
        <Card>
          <CardHeader><p className="font-medium">New Employee</p></CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="flex flex-wrap gap-4">
              <Input
                label="Employee ID"
                value={empCode}
                onChange={e => setEmpCode(e.target.value)}
                placeholder="EMP001"
                required
              />
              <Input
                label="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="flex-1"
              />
              {formError && <p className="w-full text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={saving}>Save</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Enroll camera modal */}
      {enrollingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-sm p-4">
            <CardContent>
              <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
              <p className="mt-3 text-center text-sm text-slate-600">{enrollStatus}</p>
              <div className="mt-4 flex gap-2">
                {streamRef.current && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const emp = employees.find(e => e.id === enrollingId)
                      if (emp) captureAndEnroll(emp)
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Capture
                  </Button>
                )}
                <Button variant="secondary" className="flex-1" onClick={cancelEnroll}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="px-6 py-10 text-center text-sm text-red-600">{error}</p>
          ) : employees.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">No employees yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {['Employee ID', 'Name', 'Face', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono">{emp.employeeCode}</td>
                    <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.faceEnrolled ? 'success' : 'warning'}>
                        {emp.faceEnrolled ? 'Enrolled' : 'Not enrolled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.active ? 'success' : 'neutral'}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startEnroll(emp)}
                          disabled={enrollingId !== null}
                        >
                          <Camera className="h-3 w-3" />
                          Enroll
                        </Button>
                        <Button
                          variant={emp.active ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleActive(emp)}
                        >
                          {emp.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
