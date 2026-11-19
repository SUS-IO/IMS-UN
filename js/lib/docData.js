// Loads everything needed to draw a document PDF (single document or a whole date range).
import { supabase } from "./supabase.js";
import { fetchAll, run } from "./api.js";
const DOC_SELECT = "*, vendors(name,code,gstin,city,address_line1,address_line2), customers(name,code,gstin), customer_locations(name,address_line1,address_line2,city,state,pincode,gstin)";
const LINE_SELECT = "*, products(code,description,uom,hsn), racks(code)";
const chunk = (arr, n = 80) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
async function loadCompany() {
  return run(supabase.from("company_settings").select("*").eq("id", 1).single());
}
async function loadLinesFor(docIds) {
  const out = [];
  for (const ids of chunk(docIds)) {
    const rows = await fetchAll(() => supabase.from("document_lines").select(LINE_SELECT).in("document_id", ids).order("document_id").order("line_no"), { tie: "id" });
    out.push(...rows);
  }
  const by = {};
  for (const l of out) (by[l.document_id] ||= []).push(l);
  for (const k of Object.keys(by)) by[k].sort((a, b) => a.line_no - b.line_no);
  return by;
}
// Returns posted against inward / outward documents, summed per original line.
async function loadReturnsFor(docs, linesByDoc) {
  const ids = docs.filter((d) => d.doc_type === "INWARD" || d.doc_type === "OUTWARD").map((d) => d.id);
  const result = {};
  if (!ids.length) return result;
  const rets = [];
  for (const part of chunk(ids)) {
    rets.push(...await fetchAll(() => supabase.from("documents").select("id,doc_no,doc_date,doc_type,source_doc_id,status").in("source_doc_id", part).eq("status", "POSTED").order("id"), { tie: null }));
  }
  if (!rets.length) return result;
  const retLines = await loadLinesFor(rets.map((r) => r.id));
  const retById = Object.fromEntries(rets.map((r) => [r.id, r]));
  const lineOfLot = {};
  for (const d of docs) for (const l of linesByDoc[d.id] || []) if (l.lot_id) lineOfLot[l.lot_id] = l.id;
  for (const r of rets) {
    for (const rl of retLines[r.id] || []) {
      const originalLine = r.doc_type === "CUSTOMER_RETURN" ? rl.source_line_id : lineOfLot[rl.lot_id];
      if (!originalLine) continue;
      const bucket = result[r.source_doc_id] ||= { docs: {}, byLine: {} };
      bucket.docs[r.id] = retById[r.id];
      const b = bucket.byLine[originalLine] ||= { qty: 0, taxable: 0, gst: 0, total: 0 };
      b.qty += Number(rl.qty);
      b.taxable += Number(rl.taxable);
      b.gst += Number(rl.gst_amount);
      b.total += Number(rl.line_total);
    }
  }
  for (const k of Object.keys(result)) result[k].docs = Object.values(result[k].docs).sort((a, b) => String(a.doc_no).localeCompare(String(b.doc_no)));
  return result;
}
async function loadSourceDocs(docs) {
  const ids = [...new Set(docs.map((d) => d.source_doc_id).filter(Boolean))];
  const map = {};
  for (const part of chunk(ids)) {
    const rows = await fetchAll(() => supabase.from("documents").select("id,doc_no,doc_date").in("id", part).order("id"), { tie: null });
    for (const r of rows) map[r.id] = r;
  }
  return map;
}
// Bundles = [{ doc, lines, sourceDoc, returns }]
async function loadBundles(docs, { returns: withReturns = true } = {}) {
  const linesByDoc = await loadLinesFor(docs.map((d) => d.id));
  const [returns, sources] = await Promise.all([withReturns ? loadReturnsFor(docs, linesByDoc) : {}, loadSourceDocs(docs)]);
  return docs.map((d) => ({ doc: d, lines: linesByDoc[d.id] || [], sourceDoc: sources[d.source_doc_id] || null, returns: returns[d.id] || null }));
}
async function loadBundleById(id) {
  const doc = await run(supabase.from("documents").select(DOC_SELECT).eq("id", id).single());
  const [b] = await loadBundles([doc]);
  return b;
}
async function loadDocsInRange(from, to, types, statuses = ["POSTED", "REVERSED"]) {
  return fetchAll(() => supabase.from("documents").select(DOC_SELECT).in("doc_type", types).in("status", statuses).gte("doc_date", from).lte("doc_date", to).order("doc_date").order("doc_no"), { tie: "id", cap: 5e4 });
}
export {
  loadBundleById,
  loadBundles,
  loadCompany,
  loadDocsInRange
};
