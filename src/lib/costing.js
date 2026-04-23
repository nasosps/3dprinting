const ELECTRICITY_COST_PER_H = 0.75

// ROI applies only to the print cost. Extras are pass-through and get added after ROI pricing.
export function calcProfitAndRoi({ sellPrice, unitCost, baseUnitCost }) {
  const sell = parseFloat(sellPrice) || 0
  const finalCost = parseFloat(unitCost) || 0
  const roiCost = parseFloat(baseUnitCost) || 0
  const profit = sell - finalCost
  const roi = roiCost > 0 ? (profit / roiCost) * 100 : 0
  return { profit, roi }
}

export function calcSuggestedPrice({ baseUnitCost, extrasCost, targetRoi = 180 }) {
  const roiCost = parseFloat(baseUnitCost) || 0
  const passThroughCost = parseFloat(extrasCost) || 0
  return roiCost * (1 + targetRoi / 100) + passThroughCost
}

// formMaterials: [{ id, name, price, grams }]
export function calcUnitCost({ batch_mins, batch_pcs, formMaterials, extras }) {
  const bPcs = parseInt(batch_pcs) || 1
  const bMins = parseFloat(batch_mins) || 0
  const mats = formMaterials || []
  const matCostBatch = mats.reduce((s, m) => s + (parseFloat(m.grams) || 0) / 1000 * (parseFloat(m.price) || 0), 0)
  const bGrams = mats.reduce((s, m) => s + (parseFloat(m.grams) || 0), 0)
  const elecCostBatch = (bMins / 60) * ELECTRICITY_COST_PER_H
  const maintCostBatch = matCostBatch * 0.5
  const extrasCost = (extras || []).reduce((s, e) => s + (parseFloat(e.cost) || 0), 0)
  const baseUnitCost = (matCostBatch + elecCostBatch + maintCostBatch) / bPcs
  const unitCost = baseUnitCost + extrasCost
  return { unitCost, baseUnitCost, matCostBatch, elecCostBatch, maintCostBatch, extrasCost, bPcs, bGrams, bMins }
}
