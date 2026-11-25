import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { unitDivisor, trim } from "../../lib/calc.js";
import { GST_SLABS } from "../../config.js";
import { int } from "../../lib/format.js";
const unitName = (unit, uom) => unit === "PACK" ? (uom || "pack").toLowerCase() : "pc";
function PriceInput({ perPack, unit, pack, onChange, invalid, digits = 2 }) {
  const div = unitDivisor(unit, pack);
  const shown = perPack === "" || perPack === null || perPack === void 0 || Number.isNaN(Number(perPack)) ? "" : trim(Number(perPack) / div);
  const [txt, setTxt] = useState(null);
  return /* @__PURE__ */ jsx("input", {
    className: `input input-sm ${invalid ? "invalid" : ""}`,
    type: "number",
    min: "0",
    step: "0.01",
    inputMode: "decimal",
    style: { width: 96 },
    value: txt ?? shown,
    placeholder: "0.00",
    onFocus: () => setTxt(shown),
    onBlur: () => setTxt(null),
    onChange: (e) => {
      const v = e.target.value;
      setTxt(v);
      onChange(v === "" ? "" : Math.round(Number(v) * div * 10 ** (digits + 2)) / 10 ** (digits + 2));
    }
  });
}
function QtyInput({ value, unit, packSize, uom, onChange, invalid }) {
  const multi = Number(packSize) > 1;
  const pcs = unit === "PACK" ? (Number(value) || 0) * packSize : Number(value) || 0;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "input-group", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: `input input-sm ${invalid ? "invalid" : ""}`,
          type: "number",
          min: "0",
          step: "1",
          inputMode: "numeric",
          value: value ?? "",
          placeholder: "0",
          onChange: (e) => onChange({ qtyInput: e.target.value }),
          style: { minWidth: 64 }
        }
      ),
      multi && /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "seg",
          style: { height: 32 },
          title: "Click to switch between loose pieces and packs",
          onClick: () => {
            const n = Number(value) || 0;
            if (unit === "PACK") onChange({ unit: "PCS", qtyInput: n ? String(n * packSize) : "" });
            else onChange({ unit: "PACK", qtyInput: n && n % packSize === 0 ? String(n / packSize) : "" });
          },
          children: [
            unit === "PACK" ? uom || "Pack" : "Pcs",
            " \u21C4"
          ]
        }
      )
    ] }),
    multi && unit === "PACK" && value !== "" && /* @__PURE__ */ jsxs("div", { className: "line-note", children: [
      "= ",
      int(pcs),
      " pcs"
    ] })
  ] });
}
const qtyPcs = (l, pack) => {
  const q = Number(l.qtyInput);
  if (!q || q < 0) return 0;
  return Math.round(l.unit === "PACK" ? q * (pack || 1) : q);
};
function GstSelect({ value, onChange, invalid }) {
  const opts = GST_SLABS.includes(Number(value)) || value === "" || value === null || value === void 0 ? GST_SLABS : [...GST_SLABS, Number(value)].sort((a, b) => a - b);
  return /* @__PURE__ */ jsxs("select", { className: `select input-sm ${invalid ? "invalid" : ""}`, value: value ?? "", onChange: (e) => onChange(e.target.value === "" ? "" : Number(e.target.value)), style: { minWidth: 72 }, children: [
    /* @__PURE__ */ jsx("option", { value: "", children: "\u2014" }),
    opts.map((g) => /* @__PURE__ */ jsxs("option", { value: g, children: [
      g,
      "%"
    ] }, g))
  ] });
}
const NumInput = ({ value, onChange, min = 0, step = "0.01", invalid, width = 92 }) => /* @__PURE__ */ jsx("input", { className: `input input-sm ${invalid ? "invalid" : ""}`, type: "number", min, step, inputMode: "decimal", value: value ?? "", onChange: (e) => onChange(e.target.value), style: { minWidth: width } });
const RemoveBtn = ({ onClick }) => /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-sm btn-icon btn-ghost", onClick, "aria-label": "Remove line", title: "Remove line", style: { color: "var(--danger)" }, children: "\u2715" });
export {
  PriceInput,
  unitName,
  GstSelect,
  NumInput,
  QtyInput,
  RemoveBtn,
  qtyPcs
};
