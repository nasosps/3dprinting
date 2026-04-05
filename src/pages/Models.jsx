import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getModels, createModel, updateModel, deleteModel } from '../lib/api/models'
import { getMaterials } from '../lib/api/materials'
import { getAccessories } from '../lib/api/accessories'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'

const ELECTRICITY_COST_PER_H = 0.75

function roiColor(roi) {
  if (roi >= 100) return 'text-green-400'
  if (roi >= 50) return 'text-yellow-400'
  return 'text-red-400'
}
function roiDot(roi) {
  if (roi >= 100) return 'bg-green-400'
  if (roi >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}
function calcRoi(sell, cost) {
  return cost > 0 ? ((sell - cost) / cost) * 100 : 0
}
function extrasCostPerUnit(extras, bPcs) {
  return extras.reduce((s, e) => s + (e.cost || 0), 0) / (bPcs || 1)
}

const EMPTY = { name: '', batch_pcs: '1', material_id: '', batch_grams: '', batch_mins: '', sell_price: '' }

export default function Models() {
  const qc = useQueryClient()
  const { data: models = [], isLoading } = useQuery({ queryKey: ['models'], queryFn: getModels })
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: getMaterials })
  const { data: accessories = [] } = useQuery({ queryKey: ['accessories'], queryFn: getAccessories })

  const [sheet, setSheet] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [formExtras, setFormExtras] = useState([])
  const [selExtra, setSelExtra] = useState('')
  const [delConfirm, setDelConfirm] = useState(null)

  const activeMats = materials.filter(m => (m.current_weight || 0) > 0)

  const mut = useMutation({
    mutationFn: ({ mode, id, data }) =>
      mode === 'edit' ? updateModel(id, data) : createModel(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); setSheet(null) },
  })
  const delMut = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); setDelConfirm(null) },
  })

  function openAdd() {
    setForm(EMPTY)
    setFormExtras([])
    setSelExtra('')
    setSheet({ mode: 'add' })
  }

  function openEdit(m) {
    const mats = Array.isArray(m.materials) ? m.materials : []
    const firstMat = mats[0]
    const batchGrams = mats.reduce((s, x) => s + (x.grams || 0), 0)
    const storedExtras = Array.isArray(m.extras) ? m.extras : []
    setForm({
      name: m.name || '',
      batch_pcs: m.batch_pcs ?? '1',
      material_id: firstMat?.id || '',
      batch_grams: batchGrams || m.weight_g * (m.batch_pcs || 1) || '',
      batch_mins: m.batch_mins ?? '',
      sell_price: m.sell_price ?? m.unit_price ?? '',
    })
    setFormExtras(storedExtras)
    setSelExtra('')
    setSheet({ mode: 'edit', item: m })
  }

  function addExtra() {
    if (!selExtra) return
    const acc = accessories.find(a => String(a.id) === String(selExtra))
    if (!acc) return
    if (formExtras.find(e => String(e.id) === String(acc.id))) return
    setFormExtras(ex => [...ex, { id: acc.id, name: acc.name, cost: acc.cost || 0 }])
    setSelExtra('')
  }

  function removeExtra(id) {
    setFormExtras(ex => ex.filter(e => String(e.id) !== String(id)))
  }

  function save() {
    const bPcs = parseInt(form.batch_pcs) || 1
    const bGrams = parseFloat(form.batch_grams) || 0
    const bMins = parseFloat(form.batch_mins) || 0
    const sellPrice = parseFloat(form.sell_price) || 0
    const selectedMat = materials.find(m => String(m.id) === String(form.material_id))
    const matEntry = selectedMat
      ? [{ id: selectedMat.id, name: [selectedMat.brand, selectedMat.type, selectedMat.color].filter(Boolean).join(' '), price: selectedMat.price || 20, grams: bGrams }]
      : []

    const data = {
      name: form.name,
      batch_pcs: bPcs,
      batch_mins: bMins,
      weight_g: bPcs > 0 ? bGrams / bPcs : bGrams,
      print_time_hours: ((bMins / bPcs) / 60).toFixed(3),
      sell_price: sellPrice,
      unit_price: sellPrice,
      materials: matEntry,
      extras: formExtras,
    }
    mut.mutate(sheet.mode === 'edit' ? { mode: 'edit', id: sheet.item.id, data } : { mode: 'add', data })
  }

  const preview = useMemo(() => {
    const bPcs = parseInt(form.batch_pcs) || 1
    const bGrams = parseFloat(form.batch_grams) || 0
    const bMins = parseFloat(form.batch_mins) || 0
    const sell = parseFloat(form.sell_price) || 0
    const mat = materials.find(m => String(m.id) === String(form.material_id))
    const matCostBatch = (bGrams / 1000) * (mat?.price || 0)
    const elecCostBatch = (bMins / 60) * ELECTRICITY_COST_PER_H
    const extrasCost = extrasCostPerUnit(formExtras, bPcs)
    const unitCost = (matCostBatch + elecCostBatch) / bPcs + extrasCost
    const profit = sell - unitCost
    const roi = calcRoi(sell, unitCost)
    return { matCostBatch, elecCostBatch, extrasCost, unitCost, profit, roi, bPcs, bGrams, bMins, sell }
  }, [form, materials, formExtras])

  if (isLoading) return <div className="p-4 text-gray-500">Φόρτωση...</div>

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Templates</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-base px-4 py-2.5 rounded-xl">
          <Plus size={18} /> Νέο
        </button>
      </div>

      {models.length === 0 && <div className="text-center text-gray-500 mt-16">Δεν υπάρχουν templates</div>}

      <div className="space-y-3">
        {models.map(m => {
          const mats = Array.isArray(m.materials) ? m.materials : []
          const exts = Array.isArray(m.extras) ? m.extras : []
          const batchPcs = m.batch_pcs || 1
          const batchMins = m.batch_mins || (m.print_time_hours || 0) * 60
          const matCostBatch = mats.reduce((s, mat) => s + (mat.grams || 0) * ((mat.price || 0) / 1000), 0)
          const elecCostBatch = (batchMins / 60) * ELECTRICITY_COST_PER_H
          const extCostUnit = extrasCostPerUnit(exts, batchPcs)
          const costPerUnit = (matCostBatch + elecCostBatch) / batchPcs + extCostUnit
          const sellPrice = m.sell_price || m.unit_price || 0
          const profitPerUnit = sellPrice - costPerUnit
          const roi = calcRoi(sellPrice, costPerUnit)
          const unitGrams = mats.reduce((s, mat) => s + (mat.grams || 0), 0) / batchPcs || m.weight_g || 0
          const matNames = mats.map(mat => mat.name).filter(Boolean).join(', ')
          const extNames = exts.map(e => e.name).filter(Boolean).join(', ')

          return (
            <div key={m.id} className="bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-white">{m.name}</div>
                  {matNames && <div className="text-sm text-gray-500 mt-0.5 truncate">{matNames}</div>}
                  {extNames && <div className="text-sm text-gray-600 truncate">+ {extNames}</div>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div className="text-right">
                    <div className="text-base font-semibold text-white">{sellPrice.toFixed(2)}€</div>
                    <div className="text-sm text-gray-500">/τεμ.</div>
                  </div>
                  <button onClick={() => openEdit(m)} className="text-gray-500 active:text-white p-2"><Pencil size={17} /></button>
                  <button onClick={() => setDelConfirm(m)} className="text-gray-500 active:text-red-400 p-2"><Trash2 size={17} /></button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                {unitGrams > 0 && <span>{unitGrams.toFixed(0)}g/τεμ.</span>}
                {batchMins > 0 && <><span>·</span><span>{batchMins.toFixed(0)}λ/πλάκα</span></>}
                <span>·</span><span>×{batchPcs} τεμ/πλάκα</span>
              </div>

              {costPerUnit > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Κόστος <span className="text-gray-300">{costPerUnit.toFixed(2)}€</span>
                    {' · '}
                    <span className={profitPerUnit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {profitPerUnit >= 0 ? '+' : ''}{profitPerUnit.toFixed(2)}€
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-base font-semibold ${roiColor(roi)}`}>
                    <div className={`w-2 h-2 rounded-full ${roiDot(roi)}`} />
                    ROI {roi.toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'edit' ? 'Επεξεργασία Template' : 'Νέο Template'}>
        <div className="space-y-4">
          <Field label="Όνομα *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="π.χ. Φιγούρα δεινόσαυρος" />

          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Υλικό</label>
            <select value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}
              className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
              <option value="">-- Επιλογή υλικού --</option>
              {activeMats.map(m => (
                <option key={m.id} value={m.id}>
                  {[m.brand, m.type, m.color].filter(Boolean).join(' ')} — {(m.price || 0).toFixed(2)}€/kg
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Τεμ/πλάκα" value={form.batch_pcs} onChange={v => setForm(f => ({ ...f, batch_pcs: v }))} type="number" placeholder="1" />
            <Field label="Γραμμάρια πλάκας (g)" value={form.batch_grams} onChange={v => setForm(f => ({ ...f, batch_grams: v }))} type="number" placeholder="0" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Χρόνος πλάκας (λεπτά)" value={form.batch_mins} onChange={v => setForm(f => ({ ...f, batch_mins: v }))} type="number" placeholder="0" />
            <Field label="Τιμή πώλησης/τεμ. (€)" value={form.sell_price} onChange={v => setForm(f => ({ ...f, sell_price: v }))} type="number" placeholder="0.00" />
          </div>

          {accessories.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Αξεσουάρ / Extras (ανά πλάκα)</label>
              <div className="flex gap-2">
                <select value={selExtra} onChange={e => setSelExtra(e.target.value)}
                  className="flex-1 bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-3 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
                  <option value="">-- Επιλογή --</option>
                  {accessories.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({(a.cost || 0).toFixed(2)}€)</option>
                  ))}
                </select>
                <button onClick={addExtra} disabled={!selExtra}
                  className="bg-violet-600 disabled:opacity-40 text-white px-3 py-3 rounded-xl">
                  <Plus size={18} />
                </button>
              </div>

              {formExtras.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {formExtras.map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-[#0f0f11] border border-[#2e2e38] rounded-lg px-3 py-2.5">
                      <span className="text-base text-gray-300">{e.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{(e.cost || 0).toFixed(2)}€/πλάκα</span>
                        <button onClick={() => removeExtra(e.id)} className="text-gray-500 active:text-red-400 p-1">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(preview.bGrams > 0 || preview.bMins > 0 || preview.extrasCost > 0) && (
            <div className="bg-[#0f0f11] border border-[#2e2e38] rounded-xl p-3 space-y-1.5 text-sm">
              <div className="text-gray-400 font-medium mb-2">Κόστος / τεμάχιο</div>
              {preview.bGrams > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Υλικό ({(preview.bGrams / preview.bPcs).toFixed(1)}g)</span>
                  <span className="text-white">{(preview.matCostBatch / preview.bPcs).toFixed(3)}€</span>
                </div>
              )}
              {preview.bMins > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Ρεύμα ({(preview.bMins / preview.bPcs).toFixed(1)}λ)</span>
                  <span className="text-white">{(preview.elecCostBatch / preview.bPcs).toFixed(3)}€</span>
                </div>
              )}
              {preview.extrasCost > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Extras ({formExtras.length} είδη)</span>
                  <span className="text-white">{preview.extrasCost.toFixed(3)}€</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#2e2e38] pt-1.5 font-medium">
                <span className="text-gray-300">Κόστος/τεμ.</span>
                <span className="text-white">{preview.unitCost.toFixed(2)}€</span>
              </div>
              {preview.sell > 0 && (
                <>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-300">Καθαρό κέρδος/τεμ.</span>
                    <span className={preview.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {preview.profit >= 0 ? '+' : ''}{preview.profit.toFixed(2)}€
                    </span>
                  </div>
                  <div className={`flex justify-between font-bold ${roiColor(preview.roi)}`}>
                    <span>ROI</span>
                    <span>{preview.roi.toFixed(0)}%</span>
                  </div>
                </>
              )}
              {preview.sell > 0 && !form.material_id && (
                <div className="text-yellow-400">⚠ Επίλεξε υλικό για πλήρες κόστος</div>
              )}
            </div>
          )}

          <button onClick={save} disabled={!form.name || mut.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-base font-medium py-3.5 rounded-xl">
            {mut.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Διαγραφή template;">
        <p className="text-gray-300 text-base mb-6">Διαγραφή <strong className="text-white">{delConfirm?.name}</strong>; Δεν αναιρείται.</p>
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
