import { supabase } from '../supabase'

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createOrder(order) {
  const { data, error } = await supabase.from('orders').insert(order).select().single()
  if (error) throw error
  return data
}

export async function updateOrder(id, updates) {
  const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}
