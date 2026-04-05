import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1a1a1f] rounded-t-2xl border-t border-[#2e2e38] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2e2e38]">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 active:text-white p-2">
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}
