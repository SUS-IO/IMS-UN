// Profit & Loss: posted outwards less customer returns, at the actual cost of the stock lots sold.
// All values exclude GST. Switch the page on/off in  js/features.js -> FEATURES.PROFIT_LOSS
// Who can open it / download it is set in Admin > Users & Access ("Profit & Loss").
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, IndianRupee, Layers, CheckCircle2, Users, PackageMinus, Package } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { fetchAll } from "../lib/api.js";
import { useAsync } from "../hooks/useAsync.js";
import DataTable from "../components/ui/DataTable.js";
import { Badge, PageHeader, Alert, StatCard, Tabs } from "../components/ui/Bits.js";
import { money, int, fmtDate } from "../lib/format.js";
import { DOC_TYPES } from "../lib/docTypes.js";

const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const pctOf = (profit, revenue) => (revenue > 0 ? (profit / revenue) * 100 : null);
const pctText = (v) => (v === null || v === void 0 ? "—" : `${v.toFixed(1)}%`);
const tone = (v) => (v < 0 ? "var(--danger)" : "var(--ok)");

function group(rows, keyFn, make) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    const g = m.get(k) || { ...make(r), qty: 0, revenue: 0, cost: 0, profit: 0, sales: new Set() };
    g.qty += r.qty;
    g.revenue += Number(r.revenue);
    g.cost += Number(r.cost);
    g.profit += Number(r.profit);
    g.sales.add(r.doc_id);
    m.set(k, g);
  }
  return [...m.entries()].map(([k, g]) => ({ id: k, ...g, revenue: r2(g.revenue), cost: r2(g.cost), profit: r2(g.profit), margin: pctOf(g.profit, g.revenue), n: g.sales.size }));
}

function ProfitLoss() {
  const [fromD, setFromD] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toD, setToD] = useState(() => iso(new Date()));
  const [tab, setTab] = useState("sale");
  const badRange = !fromD || !toD || fromD > toD;
  const { data, loading, error, reload } = useAsync(() => {
    if (badRange) return Promise.resolve([]);
    return fetchAll(() => supabase.from("v_pnl_lines").select("*").gte("doc_date", fromD).lte("doc_date", toD).order("doc_date", { ascending: false }), { cap: 5e4, tie: "line_id" });
  }, [fromD, toD], { initial: [] });

  const T = useMemo(() => {
    const revenue = r2(data.reduce((a, r) => a + Number(r.revenue), 0));
    const cost = r2(data.reduce((a, r) => a + Number(r.cost), 0));
    const profit = r2(revenue - cost);
    return { revenue, cost, profit, margin: pctOf(profit, revenue) };
  }, [data]);
  const bySale = useMemo(() => group(data, (r) => r.doc_id, (r) => ({ doc_id: r.doc_id, doc_no: r.doc_no, doc_date: r.doc_date, doc_type: r.doc_type, customer_name: r.customer_name })), [data]);
  const byProduct = useMemo(() => group(data, (r) => r.product_id, (r) => ({ product_code: r.product_code, product_description: r.product_description, brand: r.brand, category: r.category })), [data]);
  const byCustomer = useMemo(() => group(data, (r) => r.customer_id, (r) => ({ customer_name: r.customer_name, customer_code: r.customer_code })), [data]);
  const lines = useMemo(() => data.map((r) => ({ ...r, id: r.line_id, margin: pctOf(Number(r.profit), Number(r.revenue)) })), [data]);

  const quick = (a, b) => { setFromD(a); setToD(b); };
  const now = new Date();
  const money$ = (key, header, extra = {}) => ({ key, header, align: "right", render: (r) => money(r[key]), ...extra });
  const profitCol = { key: "profit", header: "Profit", align: "right", render: (r) => /* @__PURE__ */ jsx("b", { style: { color: tone(r.profit) }, children: money(r.profit) }) };
  const marginCol = { key: "margin", header: "Margin %", align: "right", render: (r) => /* @__PURE__ */ jsx("span", { style: { color: r.margin !== null && r.margin < 0 ? "var(--danger)" : void 0 }, children: pctText(r.margin) }) };
  const nums = [money$("revenue", "Sales (excl. GST)"), money$("cost", "Cost"), profitCol, marginCol];
  const docLink = (r) => /* @__PURE__ */ jsx(Link, { to: `/${Object.values(DOC_TYPES).find((d) => d.type === r.doc_type)?.path}/${r.doc_id}`, children: r.doc_no });
  const typeBadge = (r) => /* @__PURE__ */ jsx(Badge, { tone: r.doc_type === "OUTWARD" ? "brand" : "info", children: r.doc_type === "OUTWARD" ? "Sale" : "Customer return" });
  const pcs = { key: "qty", header: "Qty (pcs)", align: "right", render: (r) => int(r.qty) };

  const colsSale = [
    { key: "doc_date", header: "Date", render: (r) => fmtDate(r.doc_date) },
    { key: "doc_no", header: "Document", render: docLink },
    { key: "doc_type", header: "Type", render: typeBadge, value: (r) => (r.doc_type === "OUTWARD" ? "Sale" : "Customer return") },
    { key: "customer_name", header: "Customer" },
    pcs, ...nums
  ];
  const colsProduct = [
    { key: "product_code", header: "Item", render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", { className: "code-cell", children: r.product_code }), /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.product_description })] }) },
    { key: "brand", header: "Brand" }, { key: "category", header: "Category" },
    { key: "n", header: "No. of sales", align: "right" }, pcs, ...nums
  ];
  const colsCustomer = [
    { key: "customer_name", header: "Customer", render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [r.customer_name, /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.customer_code })] }) },
    { key: "n", header: "No. of sales", align: "right" }, pcs, ...nums
  ];
  const colsLine = [
    { key: "doc_date", header: "Date", render: (r) => fmtDate(r.doc_date) },
    { key: "doc_no", header: "Document", render: docLink },
    { key: "customer_name", header: "Customer" },
    { key: "product_code", header: "Item", render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", { className: "code-cell", children: r.product_code }), /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.product_description })] }) },
    pcs,
    { key: "discount_pct", header: "Disc %", align: "right", render: (r) => (Number(r.discount_pct) ? `${Number(r.discount_pct)}%` : "—") },
    ...nums
  ];
  const footer = (rows) => {
    const rev = r2(rows.reduce((a, r) => a + Number(r.revenue), 0));
    const cst = r2(rows.reduce((a, r) => a + Number(r.cost), 0));
    const pr = r2(rev - cst);
    return /* @__PURE__ */ jsxs("div", { className: "row", style: { justifyContent: "flex-end", gap: 24, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("span", { children: ["Sales ", money(rev)] }),
      /* @__PURE__ */ jsxs("span", { children: ["Cost ", money(cst)] }),
      /* @__PURE__ */ jsxs("b", { style: { color: tone(pr) }, children: ["Profit ", money(pr), rev > 0 ? ` (${pctText(pctOf(pr, rev))})` : ""] })
    ] });
  };
  const common = (name, rows, columns, sortKey, extra = {}) => ({ rows, columns, loading, exportName: name, exportPerm: "pnl.download", footer, defaultSort: { key: sortKey, dir: "desc" }, rowClass: (r) => (r.profit < 0 ? "row-danger" : ""), ...extra });

  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Profit & Loss", subtitle: "Posted sales less customer returns, at the actual cost of the stock sold. All figures exclude GST.", actions: /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => reload(true), children: [/* @__PURE__ */ jsx(RefreshCw, {}), " Refresh"] }) }),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    badRange && /* @__PURE__ */ jsx(Alert, { tone: "warn", children: "Please choose a valid From and To date (From cannot be after To)." }),
    /* @__PURE__ */ jsxs("div", { className: "card card-pad", style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "row", style: { gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsx("b", { children: "Date range" }),
        /* @__PURE__ */ jsx("span", { className: "muted", children: "From" }),
        /* @__PURE__ */ jsx("input", { type: "date", className: "input", style: { width: "auto" }, value: fromD, max: toD || void 0, onChange: (e) => setFromD(e.target.value) }),
        /* @__PURE__ */ jsx("span", { className: "muted", children: "To" }),
        /* @__PURE__ */ jsx("input", { type: "date", className: "input", style: { width: "auto" }, value: toD, min: fromD || void 0, onChange: (e) => setToD(e.target.value) }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => quick(iso(now), iso(now)), children: "Today" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => quick(iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)), children: "This month" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => quick(iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))), children: "Last month" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => quick(iso(new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)), iso(now)), children: "This financial year" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "stat-grid", children: [
      /* @__PURE__ */ jsx(StatCard, { icon: IndianRupee, label: "Net sales", value: money(T.revenue), sub: `${bySale.filter((s) => s.doc_type === "OUTWARD").length} sales, returns deducted` }),
      /* @__PURE__ */ jsx(StatCard, { icon: Layers, label: "Cost of goods sold", value: money(T.cost), sub: "At actual lot cost" }),
      /* @__PURE__ */ jsx(StatCard, { icon: PackageMinus, tone: T.profit < 0 ? "danger" : "ok", label: "Gross profit", value: money(T.profit), sub: T.profit < 0 ? "Loss in this period" : "Sales − cost" }),
      /* @__PURE__ */ jsx(StatCard, { icon: CheckCircle2, label: "Margin", value: pctText(T.margin), sub: "Profit ÷ net sales" })
    ] }),
    /* @__PURE__ */ jsx(Tabs, { value: tab, onChange: setTab, tabs: [
      { key: "sale", label: "By sale", icon: PackageMinus, count: bySale.length },
      { key: "product", label: "By product", icon: Package, count: byProduct.length },
      { key: "customer", label: "By customer", icon: Users, count: byCustomer.length },
      { key: "line", label: "Line detail", icon: IndianRupee, count: lines.length }
    ] }),
    tab === "sale" && /* @__PURE__ */ jsx(DataTable, { ...common("profit_loss_by_sale", bySale, colsSale, "doc_date"), emptyTitle: "No sales in this period" }),
    tab === "product" && /* @__PURE__ */ jsx(DataTable, { ...common("profit_loss_by_product", byProduct, colsProduct, "profit"), emptyTitle: "No sales in this period" }),
    tab === "customer" && /* @__PURE__ */ jsx(DataTable, { ...common("profit_loss_by_customer", byCustomer, colsCustomer, "profit"), emptyTitle: "No sales in this period" }),
    tab === "line" && /* @__PURE__ */ jsx(DataTable, { ...common("profit_loss_line_detail", lines, colsLine, "doc_date"), emptyTitle: "No sales in this period" })
  ] });
}
export { ProfitLoss as default };
