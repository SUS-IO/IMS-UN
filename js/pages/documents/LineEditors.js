import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import SearchSelect from "../../components/ui/SearchSelect.js";
import { QtyInput, GstSelect, PriceInput, RemoveBtn, qtyPcs, unitName } from "./LineParts.js";
import { money, int, ageLabel } from "../../lib/format.js";
import { calcLine, trim } from "../../lib/calc.js";
const perOf = (v, unit, pack) => v === "" || v === null || v === void 0 ? null : Number(v) / (unit === "PCS" ? Math.max(Number(pack) || 1, 1) : 1);
const money4 = (n) => n === null ? "\u2014" : `\u20B9${Number(trim(n)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
function InwardLine({ line: l, idx, set, remove, ctx }) {
  const p = ctx.productsById[l.product_id];
  const c = calcLine({ kind: "cost", qty: qtyPcs(l, p?.pack_size), pack: p?.pack_size, rate: l.rate, gst: l.gst_pct });
  const costHigh = Number(l.rate) > Number(l.mrp) && l.mrp !== "";
  return /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsx("td", { "data-label": "#", className: "calc", children: idx + 1 }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Product", style: { minWidth: 240 }, children: [
      /* @__PURE__ */ jsx(
        SearchSelect,
        {
          value: l.product_id,
          options: ctx.productOptions,
          placeholder: "Search product\u2026",
          onChange: (v) => {
            const x = ctx.productsById[v];
            set(v ? { product_id: v, gst_pct: Number(x.default_gst), unit: x.pack_size > 1 ? "PACK" : "PCS", qtyInput: "" } : { product_id: "" });
          }
        }
      ),
      p && /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        p.uom,
        " = ",
        p.pack_size,
        " pcs \xB7 default GST ",
        Number(p.default_gst),
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "Rack", style: { minWidth: 110 }, children: /* @__PURE__ */ jsx(SearchSelect, { value: l.rack_id, options: ctx.rackOptions, placeholder: "Rack", onChange: (v) => set({ rack_id: v }) }) }),
    /* @__PURE__ */ jsx("td", { "data-label": "Quantity", style: { minWidth: 130 }, children: /* @__PURE__ */ jsx(QtyInput, { value: l.qtyInput, unit: l.unit, packSize: p?.pack_size, uom: p?.uom, onChange: set }) }),
    /* @__PURE__ */ jsxs("td", { "data-label": `MRP (per ${unitName(l.unit, p?.uom)})`, className: "num", children: [/* @__PURE__ */ jsx(PriceInput, { perPack: l.mrp, unit: l.unit, pack: p?.pack_size, digits: 2, onChange: (v) => set({ mrp: v }) }), p && /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["per ", unitName(l.unit, p.uom)] })] }),
    /* @__PURE__ */ jsxs("td", { "data-label": `Cost (per ${unitName(l.unit, p?.uom)}, excl. GST)`, className: "num", children: [
      /* @__PURE__ */ jsx(PriceInput, { perPack: l.rate, unit: l.unit, pack: p?.pack_size, digits: 4, onChange: (v) => set({ rate: v }), invalid: costHigh }),
      p && /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["per ", unitName(l.unit, p.uom)] }),
      costHigh && /* @__PURE__ */ jsx("div", { className: "line-note err", children: "Cost is above MRP" })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "Purchase GST", className: "num", children: /* @__PURE__ */ jsx(GstSelect, { value: l.gst_pct, onChange: (v) => set({ gst_pct: v }) }) }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Amount", className: "num calc", children: [
      money(c.total),
      /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        "GST ",
        money(c.gstAmount)
      ] })
    ] }),
    /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(RemoveBtn, { onClick: remove }) })
  ] });
}
function OutwardLine({ line: l, idx, set, remove, ctx }) {
  const p = ctx.productsById[l.product_id];
  const variants = l.product_id ? ctx.variantsOf(l.product_id) : [];
  const vKey = l.mrp !== "" && l.mrp !== void 0 && l.gst_pct !== "" ? `${Number(l.mrp)}|${Number(l.gst_pct)}` : "";
  const v = variants.find((x) => x.key === vKey);
  const qty = qtyPcs(l, p?.pack_size);
  const over = v && qty > v.qty;
  const rateHigh = Number(l.rate) > Number(l.mrp);
  const c = calcLine({ kind: "sale", qty, pack: p?.pack_size, rate: l.rate, disc: l.discount_pct, gst: l.sale_gst_pct, inclusive: ctx.inclusive });
  const code = ctx.custCode[l.product_id];
  const vOpts = variants.map((x) => ({ value: x.key, label: `MRP ${money4(perOf(x.mrp, l.unit, p?.pack_size))} per ${unitName(l.unit, p?.uom)} \xB7 GST ${x.gst_pct}%`, sub: `${int(x.qty)} pcs \xB7 Rack ${x.racks} \xB7 oldest ${ageLabel(x.oldest)}` }));
  return /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsx("td", { "data-label": "#", className: "calc", children: idx + 1 }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Product", style: { minWidth: ctx.showCost ? 185 : 230 }, children: [
      /* @__PURE__ */ jsx(
        SearchSelect,
        {
          value: l.product_id,
          options: ctx.stockProductOptions,
          placeholder: "Search product in stock\u2026",
          onChange: (pid) => {
            const x = ctx.productsById[pid];
            const vs = pid ? ctx.variantsOf(pid) : [];
            set(pid ? {
              product_id: pid,
              sale_gst_pct: Number(x.default_gst),
              unit: x.pack_size > 1 ? "PACK" : "PCS",
              qtyInput: "",
              discount_pct: 0,
              ...vs.length === 1 ? { mrp: vs[0].mrp, gst_pct: vs[0].gst_pct, rate: vs[0].mrp } : { mrp: "", gst_pct: "", rate: "" }
            } : { product_id: "", mrp: "", gst_pct: "", rate: "" });
          }
        }
      ),
      l.product_id && /* @__PURE__ */ jsx("div", { className: "line-note", children: code ? /* @__PURE__ */ jsxs(Fragment, { children: [
        "Customer code: ",
        /* @__PURE__ */ jsx("b", { style: { color: "var(--red)" }, children: code })
      ] }) : "No customer code mapped" })
    ] }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Stock (MRP & GST)", style: { minWidth: ctx.showCost ? 185 : 230 }, children: [
      /* @__PURE__ */ jsx(
        SearchSelect,
        {
          value: vKey,
          options: vOpts,
          placeholder: l.product_id ? "Select MRP / GST stock" : "\u2014",
          disabled: !l.product_id,
          clearable: false,
          onChange: (k) => {
            const x = variants.find((y) => y.key === k);
            if (x) set({ mrp: x.mrp, gst_pct: x.gst_pct, rate: x.mrp });
          }
        }
      ),
      v && /* @__PURE__ */ jsx("div", { className: `line-note ${over ? "err" : "ok"}`, children: over ? `Only ${int(v.qty)} pcs available` : `${int(v.qty)} pcs available \xB7 Rack ${v.racks}` })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "Quantity", style: { minWidth: 130 }, children: /* @__PURE__ */ jsx(QtyInput, { value: l.qtyInput, unit: l.unit, packSize: p?.pack_size, uom: p?.uom, onChange: set, invalid: over }) }),
    /* @__PURE__ */ jsxs("td", { "data-label": `Rate (per ${unitName(l.unit, p?.uom)})`, className: "num", children: [
      /* @__PURE__ */ jsx(PriceInput, { perPack: l.rate, unit: l.unit, pack: p?.pack_size, digits: 4, onChange: (x) => set({ rate: x }), invalid: rateHigh }),
      p && /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["per ", unitName(l.unit, p.uom)] }),
      rateHigh && /* @__PURE__ */ jsx("div", { className: "line-note err", children: "Above MRP" })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "Disc %", className: "num", children: /* @__PURE__ */ jsx("input", { className: "input input-sm", type: "number", min: "0", max: "100", step: "0.1", style: { width: 64 }, value: l.discount_pct ?? "", onChange: (e) => set({ discount_pct: e.target.value === "" ? "" : Number(e.target.value) }) }) }),
    ...ctx.showCost ? (() => {
      const oc = ctx.outCost[l.key];
      if (!oc || !(qty > 0)) return [/* @__PURE__ */ jsx("td", { "data-label": "Cost", className: "num calc", children: "\u2014" }, "c"), /* @__PURE__ */ jsx("td", { "data-label": "Margin", className: "num calc", children: "\u2014" }, "m")];
      const units = qty / (l.unit === "PCS" ? 1 : Math.max(Number(p?.pack_size) || 1, 1));
      const margin = Math.round((c.taxable - oc.cost + Number.EPSILON) * 100) / 100;
      const pct = c.taxable > 0 ? margin / c.taxable * 100 : null;
      const gross = calcLine({ kind: "sale", qty, pack: p?.pack_size, rate: l.rate, disc: 0, gst: l.sale_gst_pct, inclusive: ctx.inclusive }).taxable;
      const be = gross > 0 ? Math.max(0, (1 - oc.cost / gross) * 100) : null;
      const bad = margin < 0;
      return [
        /* @__PURE__ */ jsxs("td", { "data-label": "Cost (excl. GST)", className: "num calc", children: [
          units > 0 ? money4(oc.cost / units) : "\u2014",
          /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["per ", unitName(l.unit, p?.uom), " \xB7 value ", money(oc.cost)] }),
          oc.short && /* @__PURE__ */ jsx("div", { className: "line-note err", children: "Stock short \u2014 cost incomplete" })
        ] }, "c"),
        /* @__PURE__ */ jsxs("td", { "data-label": "Margin", className: "num calc", children: [
          /* @__PURE__ */ jsx("b", { style: { color: bad ? "var(--danger)" : "var(--ok)" }, children: pct === null ? "\u2014" : `${pct.toFixed(1)}%` }),
          /* @__PURE__ */ jsxs("div", { className: `line-note ${bad ? "err" : ""}`, children: [bad ? "Loss " : "", money(margin)] }),
          be !== null && /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["Break-even disc. ", be.toFixed(1), "%"] })
        ] }, "m")
      ];
    })() : [],
    /* @__PURE__ */ jsxs("td", { "data-label": "Sale GST (this entry only)", className: "num", children: [
      /* @__PURE__ */ jsx(GstSelect, { value: l.sale_gst_pct, onChange: (x) => set({ sale_gst_pct: x }) }),
      v && Number(l.sale_gst_pct) !== v.gst_pct && l.sale_gst_pct !== "" && /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        "Stock bought @ ",
        v.gst_pct,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Amount", className: "num calc", children: [
      money(c.total),
      /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        "GST ",
        money(c.gstAmount)
      ] })
    ] }),
    /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(RemoveBtn, { onClick: remove }) })
  ] });
}
function VendorReturnLine({ line: l, idx, set, remove, ctx }) {
  const lot = ctx.lotsById[l.lot_id];
  const qty = qtyPcs(l, lot?.pack_size);
  const over = lot && qty > lot.qty_on_hand;
  const c = lot && lot.cost !== null ? calcLine({ kind: "cost", qty, pack: lot.pack_size, rate: lot.cost, gst: lot.gst_pct }) : null;
  return /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsx("td", { "data-label": "#", className: "calc", children: idx + 1 }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Stock lot to return", style: { minWidth: 340 }, colSpan: 2, children: [
      /* @__PURE__ */ jsx(
        SearchSelect,
        {
          value: l.lot_id,
          options: ctx.lotOptions,
          placeholder: ctx.vendorChosen ? "Select the lot being returned\u2026" : "Choose a vendor first",
          disabled: !ctx.vendorChosen,
          onChange: (v) => {
            const x = ctx.lotsById[v];
            set({ lot_id: v, unit: x && x.pack_size > 1 ? "PACK" : "PCS", qtyInput: "" });
          }
        }
      ),
      lot && /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        "Rack ",
        lot.rack_code,
        " \xB7 received ",
        lot.inward_doc_no,
        " \xB7 ",
        int(lot.qty_on_hand),
        " pcs in stock"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Quantity", style: { minWidth: 130 }, children: [
      /* @__PURE__ */ jsx(QtyInput, { value: l.qtyInput, unit: l.unit, packSize: lot?.pack_size, uom: lot?.uom, onChange: set, invalid: over }),
      over && /* @__PURE__ */ jsxs("div", { className: "line-note err", children: [
        "Only ",
        int(lot.qty_on_hand),
        " pcs in this lot"
      ] })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "MRP", className: "num calc", children: lot ? money4(perOf(lot.mrp, l.unit, lot.pack_size)) : "\u2014" }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Cost", className: "num calc", children: [lot ? money4(perOf(lot.cost, l.unit, lot.pack_size)) : "\u2014", lot && /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["per ", unitName(l.unit, lot.uom)] })] }),
    /* @__PURE__ */ jsx("td", { "data-label": "GST", className: "num calc", children: lot ? `${Number(lot.gst_pct)}%` : "\u2014" }),
    /* @__PURE__ */ jsx("td", { "data-label": "Amount", className: "num calc", children: c ? money(c.total) : "\u2014" }),
    /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(RemoveBtn, { onClick: remove }) })
  ] });
}
function CustomerReturnLine({ line: l, idx, set, remove, ctx }) {
  const src = ctx.srcById[l.source_line_id];
  const pack = src?.pack_size;
  const qty = qtyPcs(l, pack);
  const over = src && qty > src.remaining_qty;
  const c = src ? calcLine({ kind: "sale", qty, pack, rate: src.rate, disc: src.discount_pct, gst: src.sale_gst_pct, inclusive: ctx.inclusive }) : null;
  return /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsx("td", { "data-label": "#", className: "calc", children: idx + 1 }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Returned from outward", style: { minWidth: 340 }, colSpan: 2, children: [
      /* @__PURE__ */ jsx(
        SearchSelect,
        {
          value: l.source_line_id,
          options: ctx.srcOptions,
          placeholder: ctx.customerChosen ? "Select the sold item being returned\u2026" : "Choose a customer first",
          disabled: !ctx.customerChosen,
          onChange: (v) => {
            const x = ctx.srcById[v];
            set({ source_line_id: v, unit: x && x.pack_size > 1 ? "PACK" : "PCS", qtyInput: "" });
          }
        }
      ),
      src && /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        "Sold ",
        int(src.qty),
        " pcs \xB7 already returned ",
        int(src.returned_qty),
        " \xB7 can return ",
        int(src.remaining_qty),
        src.customer_code ? ` \xB7 customer code ${src.customer_code}` : ""
      ] })
    ] }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Quantity", style: { minWidth: 130 }, children: [
      /* @__PURE__ */ jsx(QtyInput, { value: l.qtyInput, unit: l.unit, packSize: pack, uom: "Pack", onChange: set, invalid: over }),
      over && /* @__PURE__ */ jsxs("div", { className: "line-note err", children: [
        "Max ",
        int(src.remaining_qty),
        " pcs"
      ] })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "MRP", className: "num calc", children: src ? money4(perOf(src.mrp, l.unit, pack)) : "\u2014" }),
    /* @__PURE__ */ jsxs("td", { "data-label": "Rate", className: "num calc", children: [
      src ? money4(perOf(src.rate, l.unit, pack)) : "\u2014",
      src && /* @__PURE__ */ jsxs("div", { className: "line-note", children: ["per ", unitName(l.unit, "Pack")] }),
      src && Number(src.discount_pct) > 0 && /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
        "after ",
        Number(src.discount_pct),
        "% disc"
      ] })
    ] }),
    /* @__PURE__ */ jsx("td", { "data-label": "GST", className: "num calc", children: src ? `${Number(src.sale_gst_pct)}%` : "\u2014" }),
    /* @__PURE__ */ jsx("td", { "data-label": "Credit amount", className: "num calc", children: c ? money(c.total) : "\u2014" }),
    /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(RemoveBtn, { onClick: remove }) })
  ] });
}
const LINE_HEADS = {
  INWARD: ["#", "Product", "Rack", "Quantity", "MRP", "Cost", "GST", "Amount", ""],
  OUTWARD: ["#", "Product", "Stock (MRP & GST)", "Quantity", "Rate", "Disc %", "Sale GST", "Amount", ""],
  VENDOR_RETURN: ["#", "Stock lot to return", "", "Quantity", "MRP", "Cost", "GST", "Amount", ""],
  CUSTOMER_RETURN: ["#", "Returned from outward", "", "Quantity", "MRP", "Rate", "GST", "Credit", ""]
};
const LINE_COMPONENT = { INWARD: InwardLine, OUTWARD: OutwardLine, VENDOR_RETURN: VendorReturnLine, CUSTOMER_RETURN: CustomerReturnLine };
export {
  CustomerReturnLine,
  InwardLine,
  LINE_COMPONENT,
  LINE_HEADS,
  OutwardLine,
  VendorReturnLine
};
