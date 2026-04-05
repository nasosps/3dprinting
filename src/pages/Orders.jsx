import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, createOrder, updateOrder, deleteOrder } from '../lib/api/orders'
import { getCustomers } from '../lib/api/customers'
import { updateAccessory } from '../lib/api/accessories'
import { updateMaterial } from '../lib/api/materials'
import { supabase } from '../lib/supabase'
import { Minus, Plus, CheckCircle, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'

const EMPTY = { client_id: '', description: '', total_pieces: '', batch_pcs: '', unit_price: '', deposit: '' }

function OrderCard({ order, onEdit, onDelete }) {
  const qc = useQueryClient()
  const [inputVal, setInputVal] = useState('')
  const [inputMode, setInputMode] = useState(null)

  const { mutate: update } = useMutation({
    mutationFn: ({ id, updates }) => updateOrder(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const piecesPerPlate = order.batch_pcs || 1
  const completed = order.completed_pieces || 0
  const total = order.total_pieces || 0
  const progress = total > 0 ? (completed / total) * 100 : 0
  const isComplete = total > 0 && completed >= total

  async function change(delta) {
    if (delta === 0) return
    const next = Math.max(0, Math.min(completed + delta, total))
    const updates = { completed_pieces: next }

    if (delta > 0) {
      const piecesAdded = next - completed
      const mats = Array.isArray(order.materials_used) ? order.materials_used : []
      const bPcs = order.batch_pcs || 1

      for (const m of mats) {
        const toDeduct = (m.grams / bPcs) * piecesAdded
        if (toDeduct > 0 && m.id) {
          const { data: spool } = await supabase.from('materials').select('current_weight').eq('id', m.id).single()
          if (spool) {
            await updateMaterial(m.id, { current_weight: Math.max(0, spool.current_weight - toDeduct) })
          }
        }
      }

      if (next >= total) {
        updates.status = 'Completed'
        const extras = Array.isArray(order.extras_used) ? order.extras_used : []
        for (const e of extras) {
          if (!e.id) continue
          const { data: acc } = await supabase.from('accessories').select('stock').eq('id', e.id).single()
          if (acc && acc.stock > 0) {
            await updateAccessory(e.id, { stock: acc.stock - 1 })
          }
        }
      }
    }

    update({ id: order.id, updates })
  }

  function applyInput() {
    const n = parseInt(inputVal)
    if (!n || n <= 0) { setInputMode(null); setInputVal(''); return }
    const delta = inputMode === 'add' ? n : -n
    change(delta)
    setInputMode(null)
    setInputVal('')
  }

  return (
    <div className={`bg-[#1a1a1f] rounded-xl p-4 border ${isComplete ? 'border-green-800' : 'border-[#2e2e38]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-white truncate">{order.customers?.name || 'Άγνωστος'}</div>
          {order.description && <div className="text-sm text-gray-400 truncate">{order.description}</div>}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="text-base font-medium text-violet-400">{(order.sale_price || 0).toFixed(2)}€</div>
          {isComplete && <CheckCircle size={18} className="text-green-400" />}
          <button onClick={() => onEdit(order)} className="text-gray-500 active:text-white p-2"><Pencil size={17} /></button>
          <button onClick={() => onDelete(order)} className="text-gray-500 active:text-red-400 p-2"><Trash2 size={17} /></button>
        </div>
      </div>

      {total > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
            <span>{completed}/{total} τεμάχια</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[#2e2e38] rounded-full h-2.5 mb-3">
            <div className={`h-2.5 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-violet-500'}`} style={{ width: `${progress}%` }} />
          </div>

          {/* Plate buttons */}
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => change(-piecesPerPlate)} disabled={completed <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg bg-[#2e2e38] text-gray-300 text-base disabled:opacity-30">
              <Minus size={16} /> πλάκα
            </button>
            <div className="text-sm text-gray-500 px-1">×{piecesPerPlate}</div>
            <button onClick={() => change(+piecesPerPlate)} disabled={isComplete}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg bg-violet-900/50 text-violet-300 text-base disabled:opacity-30">
              <Plus size={16} /> πλάκα
            </button>
          </div>

          {/* Manual piece input */}
          {inputMode ? (
            <div className="flex items-center gap-2">
              <div className={`text-base font-medium px-2 ${inputMode === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                {inputMode === 'add' ? '+' : '−'}
              </div>
              <input
                type="number"
                autoFocus
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyInput(); if (e.key === 'Escape') { setInputMode(null); setInputVal('') } }}
                placeholder="αριθμός τεμ."
                className="flex-1 bg-[#0f0f11] border border-[#2e2e38] rounded-lg px-3 py-2.5 text-white text-base focus:outline-none focus:border-violet-500"
              />
              <button onClick={applyInput} className="bg-violet-600 text-white text-base px-3 py-2.5 rounded-lg">OK</button>
              <button onClick={() => { setInputMode(null); setInputVal('') }} className="text-gray-500 text-base px-2 py-2.5">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setInputMode('remove')} disabled={completed <= 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#2e2e38] text-gray-400 text-sm disabled:opacity-30">
                <Minus size={14} /> τεμ.
              </button>
              <button onClick={() => setInputMode('add')} disabled={isComplete}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#2e2e38] text-gray-400 text-sm disabled:opacity-30">
                <Plus size={14} /> τεμ.
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Orders() {
  const qc = useQueryClient()
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: getOrders })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [showDone, setShowDone] = useState(false)

  const mut = useMutation({
    mutationFn: ({ mode, id, data }) =>
      mode === 'edit' ? updateOrder(id, data) : createOrder(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setSheet(null) },
  })

  const delMut = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setDelConfirm(null) },
  })

  function openAdd() { setForm(EMPTY); setSheet({ mode: 'add' }) }
  function openEdit(o) {
    setForm({ client_id: o.client_id || '', description: o.description || '', total_pieces: o.total_pieces ?? '', batch_pcs: o.batch_pcs ?? '', unit_price: o.unit_price ?? '', deposit: o.deposit ?? '' })
    setSheet({ mode: 'edit', item: o })
  }

  function save() {
    const qty = parseInt(form.total_pieces) || 0
    const uprice = parseFloat(form.unit_price) || 0
    const data = {
      client_id: form.client_id || null,
      description: form.description,
      total_pieces: qty,
      batch_pcs: parseInt(form.batch_pcs) || 1,
      unit_price: uprice,
      sale_price: uprice * qty,
      deposit: parseFloat(form.deposit) || 0,
      status: 'Active',
    }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  const active = orders.filter(o => o.status !== 'Completed')
  const done = orders.filter(o => o.status === 'Completed')

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Παραγγελίες</h1>
        <div className="flex items-center gap-2">
          {done.length > 0 && (
            <button onClick={() => setShowDone(s => !s)}
              className="flex items-center gap-1.5 bg-[#2e2e38] text-gray-400 text-base px-3 py-2.5 rounded-xl">
              {showDone ? <EyeOff size={17} /> : <Eye size={17} />}
              {done.length}
            </button>
          )}
          <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-base px-4 py-2.5 rounded-xl">
            <Plus size={18} /> Νέα
          </button>
        </div>
      </div>

      {active.length > 0 && <div className="space-y-3 mb-4">{active.map(o => <OrderCard key={o.id} order={o} onEdit={openEdit} onDelete={setDelConfirm} />)}</div>}

      {showDone && done.length > 0 && (
        <>
          <h2 className="text-base font-medium text-gray-500 mb-2">Ολοκληρωμένες</h2>
          <div className="space-y-3 opacity-60">{done.map(o => <OrderCard key={o.id} order={o} onEdit={openEdit} onDelete={setDelConfirm} />)}</div>
        </>
      )}

      {orders.length === 0 && <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν παραγγελίες</div>}

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία Παραγγελίας' : 'Νέα Παραγγελία'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Πελάτης</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
              <option value="">-- Επιλογή --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Περιγραφή" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="π.χ. Φιγούρες δεινοσαύρων" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Τεμάχια" value={form.total_pieces} onChange={v => setForm(f => ({ ...f, total_pieces: v }))} type="number" placeholder="0" />
            <Field label="Τεμ/πλάκα" value={form.batch_pcs} onChange={v => setForm(f => ({ ...f, batch_pcs: v }))} type="number" placeholder="1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Τιμή/τεμ. (€)" value={form.unit_price} onChange={v => setForm(f => ({ ...f, unit_price: v }))} type="number" placeholder="0.00" />
            <Field label="Προκαταβολή (€)" value={form.deposit} onChange={v => setForm(f => ({ ...f, deposit: v }))} type="number" placeholder="0.00" />
          </div>
          {form.total_pieces && form.unit_price && (
            <div className="bg-violet-900/20 border border-violet-800 rounded-xl px-4 py-3 text-base text-violet-300">
              Σύνολο: <strong>{(parseFloat(form.unit_price) * parseInt(form.total_pieces) || 0).toFixed(2)}€</strong>
            </div>
          )}
          <button onClick={save} disabled={mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-base font-medium py-3.5 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή παραγγελίας;">
        <p className="text-gray-300 text-base mb-6">Διαγραφή παραγγελίας του <strong className="text-white">{delConfirm?.customers?.name}</strong>; Δεν αναιρείται.</p>
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
