import { jsx, jsxs } from "react/jsx-runtime";
import { PERMISSION_ROWS, PRESETS } from "../../lib/permissions.js";
function PermMatrix({ value, onChange }) {
  const set = new Set(value);
  const toggle = (k) => {
    const n = new Set(set);
    n.has(k) ? n.delete(k) : n.add(k);
    onChange([...n]);
  };
  const toggleRow = (row) => {
    const keys = row.items.map((i) => i[0]);
    const all = keys.every((k) => set.has(k));
    const n = new Set(set);
    keys.forEach((k) => all ? n.delete(k) : n.add(k));
    onChange([...n]);
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "preset-row", children: [
      /* @__PURE__ */ jsx("span", { className: "muted", style: { alignSelf: "center" }, children: "Quick presets:" }),
      PRESETS.map((p) => /* @__PURE__ */ jsx("button", { type: "button", className: "chip-btn", onClick: () => onChange(p.perms), children: p.name }, p.name))
    ] }),
    /* @__PURE__ */ jsx("div", { style: { overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }, children: /* @__PURE__ */ jsxs("table", { className: "perm-table", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { children: "Area" }),
        /* @__PURE__ */ jsx("th", { children: "Allowed actions" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: PERMISSION_ROWS.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("label", { className: "check", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: row.items.every((i) => set.has(i[0])), onChange: () => toggleRow(row) }),
          row.label
        ] }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "perm-cells", children: row.items.map(([k, l]) => /* @__PURE__ */ jsxs("label", { className: "check", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: set.has(k), onChange: () => toggle(k) }),
          l
        ] }, k)) }) })
      ] }, row.label)) })
    ] }) }),
    /* @__PURE__ */ jsx("p", { className: "muted", style: { marginTop: 8 }, children: "Tip: \u201CPost\u201D lets a user finalise an entry; \u201CReverse\u201D lets them undo a posted one. \u201CSee cost price\u201D hides/shows purchase cost everywhere." })
  ] });
}
export {
  PermMatrix as default
};
