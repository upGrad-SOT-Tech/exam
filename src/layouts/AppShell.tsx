import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  History,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/exams', label: 'Exams', icon: ClipboardList },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/system-check', label: 'System check', icon: ShieldCheck },
]

function navClass({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return 'flex items-center gap-3 rounded-2xl bg-[#df2428] px-3.5 py-2.5 text-sm font-semibold text-white shadow-soft transition [&>svg]:text-white'
  }
  return 'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white hover:text-[#0f1115] [&>svg]:text-gray-700'
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const displayName = user?.fullName || user?.name || 'Student'

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'ST'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }, [displayName])

  const closeMobile = () => setMobileOpen(false)

  const sideNav = (
    <>
      <div className="px-4 pt-5">
        <img src="/assets/upgradsot_logo_small.png" alt="upGrad" className="h-8 w-auto" />
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          Secure exam runtime
        </p>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/home'} className={navClass} onClick={closeMobile}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-black/5 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#df2428] text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#0f1115]">{displayName}</p>
            <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => navigate('/login', { replace: true }))
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-[#0f1115] transition hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f6f4f2] text-[#0f1115]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-black/5 bg-[#f0eeeb] lg:flex">
          {sideNav}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/35"
              onClick={closeMobile}
            />
            <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-[#f6f4f2] shadow-xl">
              <div className="flex items-center justify-between px-4 pt-4">
                <span className="text-sm font-bold text-[#0f1115]">Menu</span>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-[#0f1115]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {sideNav}
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-black/5 bg-[#f6f4f2]/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-gray-200 bg-white p-2 text-[#0f1115]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src="/assets/upgradsot_logo_small.png" alt="upGrad" className="h-7" />
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#df2428] text-xs font-bold text-white">
              {initials}
            </div>
          </header>

          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>

          <footer className="px-4 pb-6 text-center text-[11px] text-gray-400 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} upGrad School of Technology · Secure exam runtime v3.2
          </footer>
        </div>
      </div>
    </div>
  )
}
