import { PostgrestClient } from "@supabase/postgrest-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When either env var is missing (e.g. CI without secrets, public demo deploy,
// fresh clone before .env is created), skip client construction entirely.
// Consumers should check `isSupabaseConfigured` and fall back to mock data.
export const isSupabaseConfigured = Boolean(url && key);

// PostgREST only. This app uses no Supabase auth, realtime, storage or edge
// functions, but `createClient` from @supabase/supabase-js pulls all of them
// into the browser bundle regardless. Talking to the REST endpoint directly
// drops that dead weight.
//
// The request shape below is what supabase-js itself sends: the REST base is
// `<project-url>/rest/v1`, and with no signed-in user its bearer token falls
// back to the anon key — so `apikey` and `Authorization` are both that key.
// PostgREST resolves the `anon` role from it and RLS applies as normal.
export const supabase: PostgrestClient | null = isSupabaseConfigured
  ? new PostgrestClient(
      new URL("rest/v1", `${url as string}`.replace(/\/?$/, "/")).href,
      {
        headers: {
          apikey: key as string,
          Authorization: `Bearer ${key as string}`,
        },
      },
    )
  : null;
