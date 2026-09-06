import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { APEX_CONFIG } from './apex-config.js';
if (!APEX_CONFIG.supabaseUrl || APEX_CONFIG.supabaseUrl.includes('YOUR_PROJECT') || !APEX_CONFIG.supabasePublishableKey || APEX_CONFIG.supabasePublishableKey.includes('YOUR_')) throw new Error('Set the public Supabase URL and publishable key in src/apex-config.js.');
export const supabase = createClient(APEX_CONFIG.supabaseUrl, APEX_CONFIG.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
