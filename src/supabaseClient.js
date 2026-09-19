import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaces a clear error in the browser console/UI instead of a silent
  // failure if the .env values (or Vercel env vars) haven't been set yet.
  console.error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
    "in your .env.local file (for local dev) or in your Vercel project's Environment Variables (for deployment)."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
