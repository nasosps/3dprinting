import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, FileText, Package, Users, Layers, Wrench } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Αρχή' },
  { to: '/orders', icon: ShoppingCart, label: 'Παραγγελίες' },
  { to: '/quotes', icon: FileText, label: 'Προσφορές' },
  { to: '/materials', icon: Package, label: 'Υλικά' },
  { to: '/models', icon: Layers, label: 'Templates' },
  { to: '/customers', icon: Users, label: 'Πελάτες' },
  { to: '/accessories', icon: Wrench, label: 'Αξεσουάρ' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1f] border-t border-[#2e2e38] z-50">
      <div className="flex w-full">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                isActive ? 'text-violet-400' : 'text-gray-500'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.5} />
            <span className="text-[11px] leading-tight text-center">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
