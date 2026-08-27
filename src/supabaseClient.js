import { createClient } from "@supabase/supabase-js";

// These come from Vercel/`.env.local` — see README.md for setup.
// If they're missing, the app falls back to browser-only storage instead of crashing.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const isSupabaseConfigured = !!supabase;
