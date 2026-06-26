import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, BookOpen, Settings, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSyncStatus } from '@/hooks/useSyncStatus'

export default function Layout() {
  const { signOut } = useAuth()
  const { lastSync, syncAge, isStale } = useSyncStatus()
  const navigate = useNavigate()

  const navItems = [
    { to: '/kanban',  icon: LayoutDashboard, label: 'Kanban' },
    { to: '/pedidos', icon: Package,         label: 'Pedidos' },
    { to: '/playbook', icon: BookOpen,       label: 'Sellers' },
    { to: '/config',  icon: Settings,        label: 'Config' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-zf-blue text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">ReturnFlow</span>
          <span className="text-blue-200 text-xs">ZF [pro]Parts</span>
        </div>

        {/* Busca global */}
        <div className="flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="Buscar por Order ID (pressione /)"
            className="w-full bg-white/10 text-white placeholder-blue-200 border border-white/20 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:bg-white/20"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) navigate(`/pedidos?q=${val}`)
              }
            }}
          />
        </div>

        <button onClick={() => signOut()} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm">
          <LogOut size={15} />
          Sair
        </button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-56 bg-white border-r border-gray-200 flex flex-col py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zf-blue-light text-zf-blue border-r-2 border-zf-blue'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {/* Indicador de sync no rodapé */}
          <div className="mt-auto px-5 pb-2">
            <div className={`flex items-center gap-1.5 text-xs ${isStale ? 'text-amber-600' : 'text-gray-400'}`}>
              <RefreshCw size={11} className={isStale ? 'text-amber-500' : ''} />
              {lastSync ? `Atualizado há ${syncAge}` : 'Aguardando sync...'}
            </div>
          </div>
        </nav>

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
