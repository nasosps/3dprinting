import { supabase } from '../supabase'

export async function getAccessories() {
  const { data, error } = await supabase.from('accessories').select('*').order('name')
  if (error) throw error
  return data
}

export async function createAccessory(acc) {
  const { data, error } = await supabase.from('accessories').insert(acc).select().single()
  if (error) throw error
  return data
}

export async function updateAccessory(id, updates) {
  const { data, error } = await supabase.from('accessories').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteAccessory(id) {
  const { error } = await supabase.from('accessories').delete().eq('id', id)
  if (error) throw error
}
