import { supabase } from '../supabase'

export async function getModels() {
  const { data, error } = await supabase
    .from('print_models')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createModel(model) {
  const { data, error } = await supabase.from('print_models').insert(model).select().single()
  if (error) throw error
  return data
}

export async function updateModel(id, updates) {
  const { data, error } = await supabase.from('print_models').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteModel(id) {
  const { error } = await supabase.from('print_models').delete().eq('id', id)
  if (error) throw error
}
