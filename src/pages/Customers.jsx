import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../lib/api/customers'
import { Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'

const EMPTY = { name: '', phone: '', email: '' }

export default function Customers() {
  const qc = useQueryClient()
  const { data: customers = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)

  const mut = useMutation({
    mutationFn: ({ mode, id, data }) =>
      mode === 'edit' ? updateCustomer(id, data) : createCustomer(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setSheet(null) },
  })

  const delMut = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setDelConfirm(null) },
  })

  function openAdd() { setForm(EMPTY); setSheet({ mode: 'add' }) }
  function openEdit(c) { setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '' }); setSheet({ mode: 'edit', item: c }) }

  function save() {
    const data = { name: form.name, phone: form.phone || null, email: form.email || null }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Πελάτες</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-base px-4 py-2.5 rounded-xl">
          <Plus size={18} /> Νέος
        </button>
      </div>

      {customers.length === 0 && <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν πελάτες</div>}

      <div className="space-y-3">
        {customers.map(c => (
          <div key={c.id} className="bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-medium text-white">{c.name}</div>
                <div className="flex flex-col gap-1 mt-1">
                  {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-base text-gray-400"><Phone size={15} />{c.phone}</a>}
                  {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-base text-gray-400"><Mail size={15} />{c.email}</a>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)} className="text-gray-400 active:text-white p-2"><Pencil size={18} /></button>
                <button onClick={() => setDelConfirm(c)} className="text-gray-400 active:text-red-400 p-2"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}>
        <div className="space-y-4">
          <Field label="Όνομα *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ονοματεπώνυμο" />
          <Field label="Τηλέφωνο" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} type="tel" placeholder="69xxxxxxxx" />
          <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="email@example.com" />
          <button onClick={save} disabled={!form.name || mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-base font-medium py-3.5 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή;">
        <p className="text-gray-300 text-base mb-6">Διαγραφή <strong className="text-white">{delConfirm?.name}</strong>;</p>
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
