import { supabase } from "./supabase.js";
const FRIENDLY_CONSTRAINTS = {
  products_code_uq: "A product with this code already exists.",
  customers_code_uq: "A customer with this code already exists.",
  vendors_code_uq: "A vendor with this code already exists.",
  racks_code_uq: "This rack / location code already exists.",
  customer_locations_name_uq: "This customer already has a location with that name.",
  customer_product_codes_customer_id_product_id_key: "This product is already mapped for this customer.",
  documents_vendor_invoice_uq: "This vendor invoice number is already entered.",
  profiles_user_code_key: "That User ID is already taken."
};
const PREFIXES = ["LOCKED", "LOCK_LOST", "NOT_ALLOWED", "STEP_BACK", "AUDIT_PROTECTED"];
class AppError extends Error {
  constructor(message, code = "ERROR", raw) {
    super(message);
    this.code = code;
    this.raw = raw;
  }
}
function toAppError(err) {
  if (err instanceof AppError) return err;
  const raw = err?.message || String(err || "Something went wrong");
  if (err?.code === "23505") {
    const hit = Object.keys(FRIENDLY_CONSTRAINTS).find((k) => raw.includes(k));
    return new AppError(hit ? FRIENDLY_CONSTRAINTS[hit] : "This record already exists (duplicate).", "DUPLICATE", err);
  }
  if (err?.code === "42501" || /permission denied|row-level security/i.test(raw)) {
    return new AppError("You do not have permission to do this.", "NOT_ALLOWED", err);
  }
  if (err?.code === "23503") return new AppError("This record is linked to other data and cannot be used like this.", "FK", err);
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
    return new AppError("Cannot reach the server. Check your internet connection.", "NETWORK", err);
  }
  for (const p of PREFIXES) {
    if (raw.startsWith(p + ":")) return new AppError(raw.slice(p.length + 1).trim(), p, err);
  }
  return new AppError(raw, "ERROR", err);
}
const errText = (e) => toAppError(e).message;
async function run(builder) {
  const { data, error } = await builder;
  if (error) throw toAppError(error);
  return data;
}
const rpc = (fn, args) => run(supabase.rpc(fn, args));
async function fetchAll(make, { cap = 2e4, tie = "id" } = {}) {
  const size = 1e3;
  let from = 0;
  const out = [];
  for (; ; ) {
    const data = await run((tie ? make().order(tie, { ascending: true }) : make()).range(from, from + size - 1));
    out.push(...data);
    if (data.length < size || out.length >= cap) break;
    from += size;
  }
  return out;
}
const DOC_LOCK_MSG = "LOCK_LOST";
export {
  AppError,
  DOC_LOCK_MSG,
  errText,
  fetchAll,
  rpc,
  run,
  toAppError
};
