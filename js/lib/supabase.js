import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";
const supabase = createClient(SUPABASE_URL || "http://localhost:54321", SUPABASE_KEY || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 5 } }
});
export {
  supabase
};
