// Reports page: CSV reports (with line items) and a ZIP of all completed document PDFs for a date range.
// Switch the whole page on/off in  js/features.js  ->  FEATURES.REPORTS
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { FEATURES } from "../features.js";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";
import { PageHeader, Alert } from "../components/ui/Bits.js";
import { errText } from "../lib/api.js";
import { loadBundles, loadCompany, loadDocsInRange } from "../lib/docData.js";
import { pdfBytes, fileName } from "../lib/pdfDoc.js";
import { lineView, trim } from "../lib/calc.js";
import { csvText, saveBlob } from "../lib/download.js";
import { fmtDateTime } from "../lib/format.js";
const REPORTS = [
  { type: "INWARD", label: "Inward (GRN) — with line items", perm: "inward.view", file: "Inward", party: "Vendor" },
  { type: "OUTWARD", label: "Outward — with line items", perm: "outward.view", file: "Outward", party: "Customer" },
  { type: "VENDOR_RETURN", label: "Returns to vendor — with line items", perm: "vreturn.view", file: "VendorReturns", party: "Vendor" },
  { type: "CUSTOMER_RETURN", label: "Returns from customer — with line items", perm: "creturn.view", file: "CustomerReturns", party: "Customer" }
];
const PDF_KINDS = [
  { key: "INWARD", label: "Inward — GRN", types: ["INWARD"], perm: "inward.view" },
  { key: "INVOICE", label: "Outward — Invoices", types: ["OUTWARD"], perm: "outward.view" },
  ...FEATURES.DELIVERY_CHALLAN ? [{ key: "DC", label: "Outward — Delivery Challans", types: ["OUTWARD"], perm: "outward.view" }] : [],
  { key: "VENDOR_RETURN", label: "Returns to vendor — Debit notes", types: ["VENDOR_RETURN"], perm: "vreturn.view" },
  { key: "CUSTOMER_RETURN", label: "Returns from customer — Credit notes", types: ["CUSTOMER_RETURN"], perm: "creturn.view" }
];
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const num = (n) => n === null || n === void 0 || n === "" ? "" : Number(trim(n));
function fyRange() {
  const n = /* @__PURE__ */ new Date();
  const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
  return [`${y}-04-01`, iso(n)];
}
function buildCsv(report, bundles) {
  const isVendor = report.party === "Vendor";
  const sale = report.type === "OUTWARD" || report.type === "CUSTOMER_RETURN";
  const headers = [
    "Document No", "Document Date", "Status", `${report.party} Code`, `${report.party} Name`, `${report.party} GSTIN`,
    ...isVendor ? [] : ["Location"],
    "Reference", "Against Document", "Reason", "Notes", "Line No", "Item Code", "Item Description", "HSN", "Rack", "Customer Code",
    "Entered As", "Qty (as entered)", "Qty (pcs)", "Pack Size", "MRP (per entered unit)", `${sale ? "Rate" : "Cost"} (per entered unit)`, `${sale ? "Rate" : "Cost"} (per pack)`,
    "Discount %", "GST %", "Taxable", "GST Amount", "Line Total", "Document Taxable", "Document GST", "Document Total", "Entered By", "Posted By", "Posted At"
  ];
  const rows = [];
  for (const { doc, lines, sourceDoc } of bundles) {
    const party = isVendor ? doc.vendors : doc.customers;
    const loc = doc.customer_locations;
    for (const l of lines) {
      const v = lineView(l, l.products.uom);
      rows.push([
        doc.doc_no, doc.doc_date, doc.status, party?.code, party?.name, (!isVendor && loc?.gstin) || party?.gstin,
        ...isVendor ? [] : [loc?.name],
        doc.reference_no, sourceDoc?.doc_no, doc.reason, doc.notes, l.line_no, l.products.code, l.products.description, l.products.hsn, l.racks?.code, l.customer_code,
        v.unit === "PACK" ? "Pack / set" : "Loose pieces", num(v.qty), l.qty, l.pack_size, num(v.mrp), num(v.rate), num(l.rate),
        Number(l.discount_pct) || 0, Number(sale ? l.sale_gst_pct ?? l.gst_pct : l.gst_pct), l.taxable, l.gst_amount, l.line_total, doc.sub_total, doc.gst_total, doc.grand_total,
        doc.created_by_name, doc.posted_by_name, doc.posted_at ? fmtDateTime(doc.posted_at) : ""
      ]);
    }
  }
  return csvText(headers, rows);
}
function Reports() {
  const { can, isAdmin } = useAuth();
  const toast = useToast();
  const [from0, to0] = [iso(new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1)), iso(/* @__PURE__ */ new Date())];
  const [fromD, setFromD] = useState(from0);
  const [toD, setToD] = useState(to0);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(null);
  const [picked, setPicked] = useState(() => Object.fromEntries(PDF_KINDS.map((k) => [k.key, true])));
  const [withMarked, setWithMarked] = useState(true);
  const cancel = useRef(false);
  const ok = (perm) => isAdmin || can(perm);
  const badRange = !fromD || !toD || fromD > toD;
  const range = (a, b) => {
    setFromD(a);
    setToD(b);
  };
  const csvFor = async (report) => {
    const docs = await loadDocsInRange(fromD, toD, [report.type]);
    const bundles = await loadBundles(docs, { returns: false });
    return { text: buildCsv(report, bundles), count: docs.length };
  };
  const name = (r) => `IMS_${r.file}_${fromD}_to_${toD}.csv`;
  const oneCsv = async (report) => {
    setBusy(report.type);
    try {
      const { text, count } = await csvFor(report);
      if (!count) toast.info("Nothing in this period", "No completed documents were found for these dates.");
      else {
        saveBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), name(report));
        toast.success("Report downloaded", `${count} document(s)`);
      }
    } catch (e) {
      toast.error("Could not create the report", errText(e));
    } finally {
      setBusy("");
    }
  };
  const allCsv = async () => {
    setBusy("ALLCSV");
    try {
      const { zipSync, strToU8 } = await import("../../vendor/pdf.js");
      const files = {};
      let total = 0;
      for (const r of REPORTS.filter((x) => ok(x.perm))) {
        const { text, count } = await csvFor(r);
        total += count;
        files[name(r)] = strToU8(text);
      }
      if (!total) toast.info("Nothing in this period", "No completed documents were found for these dates.");
      else {
        saveBlob(new Blob([zipSync(files, { level: 6 })], { type: "application/zip" }), `IMS_All_Reports_${fromD}_to_${toD}.zip`);
        toast.success("All reports downloaded");
      }
    } catch (e) {
      toast.error("Could not create the reports", errText(e));
    } finally {
      setBusy("");
    }
  };
  const pdfZip = async () => {
    const kinds = PDF_KINDS.filter((k) => picked[k.key] && ok(k.perm));
    if (!kinds.length) return toast.info("Choose at least one document type");
    cancel.current = false;
    setBusy("PDFZIP");
    try {
      const types = [...new Set(kinds.flatMap((k) => k.types))];
      setProgress({ done: 0, total: 0, text: "Finding documents…" });
      const docs = await loadDocsInRange(fromD, toD, types);
      if (!docs.length) {
        toast.info("Nothing in this period", "No completed documents were found for these dates.");
        return;
      }
      const company = await loadCompany();
      const bundles = await loadBundles(docs);
      const { zipSync } = await import("../../vendor/pdf.js");
      const jobs = [];
      for (const b of bundles) {
        for (const k of kinds) {
          if (!k.types.includes(b.doc.doc_type)) continue;
          const variant = k.key === "DC" ? "DC" : "STANDARD";
          jobs.push({ b, variant, marked: false });
          if (withMarked && FEATURES.RETURN_MARKED_PDF && b.returns) jobs.push({ b, variant, marked: true });
        }
      }
      const files = {};
      for (let i = 0; i < jobs.length; i++) {
        if (cancel.current) throw new Error("Cancelled");
        const { b, variant, marked } = jobs[i];
        setProgress({ done: i, total: jobs.length, text: `${b.doc.doc_no} (${i + 1} of ${jobs.length})` });
        files[`${b.doc.doc_date}/${fileName(b.doc, variant, marked)}`] = await pdfBytes(b, company, { variant, marked });
        await new Promise((r) => setTimeout(r, 0));
      }
      setProgress({ done: jobs.length, total: jobs.length, text: "Packing the ZIP…" });
      await new Promise((r) => setTimeout(r, 30));
      saveBlob(new Blob([zipSync(files, { level: 0 })], { type: "application/zip" }), `IMS_Documents_${fromD}_to_${toD}.zip`);
      toast.success("ZIP downloaded", `${jobs.length} PDF file(s) in date-wise folders`);
    } catch (e) {
      if (e.message === "Cancelled") toast.info("Cancelled");
      else toast.error("Could not create the ZIP", errText(e));
    } finally {
      setBusy("");
      setProgress(null);
    }
  };
  const allowedReports = REPORTS.filter((r) => ok(r.perm));
  if (!allowedReports.length) return /* @__PURE__ */ jsx(Alert, { tone: "warn", children: "You do not have access to any report." });
  const pct = progress && progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Reports & Downloads", subtitle: "Completed documents only (drafts are never included). Choose a date range, then download." }),
    /* @__PURE__ */ jsxs("div", { className: "card card-pad", style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "row", style: { gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsx("b", { children: "Date range" }),
        /* @__PURE__ */ jsx("span", { className: "muted", children: "From" }),
        /* @__PURE__ */ jsx("input", { type: "date", className: "input", style: { width: "auto" }, value: fromD, max: toD || void 0, onChange: (e) => setFromD(e.target.value) }),
        /* @__PURE__ */ jsx("span", { className: "muted", children: "To" }),
        /* @__PURE__ */ jsx("input", { type: "date", className: "input", style: { width: "auto" }, value: toD, min: fromD || void 0, onChange: (e) => setToD(e.target.value) }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => range(iso(/* @__PURE__ */ new Date()), iso(/* @__PURE__ */ new Date())), children: "Today" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => range(from0, to0), children: "This month" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => {
          const n = /* @__PURE__ */ new Date();
          range(iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), iso(new Date(n.getFullYear(), n.getMonth(), 0)));
        }, children: "Last month" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => range(...fyRange()), children: "This financial year" })
      ] }),
      badRange && /* @__PURE__ */ jsx("div", { style: { marginTop: 10 }, children: /* @__PURE__ */ jsx(Alert, { tone: "warn", children: "Please choose a valid From and To date (From cannot be after To)." }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card card-pad", style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsx("h3", { style: { marginBottom: 4 }, children: "Data reports (CSV — opens in Excel)" }),
      /* @__PURE__ */ jsx("p", { className: "muted", style: { marginBottom: 12 }, children: "One row per line item: item, quantity (as entered and in pieces), MRP, rate / cost, GST, taxable, totals, who entered and posted." }),
      /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 8 }, children: [
        allowedReports.map((r) => /* @__PURE__ */ jsxs("div", { className: "row", style: { justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(FileSpreadsheet, { size: 16, style: { verticalAlign: "-3px", marginRight: 6 } }), r.label] }),
          /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", disabled: badRange || !!busy, onClick: () => oneCsv(r), children: [/* @__PURE__ */ jsx(Download, {}), busy === r.type ? " Preparing…" : " Download CSV"] })
        ] }, r.type)),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", disabled: badRange || !!busy, onClick: allCsv, children: [/* @__PURE__ */ jsx(Download, {}), busy === "ALLCSV" ? " Preparing…" : " Download all reports (ZIP)"] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card card-pad", children: [
      /* @__PURE__ */ jsx("h3", { style: { marginBottom: 4 }, children: "All document PDFs (ZIP)" }),
      /* @__PURE__ */ jsx("p", { className: "muted", style: { marginBottom: 12 }, children: "Saved in date-wise folders, each file named with its document number, e.g. 2026-11-13 / OUT-2026-27-00007_Invoice.pdf" }),
      /* @__PURE__ */ jsx("div", { className: "stack", style: { gap: 6, marginBottom: 12 }, children: PDF_KINDS.filter((k) => ok(k.perm)).map((k) => /* @__PURE__ */ jsxs("label", { className: "row", style: { gap: 8, alignItems: "center", cursor: "pointer" }, children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: !!picked[k.key], onChange: (e) => setPicked({ ...picked, [k.key]: e.target.checked }) }),
        k.label
      ] }, k.key)) }),
      FEATURES.RETURN_MARKED_PDF && /* @__PURE__ */ jsxs("label", { className: "row", style: { gap: 8, alignItems: "center", cursor: "pointer", marginBottom: 12 }, children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: withMarked, onChange: (e) => setWithMarked(e.target.checked) }),
        "Also include the “after returns” version where returns exist"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "row", style: { gap: 10, alignItems: "center", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", disabled: badRange || !!busy, onClick: pdfZip, children: [/* @__PURE__ */ jsx(Download, {}), busy === "PDFZIP" ? " Working…" : " Download PDFs (ZIP)"] }),
        busy === "PDFZIP" && /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => {
          cancel.current = true;
        }, children: "Cancel" })
      ] }),
      progress && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsx("div", { style: { height: 8, background: "var(--line, #e4e6ea)", borderRadius: 6, overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: { width: `${pct}%`, height: "100%", background: "var(--red, #a50f2a)", transition: "width .2s" } }) }),
        /* @__PURE__ */ jsx("div", { className: "muted", style: { marginTop: 6, fontSize: 12 }, children: progress.text })
      ] })
    ] })
  ] });
}
export {
  Reports as default
};
