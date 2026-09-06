import { supabase } from './supabase-client.js';
export async function signUp(email, password) { const { error } = await supabase.auth.signUp({ email, password }); if (error) throw error; }
export async function signIn(email, password) { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
export async function signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; }
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
  if (error) throw error;
}
