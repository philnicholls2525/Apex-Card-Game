import { supabase } from './supabase-client.js';
import { APEX_CONFIG } from './apex-config.js';
export async function gameApi(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to play.');
  const { data, error } = await supabase.functions.invoke(APEX_CONFIG.edgeFunctionName, { body: { action, idempotencyKey: crypto.randomUUID(), ...payload } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error.message);
  return data.data;
}
