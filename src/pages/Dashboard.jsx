import { createElement, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrders } from '../lib/api/orders'
import { getQuotes } from '../lib/api/quotes'
import { ShoppingCart, FileText, TrendingUp, Clock } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'
import { calcUnitCost } from '../lib/costing'

function getRoiCostPerUnit(item) {
  const qty = item.total_pieces || item.qty || 0
  const storedCostPerUnit = item.cost_per_unit || (qty > 0 ? (item.total_cost || 0) / qty : 0)
  const extras = Array.isArray(item.extras_used) ? item.extras_used : []
  const materials = Array.isArray(item.materials_used) ? item.materials_used : []
  const { baseUnitCost, extrasCost } = calcUnitCost({
    batch_mins: item.batch_mins,
    batch_pcs: item.batch_pcs,
    formMaterials: materials,
    extras,
  })
  return baseUnitCost > 0 ? baseUnitCost : Math.max(0, storedCostPerUnit - extrasCost)
}

function getRoiCostTotal(item) {
  const qty = item.total_pieces || item.qty || 0
  return qty > 0 ? getRoiCostPerUnit(item) * qty : getRoiCostPerUnit(item)
}

export default function Dashboard() {
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders })
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: getQuotes })
  const [revenueSheet, setRevenueSheet] = useState(false)

  const activeOrders = orders.filter(o => o.status !== 'Completed')
  const completedOrders = orders.filter(o => o.status === 'Completed')

  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.sale_price || 0), 0)
  const totalCost    = completedOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0)
  const totalProfit  = totalRevenue - totalCost
  const totalRoiCost = completedOrders.reduce((sum, o) => sum + getRoiCostTotal(o), 0)
  const roi          = totalRoiCost > 0 ? (totalProfit / totalRoiCost) * 100 : 0

  const stats = [
    { label: 'Ενεργές Παραγγελίες', value: activeOrders.length, icon: ShoppingCart, color: 'text-violet-400', onClick: null },
    { label: 'Εκκρεμείς Προσφορές', value: quotes.length, icon: FileText, color: 'text-blue-400', onClick: null },
    { label: 'Σύνολο Εσόδων', value: `${totalRevenue.toFixed(2)}€`, icon: TrendingUp, color: 'text-green-400', onClick: () => setRevenueSheet(true) },
    { label: 'Συνολικές Παραγγελίες', value: orders.length, icon: Clock, color: 'text-orange-400', onClick: null },
  ]

  return (
    <div className="p-4 pb-28">
      <h1 className="text-2xl font-semibold text-white mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(({ label, value, icon, color, onClick }) => (
          <div key={label}
            onClick={onClick || undefined}
            className={`bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38] ${onClick ? 'active:bg-[#2e2e38] cursor-pointer' : ''}`}>
            {createElement(icon, { size: 24, className: `${color} mb-2`, strokeWidth: 1.5 })}
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
            {onClick && <div className="text-sm text-green-600 mt-1">πάτα για ανάλυση →</div>}
          </div>
        ))}
      </div>

      {activeOrders.length > 0 && (
        <div>
          <h2 className="text-base font-medium text-gray-400 mb-2">Ενεργές Παραγγελίες</h2>
          <div className="space-y-2">
            {activeOrders.slice(0, 5).map(order => (
              <div key={order.id} className="bg-[#1a1a1f] rounded-xl p-4 border border-[#2e2e38] flex items-center justify-between">
                <div>
                  <div className="text-base font-medium text-white">{order.customers?.name || 'Άγνωστος'}</div>
                  <div className="text-sm text-gray-500">{order.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-medium text-violet-400">{(order.sale_price || 0).toFixed(2)}€</div>
                  {order.total_pieces > 0 && (
                    <div className="text-sm text-gray-500">{order.completed_pieces || 0}/{order.total_pieces} τεμ.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomSheet open={revenueSheet} onClose={() => setRevenueSheet(false)} title="Οικονομική Ανάλυση">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatBox label="Σύνολο Εσόδων" value={`${totalRevenue.toFixed(2)}€`} color="text-green-400" />
          <StatBox label="Σύνολο Εξόδων" value={`${totalCost.toFixed(2)}€`} color="text-red-400" />
          <StatBox
            label="Καθαρό Κέρδος"
            value={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}€`}
            color={totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatBox
            label="ROI εκτύπωσης"
            value={`${Math.round(roi)}%`}
            color={roi >= 100 ? 'text-green-400' : roi >= 50 ? 'text-yellow-400' : 'text-red-400'}
          />
          <StatBox
            label="Μέση Παραγγελία"
            value={completedOrders.length > 0 ? `${(totalRevenue / completedOrders.length).toFixed(2)}€` : '—'}
            color="text-blue-400"
          />
        </div>

        <div className="text-sm text-gray-500 mb-3">{completedOrders.length} ολοκληρωμένες παραγγελίες</div>

        {completedOrders.length === 0 && (
          <div className="text-center text-gray-500 py-8">Δεν υπάρχουν ολοκληρωμένες παραγγελίες</div>
        )}

        <div className="space-y-2">
          {completedOrders.map(o => {
            const date = o.created_at
              ? new Date(o.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : '—'
            const sale = o.sale_price || 0
            const cost = o.total_cost || 0
            const profit = sale - cost
            const qty = o.total_pieces || 1
            const roiCost = getRoiCostTotal(o)
            const roi = roiCost > 0 ? (profit / roiCost) * 100 : 0
            const balance = sale - (o.deposit || 0)
            return (
              <div key={o.id} className="bg-[#0f0f11] rounded-xl p-3 border border-[#2e2e38]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-medium text-white">{o.customers?.name || 'Άγνωστος'}</div>
                    {o.description && <div className="text-sm text-gray-500 truncate max-w-[150px]">{o.description}</div>}
                    <div className="text-sm text-gray-600 mt-0.5">{date} · {qty} τεμ.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold text-white">{sale.toFixed(2)}€</div>
                    {cost > 0 && (
                      <>
                        <div className={`text-sm font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          κέρδος {profit >= 0 ? '+' : ''}{profit.toFixed(2)}€
                        </div>
                        <div className="text-sm text-gray-500">
                          {(profit / qty).toFixed(2)}€/τεμ. · ROI {roi.toFixed(0)}%
                        </div>
                      </>
                    )}
                    {o.deposit > 0 && (
                      <div className="text-sm text-gray-600">υπόλ. {balance.toFixed(2)}€</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-[#0f0f11] rounded-xl p-3 border border-[#2e2e38]">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
