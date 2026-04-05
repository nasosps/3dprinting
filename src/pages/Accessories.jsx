import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccessories, createAccessory, updateAccessory, deleteAccessory } from '../lib/api/accessories'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'

const EMPTY = { name: '', cost: '', stock: '' }

export default function Accessories() {
  const qc = useQueryClient()
  const { data: accessories = [], isLoading } = useQuery({ queryKey: ['accessories'], queryFn: getAccessories })
  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)

  const mut = useMutation({
    mutationFn: ({ mode, id, data }) =>
      mode === 'edit' ? updateAccessory(id, data) : createAccessory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accessories'] }); setSheet(null) },
  })

  const delMut = useMutation({
    mutationFn: deleteAccessory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accessories'] }); setDelConfirm(null) },
  })

  function openAdd() { setForm(EMPTY); setSheet({ mode: 'add' }) }
  function openEdit(a) { setForm({ name: a.name || '', cost: a.cost ?? '', stock: a.stock ?? '' }); setSheet({ mode: 'edit', item: a }) }

  function save() {
    const data = { name: form.name, cost: parseFloat(form.cost) || 0, stock: parseInt(form.stock) || 0 }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Αξεσουάρ</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-base px-4 py-2.5 rounded-xl">
          <Plus size={18} /> Νέο
        </button>
      </div>

      {accessories.length === 0 && (
        <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν αξεσουάρ</div>
      )}

      <div className="space-y-3">
        {accessories.map(a => (
          <div key={a.id} className="bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38] flex items-center justify-between">
            <div>
              <div className="text-base font-medium text-white">{a.name}</div>
              {a.cost != null && <div className="text-sm text-gray-500 mt-0.5">{Number(a.cost).toFixed(2)}€ / τεμ.</div>}
            </div>
            <div className="flex items-center gap-3">
              {a.stock != null && (
                <div className={`text-base font-semibold ${a.stock <= 2 ? 'text-orange-400' : 'text-white'}`}>×{a.stock}</div>
              )}
              <button onClick={() => openEdit(a)} className="text-gray-400 active:text-white p-2"><Pencil size={18} /></button>
              <button onClick={() => setDelConfirm(a)} className="text-gray-400 active:text-red-400 p-2"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία' : 'Νέο Αξεσουάρ'}>
        <div className="space-y-4">
          <Field label="Όνομα" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="π.χ. Φίλτρο αέρα" />
          <Field label="Κόστος (€)" value={form.cost} onChange={v => setForm(f => ({ ...f, cost: v }))} type="number" placeholder="0.00" />
          <Field label="Απόθεμα (τεμ.)" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} type="number" placeholder="0" />
          <button onClick={save} disabled={!form.name || mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-base font-medium py-3.5 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή;">
        <p className="text-gray-300 text-base mb-6">Διαγραφή <strong className="text-white">{delConfirm?.name}</strong>; Δεν μπορεί να αναιρεθεί.</p>
        <div className="flex gap-3">
          <button onClick={() => setDelConfirm(null)} className="flex-1 py-3.5 text-base rounded-xl bg-[#2e2e38] text-gray-300">Ακύρωση</button>
          <button onClick={() => delMut.mutate(delConfirm.id)} disabled={delMut.isPending}
            className="flex-1 py-3.5 text-base rounded-xl bg-red-600 text-white disabled:opacity-50">
            {delMut.isPending ? '...' : 'Διαγραφή'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500"
      />
    </div>
  )
}
