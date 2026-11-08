import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/Button'
import { clsx } from 'clsx'
import { ScanFace } from 'lucide-react'

const navLinks = [
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/employees', label: 'Employees' },
]

export function Layout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800 bg-slate-900 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"><ScanFace className="h-5 w-5 text-teal-400" />FaceTrack</span>
            <nav className="hidden gap-1 sm:flex">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-slate-800 text-teal-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
