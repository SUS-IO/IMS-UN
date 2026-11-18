import { jsx, jsxs } from "react/jsx-runtime";
import { GST_SLABS } from "../../config.js";
import { int } from "../../lib/format.js";
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
          onClick: () => onChange({ unit: unit === "PACK" ? "PCS" : "PACK" }),
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
  GstSelect,
  NumInput,
  QtyInput,
  RemoveBtn,
  qtyPcs
};
