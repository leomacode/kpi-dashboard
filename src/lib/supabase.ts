import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When either env var is missing (e.g. CI without secrets, public demo deploy,
// fresh clone before .env is created), avoid calling createClient — newer
// versions throw synchronously, which would crash the entire app on load.
// Consumers should check `isSupabaseConfigured` and fall back to mock data.
export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string)
  : null;
