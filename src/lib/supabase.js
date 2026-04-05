import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lluvsgobvwbqlgfitlxi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_PQNkye9QPBqoMBB0uJkqLg_yPrASUP0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
