/**
 * Supabase client singleton.
 *
 * Uses the browser client everywhere in the app.
 * Import `supabase` for all auth and data operations.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars.\n" +
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store session in localStorage so it survives page reloads
    persistSession: true,
    // Automatically refresh the access token before it expires
    autoRefreshToken: true,
    // Detect sessions set in the URL (used by the OAuth/magic-link callback)
    detectSessionInUrl: true,
  },
});
