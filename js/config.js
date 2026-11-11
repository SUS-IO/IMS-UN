const C = window.IMS_CONFIG || {};
const SUPABASE_URL = C.SUPABASE_URL;
const SUPABASE_KEY = C.SUPABASE_ANON_KEY;
const LOGIN_DOMAIN = (C.LOGIN_DOMAIN || "ims.local").toLowerCase();
const CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_KEY);
const APP_NAME = "IMS";
const GST_SLABS = [0, 5, 12, 18, 28];
const IMAGE_BUCKET = "product-images";
const SESSION_POLL_MS = 3e4;
const LOCK_BEAT_MS = 3e4;
export {
  APP_NAME,
  CONFIG_OK,
  GST_SLABS,
  IMAGE_BUCKET,
  LOCK_BEAT_MS,
  LOGIN_DOMAIN,
  SESSION_POLL_MS,
  SUPABASE_KEY,
  SUPABASE_URL
};
