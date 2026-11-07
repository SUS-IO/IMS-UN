import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Boxes, Layers, MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useLiveStock } from "../../hooks/useLiveStock.js";
import { useAuth } from "../../context/AuthContext.js";
import DataTable from "../../components/ui/DataTable.js";
import Modal from "../../components/ui/Modal.js";
import { Badge, PageHeader, Tabs, Alert } from "../../components/ui/Bits.js";
import { money, int, ageTone, ageLabel, packText, fmtDate } from "../../lib/format.js";
const bucket = (d) => d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3;
const ageRow = (d) => d > 90 ? "row-danger" : d > 60 ? "row-warn" : "";
function buildVariants(lots) {
  const m = /* @__PURE__ */ new Map();
  for (const l of lots) {
    const k = `${l.product_id}|${l.mrp}|${l.gst_pct}`;
    let v = m.get(k);
    if (!v) {
      v = { id: k, product_id: l.product_id, code: l.product_code, description: l.product_description, brand: l.brand, uom: l.uom, pack_size: l.pack_size, mrp: Number(l.mrp), gst_pct: Number(l.gst_pct), qty: 0, lots: 0, oldest: 0, newest: 99999, racks: /* @__PURE__ */ new Set(), value: 0, hasCost: false, b: [0, 0, 0, 0] };
      m.set(k, v);
    }
    v.qty += l.qty_on_hand;
    v.lots += 1;
    v.oldest = Math.max(v.oldest, l.age_days);
    v.newest = Math.min(v.newest, l.age_days);
    v.racks.add(l.rack_code);
    v.b[bucket(l.age_days)] += l.qty_on_hand;
    if (l.cost !== null && l.cost !== void 0) {
      v.hasCost = true;
      v.value += l.qty_on_hand * Number(l.cost) / l.pack_size;
    }
  }
  return [...m.values()].map((v) => ({ ...v, racks: [...v.racks].sort().join(", ") }));
}
function Stock() {
  const { can } = useAuth();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState("product");
  const [detail, setDetail] = useState(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const [prods, lots] = await Promise.all([
      fetchAll(() => supabase.from("v_product_stock").select("*").order("code")),
      fetchAll(() => supabase.from("v_stock_lots").select("*").gt("qty_on_hand", 0).order("received_at"))
    ]);
    return { prods, lots };
  }, [], { initial: { prods: [], lots: [] } });
  useLiveStock(() => reload(true));
  const showCost = can("cost.view");
  const variants = useMemo(() => buildVariants(data.lots), [data.lots]);
  const lowCount = data.prods.filter((p) => p.is_active && p.is_low).length;
  const status = (p) => Number(p.total_qty) === 0 ? "out" : p.is_low ? "low" : "ok";
  const statusOpts = [{ value: "out", label: "Out of stock" }, { value: "low", label: "Low stock" }, { value: "ok", label: "In stock" }];
  const prodCols = [
    { key: "code", header: "Item code", render: (p) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: p.code }) },
    { key: "description", header: "Description", minWidth: 220, render: (p) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("b", { children: p.description }),
      /* @__PURE__ */ jsxs("span", { className: "sub-text", children: [
        p.brand,
        p.category ? ` \xB7 ${p.category}` : ""
      ] })
    ] }) },
    { key: "total_qty", header: "Stock (pcs)", align: "right", value: (p) => Number(p.total_qty), render: (p) => /* @__PURE__ */ jsx("b", { children: int(p.total_qty) }) },
    { key: "packs", header: "In packs", sortable: false, value: (p) => packText(p.total_qty, p.pack_size, p.uom), render: (p) => /* @__PURE__ */ jsx("span", { className: "muted", children: packText(p.total_qty, p.pack_size, p.uom) }) },
    { key: "min_stock", header: "Min level", align: "right", render: (p) => p.min_stock ? int(p.min_stock) : "\u2014" },
    { key: "status", header: "Status", value: (p) => status(p), render: (p) => {
      const s = status(p);
      return /* @__PURE__ */ jsx(Badge, { tone: s === "ok" ? "ok" : s === "low" ? "warn" : "danger", dot: true, children: s === "out" ? "Out of stock" : s === "low" ? "Low stock" : "In stock" });
    } },
    {
      key: "age",
      header: "Oldest stock",
      align: "right",
      value: (p) => p.oldest_received_at ? Math.floor((Date.now() - new Date(p.oldest_received_at)) / 864e5) : null,
      render: (p) => {
        if (!p.oldest_received_at) return "\u2014";
        const d = Math.floor((Date.now() - new Date(p.oldest_received_at)) / 864e5);
        return /* @__PURE__ */ jsx(Badge, { tone: ageTone(d), children: ageLabel(d) });
      }
    }
  ];
  const varCols = [
    { key: "code", header: "Item code", render: (v) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: v.code }) },
    { key: "description", header: "Description", minWidth: 200, render: (v) => /* @__PURE__ */ jsx("b", { children: v.description }) },
    { key: "mrp", header: "MRP", align: "right", render: (v) => money(v.mrp) },
    { key: "gst_pct", header: "GST", align: "right", render: (v) => `${v.gst_pct}%` },
    { key: "qty", header: "Qty (pcs)", align: "right", render: (v) => /* @__PURE__ */ jsx("b", { children: int(v.qty) }) },
    { key: "racks", header: "Racks", render: (v) => v.racks.split(", ").map((r) => /* @__PURE__ */ jsx("span", { className: "loc-chip", style: { marginRight: 4 }, children: r }, r)) },
    { key: "b0", header: "0\u201330 d", align: "right", value: (v) => v.b[0], render: (v) => v.b[0] ? /* @__PURE__ */ jsx(Badge, { tone: "ok", children: int(v.b[0]) }) : /* @__PURE__ */ jsx("span", { className: "muted", children: "\u2013" }) },
    { key: "b1", header: "31\u201360 d", align: "right", value: (v) => v.b[1], render: (v) => v.b[1] ? /* @__PURE__ */ jsx(Badge, { tone: "info", children: int(v.b[1]) }) : /* @__PURE__ */ jsx("span", { className: "muted", children: "\u2013" }) },
    { key: "b2", header: "61\u201390 d", align: "right", value: (v) => v.b[2], render: (v) => v.b[2] ? /* @__PURE__ */ jsx(Badge, { tone: "warn", children: int(v.b[2]) }) : /* @__PURE__ */ jsx("span", { className: "muted", children: "\u2013" }) },
    { key: "b3", header: "90+ d", align: "right", value: (v) => v.b[3], render: (v) => v.b[3] ? /* @__PURE__ */ jsx(Badge, { tone: "danger", children: int(v.b[3]) }) : /* @__PURE__ */ jsx("span", { className: "muted", children: "\u2013" }) },
    { key: "oldest", header: "Oldest", align: "right", render: (v) => /* @__PURE__ */ jsx(Badge, { tone: ageTone(v.oldest), children: ageLabel(v.oldest) }) },
    ...showCost ? [{ key: "value", header: "Stock value (cost)", align: "right", render: (v) => v.hasCost ? money(v.value) : "\u2014" }] : []
  ];
  const lotCols = [
    { key: "product_code", header: "Item code", render: (l) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: l.product_code }) },
    { key: "product_description", header: "Description", minWidth: 200 },
    { key: "mrp", header: "MRP", align: "right", render: (l) => money(l.mrp) },
    { key: "gst_pct", header: "GST", align: "right", render: (l) => `${Number(l.gst_pct)}%` },
    { key: "rack_code", header: "Rack", render: (l) => /* @__PURE__ */ jsx("span", { className: "loc-chip", children: l.rack_code }) },
    { key: "qty_on_hand", header: "On hand", align: "right", render: (l) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("b", { children: int(l.qty_on_hand) }),
      /* @__PURE__ */ jsxs("span", { className: "sub-text", children: [
        "of ",
        int(l.qty_in),
        " received"
      ] })
    ] }) },
    { key: "inward_doc_no", header: "Inward", render: (l) => /* @__PURE__ */ jsxs(Fragment, { children: [
      l.inward_doc_no,
      /* @__PURE__ */ jsx("span", { className: "sub-text", children: l.vendor_name })
    ] }) },
    { key: "received_at", header: "Received", render: (l) => fmtDate(l.received_at) },
    { key: "age_days", header: "Age", align: "right", render: (l) => /* @__PURE__ */ jsx(Badge, { tone: ageTone(l.age_days), children: ageLabel(l.age_days) }) },
    ...showCost ? [{ key: "cost", header: "Cost / pack", align: "right", render: (l) => money(l.cost) }] : []
  ];
  const det = detail && { prod: data.prods.find((p) => p.product_id === detail), vars: variants.filter((v) => v.product_id === detail), lots: data.lots.filter((l) => l.product_id === detail) };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: "Stock & Ageing",
        subtitle: "Live inventory. The same product with a different MRP or GST is kept as a separate line and aged separately.",
        actions: /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => reload(), children: [
          /* @__PURE__ */ jsx(RefreshCw, {}),
          " Refresh"
        ] })
      }
    ),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    lowCount > 0 && /* @__PURE__ */ jsx("div", { style: { marginBottom: 14 }, children: /* @__PURE__ */ jsxs(Alert, { tone: "warn", icon: AlertTriangle, children: [
      /* @__PURE__ */ jsxs("b", { children: [
        lowCount,
        " product",
        lowCount > 1 ? "s are" : " is",
        " at or below the minimum stock level."
      ] }),
      " They are highlighted below."
    ] }) }),
    /* @__PURE__ */ jsx(Tabs, { value: tab, onChange: setTab, tabs: [
      { key: "product", label: "By product", icon: Boxes, count: data.prods.length },
      { key: "variant", label: "By MRP & GST (ageing)", icon: Layers, count: variants.length },
      { key: "lot", label: "Lots & racks", icon: MapPin, count: data.lots.length }
    ] }),
    tab === "product" && /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: data.prods.filter((p) => p.is_active),
        rowKey: "product_id",
        columns: prodCols,
        loading,
        exportName: "stock_by_product",
        stickyFirst: true,
        defaultSort: sp.get("low") ? { key: "status", dir: "desc" } : { key: "code", dir: "asc" },
        filters: [{ key: "status", label: "All stock levels", options: statusOpts, match: (p, v) => status(p) === v }],
        rowClass: (p) => status(p) === "out" ? "row-danger" : status(p) === "low" ? "row-warn" : "",
        onRowClick: (p) => setDetail(p.product_id),
        searchPlaceholder: "Search code, description, brand\u2026",
        emptyTitle: "No products yet",
        emptyText: "Create products in Masters, then receive them on an Inward."
      },
      sp.get("low")
    ),
    tab === "variant" && /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: variants,
        columns: varCols,
        loading,
        exportName: "stock_ageing",
        stickyFirst: true,
        defaultSort: { key: "oldest", dir: "desc" },
        rowClass: (v) => ageRow(v.oldest),
        onRowClick: (v) => setDetail(v.product_id),
        filters: [{ key: "age", label: "All ages", options: [{ value: "30", label: "Older than 30 days" }, { value: "60", label: "Older than 60 days" }, { value: "90", label: "Older than 90 days" }], match: (v, x) => v.oldest > Number(x) }],
        emptyTitle: "No stock on hand",
        emptyText: "Post an Inward to add stock."
      }
    ),
    tab === "lot" && /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: data.lots,
        columns: lotCols,
        loading,
        exportName: "stock_lots",
        stickyFirst: true,
        defaultSort: { key: "age_days", dir: "desc" },
        rowClass: (l) => ageRow(l.age_days),
        filters: [{ key: "rack_code", label: "All racks", options: [...new Set(data.lots.map((l) => l.rack_code))].sort().map((r) => ({ value: r, label: r })) }],
        emptyTitle: "No stock on hand"
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!detail,
        onClose: () => setDetail(null),
        size: "xl",
        title: det?.prod ? `${det.prod.code} \u2014 ${det.prod.description}` : "Product",
        icon: Boxes,
        footer: /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => setDetail(null), children: "Close" }),
        children: det && /* @__PURE__ */ jsxs("div", { className: "stack", children: [
          /* @__PURE__ */ jsxs("div", { className: "row wrap", children: [
            /* @__PURE__ */ jsxs(Badge, { tone: "brand", children: [
              "Total ",
              int(det.prod?.total_qty),
              " pcs"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "muted", children: packText(det.prod?.total_qty, det.prod?.pack_size, det.prod?.uom) }),
            det.prod?.min_stock > 0 && /* @__PURE__ */ jsxs(Badge, { tone: det.prod.is_low ? "warn" : "", children: [
              "Min ",
              int(det.prod.min_stock)
            ] })
          ] }),
          /* @__PURE__ */ jsx("h4", { children: "MRP / GST breakdown" }),
          /* @__PURE__ */ jsx(DataTable, { rows: det.vars, columns: varCols.filter((c) => !["code", "description"].includes(c.key)), rowClass: (v) => ageRow(v.oldest), exportName: `${det.prod?.code}_variants` }),
          /* @__PURE__ */ jsx("h4", { children: "Lots & racks" }),
          /* @__PURE__ */ jsx(DataTable, { rows: det.lots, columns: lotCols.filter((c) => !["product_code", "product_description"].includes(c.key)), rowClass: (l) => ageRow(l.age_days) })
        ] })
      }
    )
  ] });
}
export {
  Stock as default
};
