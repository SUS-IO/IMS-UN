// ===================================================================
//  IMS settings — the ONLY file you need to edit to connect your database.
//  Supabase dashboard -> Project Settings -> API
//  (The anon key is meant to be public; the database rules protect your data.
//   NEVER paste the "service_role" key here.)
// ===================================================================
window.IMS_CONFIG = {
  SUPABASE_URL: 'https://ujjdvikdsuynrdxonrhw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_J30LVfaqEqSugaVTSglJsA_oSvD0HQR',
  // Customer portal (customers log in to view live stock).  false = hidden everywhere in the screens.
  //  To switch it ON later, change false to true, save, upload to GitHub and press Ctrl+F5.
  SHOW_CUSTOMER_PORTAL: false,
  LOGIN_DOMAIN: 'ims.local', // must match the LOGIN_DOMAIN of the admin-users Edge Function
};
