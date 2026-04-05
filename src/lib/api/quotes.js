import { supabase } from '../supabase'

export async function getQuotes() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createQuote(quote) {
  const { data, error } = await supabase.from('quotes').insert(quote).select().single()
  if (error) throw error
  return data
}

export async function updateQuote(id, updates) {
  const { data, error } = await supabase.from('quotes').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteQuote(id) {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
}
