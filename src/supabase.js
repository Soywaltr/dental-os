import { createClient } from '@supabase/supabase-js'

// Tu URL de Supabase (Ya la puse por ti)
const supabaseUrl = 'https://ucnbrekxhfcyxfsulukj.supabase.co'

// Aquí pega la llave larguísima que copiaste en la página de Supabase
const supabaseKey = 'sb_publishable_jhajuVBbDrbd2eFAJPIang_rqLm0VEU'

export const supabase = createClient(supabaseUrl, supabaseKey)