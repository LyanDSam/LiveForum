import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cllwmvytzbvstiuxtfdz.supabase.co'
const supabaseAnonKey = 'sb_publishable_zdBU5E5R6ogOdcbomvUZnA_3tMgNjmD'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
