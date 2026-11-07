// ===================================================================
//  IMS settings — the ONLY file you need to edit to connect your database.
//  Supabase dashboard -> Project Settings -> API
//  (The anon key is meant to be public; the database rules protect your data.
//   NEVER paste the "service_role" key here.)
// ===================================================================
window.IMS_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',
  LOGIN_DOMAIN: 'ims.local', // must match the LOGIN_DOMAIN of the admin-users Edge Function
};
