import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../lib/api/materials'
import { AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'

const EMPTY = { brand: '', type: '', color: '', price: '', spool_count: '1', initial_weight: '', current_weight: '' }

export default function Materials() {
  const qc = useQueryClient()
  const { data: materials = [], isLoading } = useQuery({ queryKey: ['materials'], queryFn: getMaterials })
  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)

  const mut = useMutation({
    mutationFn: ({ mode, id, data }) =>
      mode === 'edit' ? updateMaterial(id, data) : createMaterial(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setSheet(null) },
  })

  const delMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setDelConfirm(null) },
  })

  function openAdd() { setForm(EMPTY); setSheet({ mode: 'add' }) }
  function openEdit(m) {
    setForm({ brand: m.brand || '', type: m.type || '', color: m.color || '', price: m.price ?? '', spool_count: '', initial_weight: m.initial_weight ?? '', current_weight: m.current_weight ?? '' })
    setSheet({ mode: 'edit', item: m })
  }

  function save() {
    const spoolC = parseInt(form.spool_count) || 1
    const totalW = form.spool_count ? 1000 * spoolC : (parseFloat(form.initial_weight) || 0)
    const data = {
      brand: form.brand, type: form.type, color: form.color,
      price: parseFloat(form.price) || 0,
      initial_weight: totalW,
      current_weight: sheet.mode === 'edit' ? (parseFloat(form.current_weight) || 0) : totalW,
    }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  const active = materials.filter(m => (m.current_weight || 0) > 0)
  const archived = materials.filter(m => (m.current_weight || 0) <= 0)

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  function renderCard(m) {
    const weight = m.current_weight || 0
    const isLow = weight > 0 && weight < 200
    const label = [m.brand, m.type, m.color].filter(Boolean).join(' · ')
    return (
      <div key={m.id} className={`bg-[#1a1a1f] rounded-xl p-4 border ${isLow ? 'border-orange-800' : 'border-[#2e2e38]'} flex items-center justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-white">{label || 'Άγνωστο'}</span>
            {isLow && <AlertTriangle size={16} className="text-orange-400" />}
          </div>
          {m.price != null && <div className="text-sm text-gray-500 mt-0.5">{Number(m.price).toFixed(2)}€/kg</div>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-base font-semibold ${isLow ? 'text-orange-400' : 'text-white'}`}>{weight.toFixed(0)}g</span>
          <button onClick={() => openEdit(m)} className="text-gray-400 active:text-white p-2"><Pencil size={18} /></button>
          <button onClick={() => setDelConfirm(m)} className="text-gray-400 active:text-red-400 p-2"><Trash2 size={18} /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Υλικά</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-base px-4 py-2.5 rounded-xl">
          <Plus size={18} /> Νέο
        </button>
      </div>

      {materials.length === 0 && <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν υλικά</div>}
      {active.length > 0 && <div className="space-y-3 mb-4">{active.map(renderCard)}</div>}
      {archived.length > 0 && (
        <>
          <h2 className="text-base font-medium text-gray-500 mb-2">Αρχειοθετημένα</h2>
          <div className="space-y-3 opacity-50">{archived.map(renderCard)}</div>
        </>
      )}

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία Υλικού' : 'Νέο Υλικό'}>
        <div className="space-y-4">
          <Field label="Brand" value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} placeholder="π.χ. Bambu" />
          <Field label="Τύπος" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} placeholder="π.χ. PLA, PETG" />
          <Field label="Χρώμα" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="π.χ. Black" />
          <Field label="Τιμή (€/kg)" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} type="number" placeholder="20.00" />
          {sheet?.mode === 'add' ? (
            <>
              <Field label="Αριθμός καρουλιών (×1000g)" value={form.spool_count} onChange={v => setForm(f => ({ ...f, spool_count: v }))} type="number" placeholder="1" />
              {form.spool_count && (
                <div className="bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3 text-base text-gray-300">
                  Σύνολο: <strong className="text-white">{1000 * (parseInt(form.spool_count) || 1)}g</strong>
                </div>
              )}
            </>
          ) : (
            <>
              <Field label="Αρχικό Βάρος (g)" value={form.initial_weight} onChange={v => setForm(f => ({ ...f, initial_weight: v }))} type="number" placeholder="1000" />
              <Field label="Τρέχον Βάρος (g)" value={form.current_weight} onChange={v => setForm(f => ({ ...f, current_weight: v }))} type="number" placeholder="1000" />
            </>
          )}
          <button onClick={save} disabled={mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-base font-medium py-3.5 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή;">
        <p className="text-gray-300 text-base mb-6">Διαγραφή <strong className="text-white">{[delConfirm?.brand, delConfirm?.type, delConfirm?.color].filter(Boolean).join(' ')}</strong>;</p>
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500" />
    </div>
  )
}
