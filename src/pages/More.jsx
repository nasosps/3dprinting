import { Link } from 'react-router-dom'
import { Users, Layers, Wrench } from 'lucide-react'

const items = [
  { to: '/models', icon: Layers, label: 'Templates / Μοντέλα', desc: 'Διαχείριση εκτυπώσιμων μοντέλων' },
  { to: '/customers', icon: Users, label: 'Πελάτες', desc: 'Λίστα και διαχείριση πελατών' },
  { to: '/accessories', icon: Wrench, label: 'Αξεσουάρ', desc: 'Ανταλλακτικά και υλικά' },
]

export default function More() {
  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-semibold text-white mb-4">Περισσότερα</h1>
      <div className="space-y-2">
        {items.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38] active:bg-[#2e2e38] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-900/40 flex items-center justify-center">
              <Icon size={20} className="text-violet-400" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-medium text-white text-sm">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
