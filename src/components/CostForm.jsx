// Shared cost form fields: template, material, batch, extras, live preview
import { useMemo } from 'react'
import { Plus, X } from 'lucide-react'

const ELECTRICITY_COST_PER_H = 0.75

export function calcUnitCost({ batch_grams, batch_mins, batch_pcs, material, extras }) {
  const bPcs = parseInt(batch_pcs) || 1
  const bGrams = parseFloat(batch_grams) || 0
  const bMins = parseFloat(batch_mins) || 0
  const matCostBatch = (bGrams / 1000) * (material?.price || 0)
  const elecCostBatch = (bMins / 60) * ELECTRICITY_COST_PER_H
  const maintCostBatch = matCostBatch * 0.5
  const extrasCost = (extras || []).reduce((s, e) => s + (e.cost || 0), 0) / bPcs
  const unitCost = (matCostBatch + elecCostBatch + maintCostBatch) / bPcs + extrasCost
  return { unitCost, matCostBatch, elecCostBatch, maintCostBatch, extrasCost, bPcs, bGrams, bMins }
}

export default function CostForm({ form, setForm, extras, setExtras, models, materials, accessories }) {
  const activeMats = (materials || []).filter(m => (m.current_weight || 0) > 0)
  const selectedMat = materials?.find(m => String(m.id) === String(form.material_id))

  const { unitCost, matCostBatch, elecCostBatch, maintCostBatch, extrasCost, bPcs, bGrams, bMins } = useMemo(
    () => calcUnitCost({ ...form, material: selectedMat, extras }),
    [form, selectedMat, extras]
  )

  const suggestedPrice = unitCost * 2.8
  const sellPrice = parseFloat(form.unit_price) || 0
  const profit = sellPrice - unitCost
  const roi = unitCost > 0 ? (profit / unitCost) * 100 : 0

  function applyTemplate(id) {
    if (!id) { setForm(f => ({ ...f, template_id: '' })); return }
    const m = models?.find(x => String(x.id) === String(id))
    if (!m) return
    const mats = Array.isArray(m.materials) ? m.materials : []
    const firstMat = mats[0]
    const batchGrams = mats.reduce((s, x) => s + (x.grams || 0), 0)
    const storedExtras = Array.isArray(m.extras) ? m.extras : []
    setForm(f => ({
      ...f,
      template_id: id,
      material_id: firstMat?.id || '',
      batch_grams: batchGrams || '',
      batch_mins: m.batch_mins || '',
      batch_pcs: m.batch_pcs || 1,
    }))
    setExtras(storedExtras)
  }

  function addExtra(selExtra) {
    if (!selExtra) return
    const acc = accessories?.find(a => String(a.id) === String(selExtra))
    if (!acc || extras.find(e => String(e.id) === String(acc.id))) return
    setExtras(ex => [...ex, { id: acc.id, name: acc.name, cost: acc.cost || 0 }])
  }

  return (
    <div className="space-y-4">
      {/* Template */}
      {models?.length > 0 && (
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Template (προαιρετικό)</label>
          <select value={form.template_id || ''} onChange={e => applyTemplate(e.target.value)}
            className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
            <option value="">-- Χειροκίνητα --</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      {/* Material */}
      <div>
        <label className="text-sm text-gray-400 block mb-1.5">Υλικό</label>
        <select value={form.material_id || ''} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}
          className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
          <option value="">-- Επιλογή υλικού --</option>
          {activeMats.map(m => (
            <option key={m.id} value={m.id}>
              {[m.brand, m.type, m.color].filter(Boolean).join(' ')} — {(m.price || 0).toFixed(2)}€/kg
            </option>
          ))}
        </select>
      </div>

      {/* Batch */}
      <div className="grid grid-cols-3 gap-3">
        <CostField label="Τεμ/πλάκα" value={form.batch_pcs} onChange={v => setForm(f => ({ ...f, batch_pcs: v }))} placeholder="1" />
        <CostField label="Γρ. πλάκας (g)" value={form.batch_grams} onChange={v => setForm(f => ({ ...f, batch_grams: v }))} placeholder="0" />
        <CostField label="Λεπτά πλάκας" value={form.batch_mins} onChange={v => setForm(f => ({ ...f, batch_mins: v }))} placeholder="0" />
      </div>

      {/* Extras */}
      {accessories?.length > 0 && (
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Extras (ανά πλάκα)</label>
          <div className="flex gap-2">
            <select defaultValue="" onChange={e => { addExtra(e.target.value); e.target.value = '' }}
              className="flex-1 bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-3 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
              <option value="">-- Επιλογή --</option>
              {accessories.map(a => <option key={a.id} value={a.id}>{a.name} ({(a.cost || 0).toFixed(2)}€)</option>)}
            </select>
          </div>
          {extras.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {extras.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-[#0f0f11] border border-[#2e2e38] rounded-lg px-3 py-2.5">
                  <span className="text-base text-gray-300">{e.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{(e.cost || 0).toFixed(2)}€/πλάκα</span>
                    <button onClick={() => setExtras(ex => ex.filter(x => String(x.id) !== String(e.id)))} className="text-gray-500 active:text-red-400 p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live cost preview */}
      {(bGrams > 0 || bMins > 0 || extrasCost > 0) && (
        <div className="bg-[#0f0f11] border border-[#2e2e38] rounded-xl p-3 space-y-1.5 text-sm">
          <div className="text-gray-400 font-medium mb-2">Κόστος / τεμάχιο</div>
          {bGrams > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Υλικό ({(bGrams / bPcs).toFixed(1)}g)</span>
              <span className="text-white">{(matCostBatch / bPcs).toFixed(3)}€</span>
            </div>
          )}
          {bGrams > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Συντήρηση (50% υλικού)</span>
              <span className="text-white">{(maintCostBatch / bPcs).toFixed(3)}€</span>
            </div>
          )}
          {bMins > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Ρεύμα ({(bMins / bPcs).toFixed(1)}λ)</span>
              <span className="text-white">{(elecCostBatch / bPcs).toFixed(3)}€</span>
            </div>
          )}
          {extrasCost > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Extras ({extras.length} είδη)</span>
              <span className="text-white">{extrasCost.toFixed(3)}€</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#2e2e38] pt-1.5 font-medium">
            <span className="text-gray-300">Κόστος/τεμ.</span>
            <span className="text-white">{unitCost.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-violet-400 font-semibold">
            <span>Προτεινόμενη τιμή (ROI 180%)</span>
            <span>{suggestedPrice.toFixed(2)}€</span>
          </div>
          {sellPrice > 0 && (
            <>
              <div className="flex justify-between border-t border-[#2e2e38] pt-1.5 font-semibold">
                <span className="text-gray-300">Κέρδος/τεμ.</span>
                <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {profit >= 0 ? '+' : ''}{profit.toFixed(2)}€
                </span>
              </div>
              <div className={`flex justify-between font-bold ${roi >= 100 ? 'text-green-400' : roi >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                <span>ROI</span>
                <span>{roi.toFixed(0)}%</span>
              </div>
            </>
          )}
          {bGrams > 0 && !form.material_id && (
            <div className="text-yellow-400 text-xs">⚠ Επίλεξε υλικό για πλήρες κόστος</div>
          )}
        </div>
      )}
    </div>
  )
}

function CostField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-1.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-3 py-3.5 text-white text-base focus:outline-none focus:border-violet-500" />
    </div>
  )
}
