import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

export function createPublicClient() {
  return createClient(supabaseUrl || "", supabaseAnonKey || "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
