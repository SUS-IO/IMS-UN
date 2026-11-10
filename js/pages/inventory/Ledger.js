import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useLiveStock } from "../../hooks/useLiveStock.js";
import DataTable from "../../components/ui/DataTable.js";
import { Badge, PageHeader, Alert } from "../../components/ui/Bits.js";
import { fmtDateTime, money } from "../../lib/format.js";
import { DOC_TYPES } from "../../lib/docTypes.js";
const TONE = { INWARD: "ok", OUTWARD: "brand", VENDOR_RETURN: "warn", CUSTOMER_RETURN: "info", REVERSAL: "danger" };
const LABEL = { INWARD: "Inward", OUTWARD: "Outward", VENDOR_RETURN: "Vendor return", CUSTOMER_RETURN: "Customer return", REVERSAL: "Reversal" };
function Ledger() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync(() => {
    const from = new Date(Date.now() - days * 864e5).toISOString();
    return fetchAll(() => supabase.from("v_movements").select("*").gte("created_at", from).order("id", { ascending: false }), { cap: 1e4 });
  }, [days], { initial: [] });
  useLiveStock(() => reload(true));
  const cols = [
    { key: "created_at", header: "Date & time", render: (r) => /* @__PURE__ */ jsx("span", { className: "nowrap", children: fmtDateTime(r.created_at) }) },
    { key: "movement_type", header: "Movement", render: (r) => /* @__PURE__ */ jsx(Badge, { tone: TONE[r.movement_type], children: LABEL[r.movement_type] }) },
    { key: "product_code", header: "Item", render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("span", { className: "code-cell", children: r.product_code }),
      /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.product_description })
    ] }) },
    { key: "qty_delta", header: "Qty", align: "right", render: (r) => /* @__PURE__ */ jsxs("b", { style: { color: r.qty_delta > 0 ? "var(--ok)" : "var(--danger)" }, children: [
      r.qty_delta > 0 ? "+" : "",
      r.qty_delta
    ] }) },
    { key: "mrp", header: "MRP", align: "right", render: (r) => money(r.mrp) },
    { key: "gst_pct", header: "GST", align: "right", render: (r) => `${Number(r.gst_pct)}%` },
    { key: "rack_code", header: "Rack", render: (r) => /* @__PURE__ */ jsx("span", { className: "loc-chip", children: r.rack_code }) },
    { key: "doc_no", header: "Document", render: (r) => /* @__PURE__ */ jsx(Link, { to: `/${Object.values(DOC_TYPES).find((d) => d.type === r.doc_type)?.path}/${r.doc_id}`, children: r.doc_no }) },
    { key: "party_name", header: "Party" },
    { key: "created_by_name", header: "Done by" }
  ];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Stock Ledger", subtitle: "Every stock movement ever made. Entries are permanent \u2014 mistakes appear as reversals.", actions: /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => reload(), children: [
      /* @__PURE__ */ jsx(RefreshCw, {}),
      " Refresh"
    ] }) }),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: data,
        columns: cols,
        loading,
        exportName: "stock_ledger",
        defaultSort: { key: "created_at", dir: "desc" },
        rowClass: (r) => r.movement_type === "REVERSAL" ? "row-danger" : "",
        filters: [{ key: "movement_type", label: "All movements", options: Object.entries(LABEL).map(([value, label]) => ({ value, label })) }],
        toolbar: /* @__PURE__ */ jsx("select", { className: "select", style: { width: "auto", height: 32 }, value: days, onChange: (e) => setDays(Number(e.target.value)), children: [[7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [365, "Last 12 months"]].map(([v, l]) => /* @__PURE__ */ jsx("option", { value: v, children: l }, v)) }),
        emptyTitle: "No movements in this period"
      }
    )
  ] });
}
export {
  Ledger as default
};
