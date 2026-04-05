import { supabase } from '../supabase'

export async function getMaterials() {
  const { data, error } = await supabase.from('materials').select('*').order('name')
  if (error) throw error
  return data
}

export async function updateMaterial(id, updates) {
  const { data, error } = await supabase.from('materials').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function createMaterial(material) {
  const { data, error } = await supabase.from('materials').insert(material).select().single()
  if (error) throw error
  return data
}

export async function deleteMaterial(id) {
  const { error } = await supabase.from('materials').delete().eq('id', id)
  if (error) throw error
}
