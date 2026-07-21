import { Navigate, Route, Routes } from 'react-router-dom'
import ChecksGate from '@/components/system-checks/ChecksGate'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/layouts/AppShell'
import { useDeepLinkLaunch } from '@/lib/deep-link/useDeepLinkLaunch'
import DashboardPage from '@/pages/DashboardPage'
import ExamPlayerPage from '@/pages/ExamPlayerPage'
import ExamsPage from '@/pages/ExamsPage'
import HistoryPage from '@/pages/HistoryPage'
import LoginPage from '@/pages/LoginPage'
import PreExamPage from '@/pages/PreExamPage'
import ProfilePage from '@/pages/ProfilePage'
import SystemChecksPage from '@/pages/SystemChecksPage'

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas font-sans text-sm text-gray-600">
        Loading…
      </div>
    )
  }
  if (status === 'authenticated') return <Navigate to="/home" replace />
  return children
}

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas font-sans text-sm text-gray-600">
        Loading…
      </div>
    )
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  // Listens for the LMS handoff (upgradexam://launch) for the whole life of the app, so a student
  // can click their exam in the LMS whether this app is already open or cold.
  useDeepLinkLaunch()

  return (
    <Routes>
      <Route path="/system-checks" element={<SystemChecksPage mode="gate" />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <ChecksGate>
              <LoginPage />
            </ChecksGate>
          </GuestOnly>
        }
      />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/home" element={<DashboardPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/system-check" element={<SystemChecksPage mode="app" />} />
      </Route>
      <Route
        path="/exams/:examId/start"
        element={
          <Protected>
            <PreExamPage />
          </Protected>
        }
      />
      <Route
        path="/exams/:examId/take"
        element={
          <Protected>
            <ExamPlayerPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/system-checks" replace />} />
    </Routes>
  )
}
