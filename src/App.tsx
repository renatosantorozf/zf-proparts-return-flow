import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import LoginPage from '@/pages/LoginPage'
import KanbanPage from '@/pages/KanbanPage'
import PedidosPage from '@/pages/PedidosPage'
import TicketPage from '@/pages/TicketPage'
import PlaybookPage from '@/pages/PlaybookPage'
import ConfigPage from '@/pages/ConfigPage'
import Layout from '@/components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zf-blue mx-auto" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/kanban" replace />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="tickets/:id" element={<TicketPage />} />
        <Route path="playbook" element={<PlaybookPage />} />
        <Route path="config" element={<ConfigPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/kanban" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
