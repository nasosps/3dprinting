import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQuotes, createQuote, updateQuote, deleteQuote } from '../lib/api/quotes'
import { getCustomers } from '../lib/api/customers'
import { getMaterials } from '../lib/api/materials'
import { getAccessories } from '../lib/api/accessories'
import { getModels } from '../lib/api/models'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'
import CostForm, { calcUnitCost } from '../components/CostForm'

const EMPTY = {
  client_id: '', title: '', qty: '', unit_price: '',
  template_id: '', material_id: '', batch_grams: '', batch_mins: '', batch_pcs: '1',
}

export default function Quotes() {
  const qc = useQueryClient()
  const { data: quotes = [], isLoading } = useQuery({ queryKey: ['quotes'], queryFn: getQuotes })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: getMaterials })
  const { data: accessories = [] } = useQuery({ queryKey: ['accessories'], queryFn: getAccessories })
  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: getModels })

  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [formMaterials, setFormMaterials] = useState([])
  const [formExtras, setFormExtras] = useState([])
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

  function openAdd() { setForm(EMPTY); setFormMaterials([]); setFormExtras([]); setSheet({ mode: 'add' }) }
  function openEdit(q) {
    setForm({
      client_id: q.client_id || '', title: q.title || '', qty: q.qty ?? '', unit_price: q.unit_price ?? '',
      template_id: q.template_id || '',
      batch_mins: q.batch_mins ?? '', batch_pcs: q.batch_pcs ?? '1',
    })
    setFormMaterials(Array.isArray(q.materials_used) ? q.materials_used : [])
    setFormExtras(Array.isArray(q.extras_used) ? q.extras_used : [])
    setSheet({ mode: 'edit', item: q })
  }

  function save() {
    const qty = parseInt(form.qty) || 0
    const uprice = parseFloat(form.unit_price) || 0
    const { unitCost } = calcUnitCost({ ...form, formMaterials, extras: formExtras })
    const data = {
      client_id: form.client_id || null,
      title: form.title,
      qty,
      unit_price: uprice,
      total_price: uprice * qty,
      template_id: form.template_id || null,
      batch_mins: parseFloat(form.batch_mins) || 0,
      batch_pcs: parseInt(form.batch_pcs) || 1,
      materials_used: formMaterials,
      extras_used: formExtras,
      cost_per_unit: unitCost,
      total_cost: unitCost * qty,
    }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Προσφορές</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-base px-4 py-2.5 rounded-xl">
          <Plus size={18} /> Νέα
        </button>
      </div>

      {quotes.length === 0 && <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν προσφορές</div>}

      <div className="space-y-3">
        {quotes.map(q => {
          const clientName = customerMap[q.client_id] || 'Άγνωστος'
          const status = q.status || 'Active'
          const costPerUnit = q.cost_per_unit || 0
          const uprice = q.unit_price || 0
          const profit = uprice - costPerUnit
          const roi = costPerUnit > 0 ? (profit / costPerUnit) * 100 : 0
          return (
            <div key={q.id} className="bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-white">{clientName}</div>
                  {q.title && <div className="text-base text-gray-400 mt-0.5 truncate">{q.title}</div>}
                  {q.qty > 0 && <div className="text-sm text-gray-500 mt-0.5">{q.qty} τεμ.</div>}
                  {costPerUnit > 0 && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">Κόστος {costPerUnit.toFixed(2)}€ · </span>
                      <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)}€ · ROI {roi.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div className="text-right">
                    <div className="text-base font-semibold text-white">{(q.total_price || 0).toFixed(2)}€</div>
                    <span className={`text-sm inline-block px-2 py-0.5 rounded-full mt-1 ${status === 'Completed' ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>
                      {status === 'Completed' ? 'Αποδεκτή' : 'Εκκρεμεί'}
                    </span>
                  </div>
                  <button onClick={() => openEdit(q)} className="text-gray-500 active:text-white p-2"><Pencil size={18} /></button>
                  <button onClick={() => setDelConfirm(q)} className="text-gray-500 active:text-red-400 p-2"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία Προσφοράς' : 'Νέα Προσφορά'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Πελάτης</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
              <option value="">-- Επιλογή --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <Field label="Τίτλος / Περιγραφή" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="π.χ. Φιγούρες x20" />

          <CostForm
            form={form} setForm={setForm}
            formMaterials={formMaterials} setFormMaterials={setFormMaterials}
            extras={formExtras} setExtras={setFormExtras}
            models={models} materials={materials} accessories={accessories}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Τεμάχια" value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} type="number" placeholder="0" />
            <Field label="Τιμή/τεμ. (€)" value={form.unit_price} onChange={v => setForm(f => ({ ...f, unit_price: v }))} type="number" placeholder="0.00" />
          </div>

          {form.qty && form.unit_price && (
            <div className="bg-violet-900/20 border border-violet-800 rounded-xl px-4 py-3 text-base text-violet-300">
              Συνολικός τζίρος: <strong>{(parseFloat(form.unit_price) * parseInt(form.qty) || 0).toFixed(2)}€</strong>
            </div>
          )}

          <button onClick={save} disabled={mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-base font-medium py-3.5 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή;">
        <p className="text-gray-300 text-base mb-6">Διαγραφή προσφοράς <strong className="text-white">{delConfirm?.title}</strong>;</p>
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
