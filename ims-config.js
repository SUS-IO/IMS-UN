// ===================================================================
//  IMS settings — the ONLY file you need to edit to connect your database.
//  Supabase dashboard -> Project Settings -> API
//  (The anon key is meant to be public; the database rules protect your data.
//   NEVER paste the "service_role" key here.)
// ===================================================================
window.IMS_CONFIG = {
  SUPABASE_URL: 'https://ujjdvikdsuynrdxonrhw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqamR2aWtkc3V5bnJkeG9ucmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDUwODQsImV4cCI6MjEwOTYyMTA4NH0.1yMSIQNT-QYryeemQ-uPDeuAH6RplWALibN6P4hI-QE',
  LOGIN_DOMAIN: 'ims.local', // must match the LOGIN_DOMAIN of the admin-users Edge Function
};