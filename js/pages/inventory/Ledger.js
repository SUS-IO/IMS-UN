import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
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
  const iso = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
    return z.toISOString().slice(0, 10);
  };
  const [fromD, setFromD] = useState(() => iso(new Date(Date.now() - 30 * 864e5)));
  const [toD, setToD] = useState(() => iso(/* @__PURE__ */ new Date()));
  const badRange = !fromD || !toD || fromD > toD;
  const { data, loading, error, reload } = useAsync(() => {
    if (badRange) return Promise.resolve([]);
    const from = new Date(`${fromD}T00:00:00`).toISOString();
    const to = new Date(new Date(`${toD}T00:00:00`).getTime() + 864e5).toISOString();
    return fetchAll(() => supabase.from("v_movements").select("*").gte("created_at", from).lt("created_at", to).order("id", { ascending: false }), { cap: 5e4 });
  }, [fromD, toD], { initial: [] });
  const partyOptions = useMemo(
    () => [...new Set(data.map((r) => r.party_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [data]
  );
  const quick = (n) => {
    setFromD(iso(new Date(Date.now() - n * 864e5)));
    setToD(iso(/* @__PURE__ */ new Date()));
  };
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
    badRange && /* @__PURE__ */ jsx(Alert, { tone: "warn", children: "Please choose a valid From and To date (From cannot be after To)." }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: data,
        columns: cols,
        loading,
        exportName: "stock_ledger",
        defaultSort: { key: "created_at", dir: "desc" },
        rowClass: (r) => r.movement_type === "REVERSAL" ? "row-danger" : "",
        filters: [{ key: "movement_type", label: "All movements", options: Object.entries(LABEL).map(([value, label]) => ({ value, label })) }, { key: "party_name", label: "All parties (customer / vendor)", options: partyOptions }],
        toolbar: /* @__PURE__ */ jsxs("div", { className: "row", style: { gap: 6, flexWrap: "wrap", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { className: "muted", children: "From" }),
          /* @__PURE__ */ jsx("input", { type: "date", className: "input", style: { width: "auto", height: 32 }, value: fromD, max: toD || void 0, onChange: (e) => setFromD(e.target.value) }),
          /* @__PURE__ */ jsx("span", { className: "muted", children: "To" }),
          /* @__PURE__ */ jsx("input", { type: "date", className: "input", style: { width: "auto", height: 32 }, value: toD, min: fromD || void 0, onChange: (e) => setToD(e.target.value) }),
          [[0, "Today"], [7, "7 days"], [30, "30 days"], [365, "1 year"]].map(([n, l]) => /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-sm", onClick: () => quick(n), children: l }, n))
        ] }),
        emptyTitle: "No movements in this period"
      }
    )
  ] });
}
export {
  Ledger as default
};
