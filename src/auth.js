import { supabase } from './supabase-client.js';

const APEX_SITE_URL = 'https://philnicholls2525.github.io/Apex-Card-Game/';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: APEX_SITE_URL
    }
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: APEX_SITE_URL
  });
  if (error) throw error;
}
