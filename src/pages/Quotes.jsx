import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQuotes, createQuote, updateQuote, deleteQuote } from '../lib/api/quotes'
import { getCustomers } from '../lib/api/customers'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'

const EMPTY = { client_id: '', title: '', qty: '', unit_price: '' }

export default function Quotes() {
  const qc = useQueryClient()
  const { data: quotes = [], isLoading } = useQuery({ queryKey: ['quotes'], queryFn: getQuotes })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]))

  const mut = useMutation({
    mutationFn: ({ mode, id, data }) =>
      mode === 'edit' ? updateQuote(id, data) : createQuote(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); setSheet(null) },
  })

  const delMut = useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); setDelConfirm(null) },
  })

  function openAdd() { setForm(EMPTY); setSheet({ mode: 'add' }) }
  function openEdit(q) {
    setForm({ client_id: q.client_id || '', title: q.title || '', qty: q.qty ?? '', unit_price: q.unit_price ?? '' })
    setSheet({ mode: 'edit', item: q })
  }

  function save() {
    const qty = parseInt(form.qty) || 0
    const uprice = parseFloat(form.unit_price) || 0
    const data = { client_id: form.client_id || null, title: form.title, qty, unit_price: uprice, total_price: uprice * qty }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white">Προσφορές</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm px-3 py-2 rounded-xl">
          <Plus size={16} /> Νέα
        </button>
      </div>

      {quotes.length === 0 && <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν προσφορές</div>}

      <div className="space-y-3">
        {quotes.map(q => {
          const clientName = customerMap[q.client_id] || 'Άγνωστος'
          const status = q.status || 'Active'
          return (
            <div key={q.id} className="bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{clientName}</div>
                  {q.title && <div className="text-sm text-gray-400 mt-0.5 truncate">{q.title}</div>}
                  {q.qty > 0 && <div className="text-xs text-gray-500 mt-0.5">{q.qty} τεμ.</div>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{(q.total_price || 0).toFixed(2)}€</div>
                    <span className={`text-xs inline-block px-2 py-0.5 rounded-full mt-1 ${status === 'Completed' ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>
                      {status === 'Completed' ? 'Αποδεκτή' : 'Εκκρεμεί'}
                    </span>
                  </div>
                  <button onClick={() => openEdit(q)} className="text-gray-500 active:text-white p-1"><Pencil size={15} /></button>
                  <button onClick={() => setDelConfirm(q)} className="text-gray-500 active:text-red-400 p-1"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία Προσφοράς' : 'Νέα Προσφορά'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Πελάτης</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500">
              <option value="">-- Επιλογή --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Τίτλος / Περιγραφή" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="π.χ. Φιγούρες x20" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Τεμάχια" value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} type="number" placeholder="0" />
            <Field label="Τιμή/τεμ. (€)" value={form.unit_price} onChange={v => setForm(f => ({ ...f, unit_price: v }))} type="number" placeholder="0.00" />
          </div>
          {form.qty && form.unit_price && (
            <div className="bg-violet-900/20 border border-violet-800 rounded-xl px-4 py-3 text-sm text-violet-300">
              Σύνολο: <strong>{(parseFloat(form.unit_price) * parseInt(form.qty) || 0).toFixed(2)}€</strong>
            </div>
          )}
          <button onClick={save} disabled={mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή;">
        <p className="text-gray-300 mb-6">Διαγραφή προσφοράς <strong className="text-white">{delConfirm?.title}</strong>;</p>
        <div className="flex gap-3">
          <button onClick={() => setDelConfirm(null)} className="flex-1 py-3 rounded-xl bg-[#2e2e38] text-gray-300">Ακύρωση</button>
          <button onClick={() => delMut.mutate(delConfirm.id)} disabled={delMut.isPending}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white disabled:opacity-50">
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
      <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500" />
    </div>
  )
}
