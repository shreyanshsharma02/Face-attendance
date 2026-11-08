import { useState, useEffect, FormEvent } from 'react'
import {
  listAttendance,
  exportAttendanceCsv,
  AttendanceRecord,
} from '../api/attendance'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Download, Search } from 'lucide-react'

const PAGE_SIZE = 20

function formatLocalTime(utcIso: string): string {
  return new Date(utcIso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  async function load(d: string) {
    setLoading(true)
    setError('')
    setPage(1)
    try {
      const data = await listAttendance(d || undefined)
      setRecords(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [date])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  const filtered = records.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.employeeCode.toLowerCase().includes(q) || r.employeeName.toLowerCase().includes(q)
  })

  const lateCount = records.filter(r => r.late).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <Button variant="secondary" size="sm" onClick={() => exportAttendanceCsv(date || undefined).catch(e => setError(e.message))}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Present</p>
            <p className="mt-1 text-3xl font-bold text-teal-600">{records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Late arrivals</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">{lateCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Showing date</p>
            <p className="mt-1 text-xl font-semibold">{date || 'All'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 py-3">
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-40"
          />
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <Input
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" size="md">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">{filtered.length} records</p>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="px-6 py-10 text-center text-sm text-red-600">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">No records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {['#', 'Employee ID', 'Name', 'Date', 'Check-in (IST)', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-mono">{r.employeeCode}</td>
                    <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                    <td className="px-4 py-3">{r.attendanceDate}</td>
                    <td className="px-4 py-3">{formatLocalTime(r.checkInAt)}</td>
                    <td className="px-4 py-3">
                      {r.late
                        ? <Badge variant="warning">Late by {r.minutesLate} min</Badge>
                        : <Badge variant="success">On time</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
