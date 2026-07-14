import { Navigate } from 'react-router-dom'
import { hasValidPassedSession } from '@/lib/system-checks/session'

export default function ChecksGate({ children }: { children: React.ReactNode }) {
  if (!hasValidPassedSession()) {
    return <Navigate to="/system-checks" replace />
  }
  return children
}
