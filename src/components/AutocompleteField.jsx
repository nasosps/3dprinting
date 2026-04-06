import { useState, useRef } from 'react'

export default function AutocompleteField({ label, value, onChange, placeholder, suggestions = [] }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  const filtered = suggestions.filter(s => s.toLowerCase().includes((value || '').toLowerCase()) && s.toLowerCase() !== (value || '').toLowerCase())

  return (
    <div className="relative">
      <label className="text-sm text-gray-400 block mb-1.5">{label}</label>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder={placeholder}
        className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500"
      />
      {show && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1a1f] border border-[#2e2e38] rounded-xl overflow-hidden shadow-xl">
          {filtered.map(s => (
            <button
              key={s}
              onMouseDown={() => { onChange(s); setShow(false) }}
              className="w-full px-4 py-3 text-left text-white text-base hover:bg-[#2e2e38] border-b border-[#2e2e38] last:border-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
