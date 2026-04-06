// Shared cost form fields: template, materials (up to 4), batch, extras, live preview
import { useState, useMemo, useRef } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { createMaterial } from '../lib/api/materials'
import { Plus, X } from 'lucide-react'

const ELECTRICITY_COST_PER_H = 0.75

// formMaterials: [{ id, name, price, grams }]
export function calcUnitCost({ batch_mins, batch_pcs, formMaterials, extras }) {
  const bPcs = parseInt(batch_pcs) || 1
  const bMins = parseFloat(batch_mins) || 0
  const mats = formMaterials || []
  const matCostBatch = mats.reduce((s, m) => s + (parseFloat(m.grams) || 0) / 1000 * (parseFloat(m.price) || 0), 0)
  const bGrams = mats.reduce((s, m) => s + (parseFloat(m.grams) || 0), 0)
  const elecCostBatch = (bMins / 60) * ELECTRICITY_COST_PER_H
  const maintCostBatch = matCostBatch * 0.5
  const extrasCost = (extras || []).reduce((s, e) => s + (e.cost || 0), 0)
  const unitCost = (matCostBatch + elecCostBatch + maintCostBatch) / bPcs + extrasCost
  return { unitCost, matCostBatch, elecCostBatch, maintCostBatch, extrasCost, bPcs, bGrams, bMins }
}

export default function CostForm({ form, setForm, formMaterials, setFormMaterials, extras, setExtras, models, materials, accessories }) {
  const qc = useQueryClient()
  const activeMats = (materials || []).filter(m => (m.current_weight || 0) > 0)
  const [matSearch, setMatSearch] = useState('')
  const [selMatGrams, setSelMatGrams] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selMatId, setSelMatId] = useState('')
  const searchRef = useRef(null)
  const [newMatForm, setNewMatForm] = useState(null) // null | { brand, type, color, price, spool_count }

  const createMatMut = useMutation({
    mutationFn: createMaterial,
    onSuccess: (newMat) => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      const name = [newMat.brand, newMat.type, newMat.color].filter(Boolean).join(' ')
      setFormMaterials(prev => [...prev, { id: newMat.id, name, price: newMat.price || 0, grams: parseFloat(selMatGrams) || 0 }])
      setNewMatForm(null)
      setMatSearch('')
      setSelMatGrams('')
    },
  })

  const { unitCost, matCostBatch, elecCostBatch, maintCostBatch, extrasCost, bPcs, bGrams, bMins } = useMemo(
    () => calcUnitCost({ ...form, formMaterials, extras }),
    [form, formMaterials, extras]
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
    const storedExtras = Array.isArray(m.extras) ? m.extras : []
    // Build formMaterials from template
    const newMats = mats.map(mat => ({
      id: mat.id,
      name: mat.name || '',
      price: mat.price || 0,
      grams: mat.grams || 0,
    }))
    setFormMaterials(newMats)
    setForm(f => ({
      ...f,
      template_id: id,
      batch_mins: m.batch_mins || '',
      batch_pcs: m.batch_pcs || 1,
    }))
    setExtras(storedExtras)
  }

  function addMaterial() {
    if (!selMatId || !selMatGrams) return
    if (formMaterials.length >= 4) return
    const mat = activeMats.find(m => String(m.id) === String(selMatId))
    if (!mat) return
    const name = [mat.brand, mat.type, mat.color].filter(Boolean).join(' ')
    setFormMaterials(prev => [...prev, { id: mat.id, name, price: mat.price || 0, grams: parseFloat(selMatGrams) }])
    setSelMatId('')
    setSelMatGrams('')
    setMatSearch('')
  }

  function removeMaterial(id) {
    setFormMaterials(prev => prev.filter(m => String(m.id) !== String(id)))
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

      {/* Materials (up to 4) */}
      <div>
        <label className="text-sm text-gray-400 block mb-1.5">Υλικά ({formMaterials.length}/4)</label>
        {formMaterials.length < 4 && (
          <div className="space-y-2 mb-2">
            {/* Search box */}
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={matSearch}
                onChange={e => { setMatSearch(e.target.value); setShowDropdown(true); setSelMatId('') }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Αναζήτηση υλικού..."
                className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500"
              />
              {showDropdown && (() => {
                const q = matSearch.toLowerCase()
                const filtered = activeMats
                  .filter(m => !formMaterials.find(fm => String(fm.id) === String(m.id)))
                  .filter(m => !q || [m.brand, m.type, m.color].join(' ').toLowerCase().includes(q))
                  .sort((a, b) => (a.current_weight || 0) - (b.current_weight || 0))
                return (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1a1f] border border-[#2e2e38] rounded-xl overflow-hidden shadow-xl">
                    {filtered.length === 0 && (
                      <button
                        onMouseDown={() => {
                          setShowDropdown(false)
                          setNewMatForm({ brand: matSearch, type: '', color: '', price: '', spool_count: '1' })
                        }}
                        className="w-full px-4 py-3 text-left text-violet-400 text-base hover:bg-[#2e2e38]">
                        + Νέο υλικό "{matSearch}"
                      </button>
                    )}
                    {filtered.slice(0, 6).map((m, i) => {
                      const name = [m.brand, m.type, m.color].filter(Boolean).join(' ')
                      const isLowest = i === 0
                      return (
                        <button
                          key={m.id}
                          onMouseDown={() => {
                            setSelMatId(String(m.id))
                            setMatSearch(name)
                            setShowDropdown(false)
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#2e2e38] border-b border-[#2e2e38] last:border-0"
                        >
                          <div>
                            <span className="text-white text-base">{name}</span>
                            {isLowest && <span className="ml-2 text-xs text-orange-400">↓ λιγότερο</span>}
                          </div>
                          <span className="text-sm text-gray-500 ml-2">{(m.current_weight || 0).toFixed(0)}g</span>
                        </button>
                      )
                    })}
                    {filtered.length > 0 && (
                      <button
                        onMouseDown={() => {
                          setShowDropdown(false)
                          setNewMatForm({ brand: matSearch, type: '', color: '', price: '', spool_count: '1' })
                        }}
                        className="w-full px-4 py-3 text-left text-violet-400 text-sm hover:bg-[#2e2e38] border-t border-[#2e2e38]">
                        + Νέο υλικό
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
            {/* New material inline form */}
            {newMatForm && (
              <div className="bg-[#0f0f11] border border-violet-800 rounded-xl p-3 space-y-3">
                <div className="text-sm font-medium text-violet-400">Νέο Υλικό</div>
                <div className="grid grid-cols-2 gap-2">
                  <NField label="Brand" value={newMatForm.brand} onChange={v => setNewMatForm(f => ({ ...f, brand: v }))} placeholder="Bambu" />
                  <NField label="Τύπος" value={newMatForm.type} onChange={v => setNewMatForm(f => ({ ...f, type: v }))} placeholder="PLA" />
                  <NField label="Χρώμα" value={newMatForm.color} onChange={v => setNewMatForm(f => ({ ...f, color: v }))} placeholder="Black" />
                  <NField label="€/kg" value={newMatForm.price} onChange={v => setNewMatForm(f => ({ ...f, price: v }))} type="number" placeholder="20" />
                  <NField label="Αρ. καρουλιών (×1000g)" value={newMatForm.spool_count} onChange={v => setNewMatForm(f => ({ ...f, spool_count: v }))} type="number" placeholder="1" />
                </div>
                <div className="text-sm text-gray-400">
                  Σύνολο: <span className="text-white font-medium">{1000 * (parseInt(newMatForm.spool_count) || 1)}g</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setNewMatForm(null)} className="flex-1 py-2 rounded-lg bg-[#2e2e38] text-gray-300 text-sm">Ακύρωση</button>
                  <button
                    disabled={!newMatForm.brand || createMatMut.isPending}
                    onClick={() => {
                      const total = 1000 * (parseInt(newMatForm.spool_count) || 1)
                      createMatMut.mutate({
                        brand: newMatForm.brand, type: newMatForm.type, color: newMatForm.color,
                        price: parseFloat(newMatForm.price) || 0,
                        initial_weight: total, current_weight: total,
                      })
                    }}
                    className="flex-1 py-2 rounded-lg bg-violet-600 disabled:opacity-40 text-white text-sm">
                    {createMatMut.isPending ? '...' : 'Αποθήκευση'}
                  </button>
                </div>
              </div>
            )}
            {/* Grams + Add */}
            <div className="flex gap-2">
              <input
                type="number" value={selMatGrams} onChange={e => setSelMatGrams(e.target.value)}
                placeholder="Γραμμάρια (g)" min="0"
                className="flex-1 bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-violet-500"
              />
              <button onClick={addMaterial} disabled={!selMatId || !selMatGrams}
                className="bg-violet-600 disabled:opacity-40 text-white px-4 rounded-xl">
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
        {formMaterials.length > 0 && (
          <div className="space-y-1.5">
            {formMaterials.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-[#0f0f11] border border-[#2e2e38] rounded-lg px-3 py-2.5">
                <span className="text-base text-gray-300 truncate flex-1">{m.name}</span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-gray-500">{m.grams}g</span>
                  <button onClick={() => removeMaterial(m.id)} className="text-gray-500 active:text-red-400 p-1">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch */}
      <div className="grid grid-cols-2 gap-3">
        <CostField label="Τεμ/πλάκα" value={form.batch_pcs} onChange={v => setForm(f => ({ ...f, batch_pcs: v }))} placeholder="1" />
        <CostField label="Λεπτά πλάκας" value={form.batch_mins} onChange={v => setForm(f => ({ ...f, batch_mins: v }))} placeholder="0" />
      </div>

      {/* Extras */}
      {accessories?.length > 0 && (
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Extras (ανά τεμάχιο)</label>
          <select defaultValue="" onChange={e => { addExtra(e.target.value); e.target.value = '' }}
            className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-3 py-3.5 text-white text-base focus:outline-none focus:border-violet-500">
            <option value="">-- Επιλογή --</option>
            {accessories.map(a => <option key={a.id} value={a.id}>{a.name} ({(a.cost || 0).toFixed(2)}€)</option>)}
          </select>
          {extras.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {extras.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-[#0f0f11] border border-[#2e2e38] rounded-lg px-3 py-2.5">
                  <span className="text-base text-gray-300">{e.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{(e.cost || 0).toFixed(2)}€/τεμ.</span>
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

function NField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#1a1a1f] border border-[#2e2e38] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
    </div>
  )
}
